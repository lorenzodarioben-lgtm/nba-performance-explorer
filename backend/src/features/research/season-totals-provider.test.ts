import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { type SeasonTotals } from '@nba-performance-explorer/contracts';

import { createApp } from '../../app.js';
import { fixturePlayerProvider } from '../players/fixture-player-provider.js';
import { providerUnavailable } from '../players/provider-error.js';
import { efficiencyMetrics } from './efficiency.js';
import {
  mapSeasonTotals,
  mapCareerSource,
  NbaSeasonTotalsProvider,
} from './season-totals-provider.js';

const headers = [
  'PLAYER_ID',
  'LEAGUE_ID',
  'SEASON_ID',
  'TEAM_ID',
  'TEAM_ABBREVIATION',
  'GP',
  'MIN',
  'PTS',
  'REB',
  'AST',
  'TOV',
  'FGM',
  'FGA',
  'FG3M',
  'FG3A',
  'FTM',
  'FTA',
];
const row = (overrides: Record<string, unknown> = {}) =>
  headers.map(
    (key) =>
      ({
        PLAYER_ID: 2544,
        LEAGUE_ID: '00',
        SEASON_ID: '2023-24',
        TEAM_ID: 1610612747,
        TEAM_ABBREVIATION: 'LAL',
        GP: 5,
        MIN: 180,
        PTS: 100,
        REB: 40,
        AST: 30,
        TOV: 10,
        FGM: 35,
        FGA: 70,
        FG3M: 10,
        FG3A: 25,
        FTM: 20,
        FTA: 20,
        ...overrides,
      })[key],
  );
const envelope = (rows: unknown[][]) => ({
  resultSets: [{ name: 'SeasonTotalsRegularSeason', headers, rowSet: rows }],
});

