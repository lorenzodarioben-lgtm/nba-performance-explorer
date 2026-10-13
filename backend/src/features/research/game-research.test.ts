import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import {
  GameResearchQuerySchema,
  GameResearchResponseSchema,
  type RawPlayerGame,
} from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { fixturePlayerProvider } from '../players/fixture-player-provider.js';
import { providerUnavailable } from '../players/provider-error.js';
import { analyzeResearchGames, rawGameSummary } from './game-research-service.js';
import { mapResearchGames, NbaGameResearchProvider } from './game-research-provider.js';

const game = (id: string, date: string, points = 20): RawPlayerGame => ({
  game: {
    id,
    date,
    team: { abbreviation: 'LAL' },
    opponent: { abbreviation: 'BOS' },
    location: 'home',
    result: 'W',
    minutes: 30,
    points,
    rebounds: 10,
    assists: 10,
  },
  raw: {
    fieldGoalsMade: 5,
    fieldGoalsAttempted: 10,
    threesMade: 2,
    threesAttempted: 5,
    freeThrowsMade: 8,
    freeThrowsAttempted: 10,
    steals: 2,
    blocks: 1,
    turnovers: 4,
  },
});
const query = (fields = {}) =>
  GameResearchQuerySchema.parse({ season: '2023-24', ...fields });
const headers = [
  'SEASON_ID',
  'Player_ID',
  'Game_ID',
  'GAME_DATE',
  'MATCHUP',
  'WL',
  'MIN',
  'PTS',
  'REB',
  'AST',
  'FGM',
  'FGA',
  'FG3M',
  'FG3A',
  'FTM',
  'FTA',
  'STL',
  'BLK',
  'TOV',
];
const row = (overrides = {}) =>
  headers.map(
    (key) =>
      ({
        SEASON_ID: '42023',
        Player_ID: 2544,
        Game_ID: '0042300001',
        GAME_DATE: 'APR 20, 2024',
        MATCHUP: 'LAL vs. BOS',
        WL: 'W',
        MIN: 30,
        PTS: 20,
        REB: 10,
        AST: 10,
        FGM: 5,
        FGA: 10,
        FG3M: 2,
        FG3A: 5,
        FTM: 8,
        FTA: 10,
        STL: 2,
        BLK: 1,
        TOV: 4,
        ...overrides,
      })[key as 'SEASON_ID'],
  );