describe('raw totals and denominator integrity', () => {
  it('preserves trade split metadata while retaining only one season aggregate', () => {
    const mapped = mapCareerSource(
      envelope([
        row({ GP: 2 }),
        row({ TEAM_ID: 1610612742, TEAM_ABBREVIATION: 'DAL', GP: 3 }),
        row({ TEAM_ID: 0, TEAM_ABBREVIATION: 'TOT' }),
      ]),
      '2544',
    );
    expect(mapped.records).toHaveLength(1);
    expect(mapped.records[0]?.gamesPlayed).toBe(5);
    expect(mapped.stints.map((s) => [s.abbreviation, s.gamesPlayed])).toEqual([
      ['LAL', 2],
      ['DAL', 3],
    ]);
    expect(mapped.stints.every((s) => s.teamId.startsWith('nba:'))).toBe(true);
  });
  it('maps postseason rows independently and does not mix regular totals', async () => {
    const body = {
      resultSets: [
        {
          name: 'SeasonTotalsRegularSeason',
          headers,
          rowSet: [row({ GP: 40, PTS: 1000 })],
        },
        { name: 'SeasonTotalsPostSeason', headers, rowSet: [row({ GP: 5, PTS: 100 })] },
      ],
    };
    const client = { fetchEndpoint: vi.fn().mockResolvedValue(body) };
    const provider = new NbaSeasonTotalsProvider(client);
    const regular = await provider.getCareerTotals('2544');
    const playoffs = await provider.getCareerTotals('2544', 'playoffs');
    expect(regular.records[0]?.points).toBe(1000);
    expect(playoffs.records[0]?.points).toBe(100);
    await provider.getSeasonTotals('2544', '2023-24', 'playoffs');
    expect(client.fetchEndpoint).toHaveBeenCalledTimes(2);
  });
  it('calculates hand-checked metrics from raw counts', () => {
    const totals = mapSeasonTotals(envelope([row()]), '2544')[0]!;
    const metrics = efficiencyMetrics(totals);
    expect(metrics.trueShooting).toBeCloseTo(100 / 157.6);
    expect(metrics.effectiveFieldGoal).toBeCloseTo(40 / 70);
    expect(metrics.assistTurnover).toBe(3);
    expect(metrics.pointsPer36).toBe(20);
    expect(metrics.fieldGoalPercentage).toBe(0.5);
  });
  it('preserves nulls and returns unavailable for zero denominators', () => {
    const totals = mapSeasonTotals(
      envelope([
        row({ MIN: null, FGA: null, TOV: 0, FG3A: 0, FG3M: 0, FTM: 0, FTA: 0 }),
      ]),
      '2544',
    )[0]!;
    expect(totals.minutes).toBeNull();
    expect(efficiencyMetrics(totals)).toMatchObject({
      trueShooting: null,
      effectiveFieldGoal: null,
      assistTurnover: null,
      pointsPer36: null,
      threePointPercentage: null,
      freeThrowPercentage: null,
    });
  });
  it('does not clamp mathematically valid TS/eFG above 100 percent', () => {
    const totals = mapSeasonTotals(
      envelope([row({ PTS: 3, FGM: 1, FGA: 1, FG3M: 1, FG3A: 1, FTM: 0, FTA: 0 })]),
      '2544',
    )[0]!;
    expect(efficiencyMetrics(totals).trueShooting).toBe(1.5);
    expect(efficiencyMetrics(totals).effectiveFieldGoal).toBe(1.5);
  });
  it('chooses a unique traded aggregate exactly once', () => {
    const totals = mapSeasonTotals(
      envelope([
        row({ PTS: 20 }),
        row({ TEAM_ID: 1610612742, TEAM_ABBREVIATION: 'DAL', PTS: 80 }),
        row({ TEAM_ID: 0, TEAM_ABBREVIATION: 'TOT' }),
      ]),
      '2544',
    );
    expect(totals).toHaveLength(1);
    expect(totals[0]?.points).toBe(100);
    expect(totals[0]?.team).toBeUndefined();
  });
  it('rejects missing aggregate, duplicate rows, mismatched player and invalid attempts', () => {
    for (const rows of [
      [row(), row({ TEAM_ID: 1610612742, TEAM_ABBREVIATION: 'DAL' })],
      [row(), row()],
      [row({ PLAYER_ID: 123 })],
      [row({ FGA: 2 })],
      [row({ PTS: 22.5 })],
      [row({ SEASON_ID: '2023-25' })],
    ]) {
      expect(() => mapSeasonTotals(envelope(rows), '2544')).toThrow();
    }
  });
  it('handles empty records and excludes a non-NBA league', () => {
    expect(mapSeasonTotals(envelope([]), '2544')).toEqual([]);
    expect(mapSeasonTotals(envelope([row({ LEAGUE_ID: '20' })]), '2544')).toEqual([]);
  });
  it('deduplicates requests, uses Totals mode and preserves actual retrieval time', async () => {
    const client = { fetchEndpoint: vi.fn().mockResolvedValue(envelope([row()])) };
    const now = () => new Date('2026-10-13T16:00:00.000Z');
    const provider = new NbaSeasonTotalsProvider(client, now);
    const results = await Promise.all([
      provider.getSeasonTotals('2544', '2023-24'),
      provider.getSeasonTotals('2544', '2023-24'),
    ]);
    expect(client.fetchEndpoint).toHaveBeenCalledTimes(1);
    expect(client.fetchEndpoint).toHaveBeenCalledWith('playercareerstats', {
      PlayerID: '2544',
      PerMode: 'Totals',
      LeagueID: '00',
    });
    expect(results[0]?.retrievedAt).toBe(now().toISOString());
  });
  it('expires raw-total cache without retry storms and never caches failures', async () => {
    let time = new Date('2026-10-13T16:00:00.000Z');
    const client = {
      fetchEndpoint: vi
        .fn()
        .mockRejectedValueOnce(providerUnavailable())
        .mockResolvedValue(envelope([row()])),
    };
    const provider = new NbaSeasonTotalsProvider(client, () => time);
    await expect(provider.getSeasonTotals('2544', '2023-24')).rejects.toThrow();
    await provider.getSeasonTotals('2544', '2023-24');
    time = new Date(time.getTime() + 6 * 60 * 60_000);
    await provider.getSeasonTotals('2544', '2023-24');
    expect(client.fetchEndpoint).toHaveBeenCalledTimes(3);
  });
  it('returns typed raw/derived API values and explicit unsupported fixture state', async () => {
    const totals: SeasonTotals = mapSeasonTotals(envelope([row()]), '2544')[0]!;
    const app = createApp(fixturePlayerProvider, {
      playerSource: 'fixture',
      totalsProvider: {
        getSeasonTotals: async () => ({
          totals,
          retrievedAt: '2026-10-13T16:00:00.000Z',
        }),
      },
    });
    const response = await request(app).get('/api/players/2544/totals?season=2023-24');
    expect(response.status).toBe(200);
    expect(response.body.metrics.pointsPer36).toBe(20);
    expect(response.body.provenance.warnings.join(' ')).toContain('DEMO FIXTURES');
    const disabled = await request(createApp()).get(
      '/api/players/2544/totals?season=2023-24',
    );
    expect(disabled.body.status).toBe('unsupported');
    expect(disabled.body.totals).toBeNull();
    expect(
      (await request(app).get('/api/players/2544/totals?season=2023-25')).status,
    ).toBe(400);
  });
  it('degrades absent seasons and sanitizes scope conflicts', async () => {
    const missing = createApp(fixturePlayerProvider, {
      totalsProvider: {
        getSeasonTotals: async () => ({
          totals: null,
          retrievedAt: '2026-10-13T16:00:00.000Z',
        }),
      },
    });
    expect(
      (await request(missing).get('/api/players/2544/totals?season=2023-24')).body
        .status,
    ).toBe('season-unavailable');
    const totals = mapSeasonTotals(envelope([row()]), '2544')[0]!;
    const conflict = createApp(fixturePlayerProvider, {
      totalsProvider: {
        getSeasonTotals: async () => ({
          totals,
          retrievedAt: '2026-10-13T16:00:00.000Z',
        }),
      },
    });
    expect(
      (await request(conflict).get('/api/players/2544/totals?season=2022-23')).status,
    ).toBe(502);
  });
});