const envelope = (rows: unknown[][]) => ({
  resultSets: [{ name: 'PlayerGameLog', headers, rowSet: rows }],
});
describe('raw game analysis integrity', () => {
  it('weights shooting by raw attempts rather than averaging game percentages', () => {
    const a = game('a', '2023-12-01'),
      b = game('b', '2023-12-02');
    a.raw = {
      ...a.raw,
      fieldGoalsMade: 1,
      fieldGoalsAttempted: 2,
      threesMade: 0,
      threesAttempted: 0,
    };
    b.raw = {
      ...b.raw,
      fieldGoalsMade: 9,
      fieldGoalsAttempted: 30,
      threesMade: 0,
      threesAttempted: 0,
    };
    const s = rawGameSummary([a, b], '2544', '2023-24');
    expect(s.metrics.fieldGoalPercentage).toBe(10 / 32);
    expect(s.metrics.fieldGoalPercentage).not.toBe(0.4);
    expect(s.metrics.trueShooting).toBeCloseTo(40 / (2 * (32 + 0.44 * 20)));
    expect(s.perGame).toMatchObject({ steals: 2, blocks: 1, turnovers: 4 });
  });
  it('propagates unknown counts and leaves empty/zero-attempt cohorts unavailable', () => {
    const a = game('a', '2023-12-01');
    a.raw.steals = null;
    a.raw.fieldGoalsAttempted = null;
    const s = rawGameSummary([a], '2544', '2023-24');
    expect(s.perGame.steals).toBeNull();
    expect(s.metrics.trueShooting).toBeNull();
    expect(
      rawGameSummary([], '2544', '2023-24').metrics.fieldGoalPercentage,
    ).toBeNull();
  });
  it('filters before rolling/splits, preserves tied evidence and keeps summary independent of pages', () => {
    const games = [
      game('a', '2023-12-01', 30),
      game('b', '2023-12-02', 10),
      game('c', '2023-12-03', 30),
    ];
    const result = analyzeResearchGames(
      games,
      '2544',
      query({ minPoints: '30', window: '2', pageSize: '1', page: '2', sort: 'steals' }),
    );
    expect(result.filteredGames).toBe(2);
    expect(result.summary.sample).toBe(2);
    expect(result.games).toHaveLength(1);
    expect(result.rolling.map((r) => r.summary.sample)).toEqual([1, 2]);
    expect(result.extrema[0]?.highGames.map((g) => g.id)).toEqual(['c', 'a']);
    expect(result.recent.perGame.points).toBe(30);
  });
  it('rejects duplicates, contradictory dates and invalid shooting counts', () => {
    const a = game('a', '2023-12-01');
    for (const games of [
      [a, a],
      [a, game('b', '2023-12-01')],
      [{ ...a, raw: { ...a.raw, fieldGoalsMade: 40 } }],
    ])
      expect(() => analyzeResearchGames(games, '2544', query())).toThrow();
  });
  it('strictly maps player, season and season type; preserves null raw fields', () => {
    expect(
      mapResearchGames(envelope([row({ STL: null })]), '2544', '2023-24', 'playoffs')[0]
        ?.raw.steals,
    ).toBeNull();
    for (const rows of [
      [row({ Player_ID: 1 })],
      [row({ SEASON_ID: '22023' })],
      [row({ SEASON_ID: '42022' })],
      [row({ FGA: 1 })],
      [row(), row()],
      [row({ GAME_DATE: 'FEB 30, 2024' })],
    ])
      expect(() =>
        mapResearchGames(envelope(rows), '2544', '2023-24', 'playoffs'),
      ).toThrow();
    expect(mapResearchGames(envelope([]), '2544', '2023-24', 'playoffs')).toEqual([]);
  });
  it('deduplicates scoped source calls with short TTL and does not retry/cache failures', async () => {
    let now = new Date('2026-10-13T19:00:00.000Z');
    const client = {
      fetchEndpoint: vi
        .fn()
        .mockRejectedValueOnce(providerUnavailable())
        .mockResolvedValue(envelope([row()])),
    };
    const provider = new NbaGameResearchProvider(client, () => now);
    await expect(provider.getGames('2544', '2023-24', 'playoffs')).rejects.toThrow();
    await Promise.all([
      provider.getGames('2544', '2023-24', 'playoffs'),
      provider.getGames('2544', '2023-24', 'playoffs'),
    ]);
    expect(client.fetchEndpoint).toHaveBeenCalledTimes(2);
    expect(client.fetchEndpoint).toHaveBeenLastCalledWith('playergamelog', {
      PlayerID: '2544',
      Season: '2023-24',
      SeasonType: 'Playoffs',
      LeagueID: '00',
    });
    now = new Date(now.getTime() + 5 * 60_000);
    await provider.getGames('2544', '2023-24', 'playoffs');
    expect(client.fetchEndpoint).toHaveBeenCalledTimes(3);
  });
  it('serves scoped DTOs; missing season summary does not discard usable games', async () => {
    const getGames = vi.fn().mockResolvedValue({
      games: [game('a', '2023-12-01')],
      retrievedAt: '2026-10-13T19:00:00.000Z',
    });
    const app = createApp(fixturePlayerProvider, {
      playerSource: 'fixture',
      gamesProvider: { getGames },
      totalsProvider: {
        getSeasonTotals: vi.fn().mockRejectedValue(providerUnavailable()),
      },
    });
    const response = await request(app).get(
      '/api/players/2544/game-research?season=2023-24&scope=playoffs',
    );
    expect(response.status).toBe(200);
    expect(GameResearchResponseSchema.safeParse(response.body).success).toBe(true);
    expect(getGames).toHaveBeenCalledWith('2544', '2023-24', 'playoffs');
    expect(response.body.provenance.scope).toBe('playoffs');
    expect(response.body.reportedSeasonGames).toBeNull();
    expect(response.body.provenance.warnings.join(' ')).toContain(
      'summary unavailable',
    );
    expect(response.body.provenance.warnings.join(' ')).toContain('DEMO FIXTURES');
  });
  it('rejects invalid direct queries before source calls and returns honest disabled state', async () => {
    const getGames = vi.fn();
    const app = createApp(fixturePlayerProvider, { gamesProvider: { getGames } });
    for (const query of [
      'season=2023-25',
      'season=2023-24&scope=all',
      'season=2023-24&minPoints=201',
      'season=2023-24&minAssists=-1',
      'season=2023-24&from=2024-05-01&to=2024-01-01',
      'season=2023-24&sort=abc',
      'season=2023-24&season=2022-23',
    ])
      expect(
        (await request(app).get(`/api/players/2544/game-research?${query}`)).status,
      ).toBe(400);
    expect(getGames).not.toHaveBeenCalled();
    const response = await request(createApp()).get(
      '/api/players/2544/game-research?season=2023-24',
    );
    expect(response.body.status).toBe('unsupported');
    expect(response.body.observedGames).toBe(0);
    expect((await request(app).post('/api/players/2544/game-research')).status).toBe(
      405,
    );
  });
  it('separates regular and playoffs season totals and never substitutes zero for absent playoffs', async () => {
    const totals = rawGameSummary([game('a', '2023-12-01')], '2544', '2023-24').totals;
    const getSeasonTotals = vi.fn(async (_id, _season, scope) => ({
      totals: scope === 'playoffs' ? null : totals,
      retrievedAt: '2026-10-13T19:00:00.000Z',
    }));
    const response = await request(
      createApp(fixturePlayerProvider, { totalsProvider: { getSeasonTotals } }),
    ).get('/api/players/2544/season-scopes?season=2023-24');
    expect(response.status).toBe(200);
    expect(response.body.rows.map((r: { status: string }) => r.status)).toEqual([
      'available',
      'season-unavailable',
    ]);
    expect(response.body.rows[1].totals).toBeNull();
    expect(response.body.rows[1].provenance.scope).toBe('playoffs');
  });
});
