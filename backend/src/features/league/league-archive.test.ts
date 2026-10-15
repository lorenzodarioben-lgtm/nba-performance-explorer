import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  LeagueLeadersResponseSchema,
  LeagueSeasonsResponseSchema,
  LeagueStandingsResponseSchema,
} from '@nba-performance-explorer/contracts';
import recorded from '../recorded-archive/recorded-snapshot.json' with { type: 'json' };
import { createApp } from '../../app.js';
import { LeagueArchive, value } from './league-archive.js';
import { LeagueService, sumLines } from './league-service.js';

const archive = new LeagueArchive();
const service = new LeagueService(archive);
const app = createApp(undefined, { leagueService: service });

describe('league archive integrity', () => {
  it('loads every indexed season, each file matching its pinned digest and schema', () => {
    expect(archive.seasons.length).toBeGreaterThanOrEqual(40);
    for (const season of archive.seasons) {
      const s = archive.summary(season);
      expect(s.season).toBe(season);
      const reg = s.scopes['regular-season'];
      // Paired games: every team's games are two per game across the league.
      expect(reg.teams.reduce((n, t) => n + t.gp, 0)).toBe(reg.gameCount * 2);
      expect(reg.teams.reduce((n, t) => n + t.w, 0)).toBe(reg.gameCount);
    }
  });

  it('agrees with the independent Wikipedia 2023-24 archive on every game both team pages agree on', () => {
    const games = archive.seasonGames('2023-24').scopes['regular-season'].games;
    const byId = new Map(games.map((g) => [g[0], g]));
    // Wikipedia team pages: a game counts as agreed when both teams' pages give the same score.
    const seen = new Map<
      string,
      { home: string; homeScore: number; awayScore: number }[]
    >();
    for (const snap of recorded.snapshots)
      for (const r of snap.results) {
        const home = r.location === 'home' ? snap.team.sourceId : r.opponent.sourceId;
        const homeScore = r.location === 'home' ? r.teamScore : r.opponentScore;
        const awayScore = r.location === 'home' ? r.opponentScore : r.teamScore;
        seen.set(r.sourceId, [
          ...(seen.get(r.sourceId) ?? []),
          { home, homeScore, awayScore },
        ]);
      }
    let agreed = 0,
      disputed = 0;
    for (const [id, views] of seen) {
      const same =
        views.length === 2 &&
        views[0]!.home === views[1]!.home &&
        views[0]!.homeScore === views[1]!.homeScore &&
        views[0]!.awayScore === views[1]!.awayScore;
      if (!same) {
        disputed++;
        continue;
      }
      const g = byId.get(id)!;
      expect(g, id).toBeDefined();
      expect([String(g[2]), g[4], g[5]], id).toEqual([
        views[0]!.home,
        views[0]!.homeScore,
        views[0]!.awayScore,
      ]);
      agreed++;
    }
    expect(agreed).toBe(1219);
    expect(disputed).toBe(11);
  });

  it('keeps traded players as separate team stints whose sum is the season', () => {
    const reg = archive.summary('2023-24').scopes['regular-season'];
    // OG Anunoby: Toronto, then New York.
    const stints = reg.players.filter((p) => p.playerId === 1628384);
    expect(stints.map((p) => p.teamId).sort()).toEqual([1610612752, 1610612761]);
    const lines = archive
      .playerLines('2023-24', 'regular-season')
      .filter((l) => l.playerId === 1628384);
    expect(lines).toHaveLength(stints.reduce((n, s) => n + s.gp, 0));
    expect(value(sumLines(stints.map((s) => s.totals)), 'pts')).toBe(
      lines.reduce((n, l) => n + value(l.line, 'pts')!, 0),
    );
  });

  it('reports seasons whose box scores do not add up, and refuses player research there', async () => {
    const s = service.seasonInfo('1992-93');
    expect(s.capabilities.playerStats).toBe(false);
    expect(s.incompleteBoxScores).toBeGreaterThan(100);
    const res = await request(app).get('/api/league/leaders?season=1992-93');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('LEAGUE_PLAYER_STATS_INCOMPLETE');
    // Team results are still served.
    const standings = await request(app).get('/api/league/standings?season=1992-93');
    expect(standings.status).toBe(200);
  });
});

describe('league standings', () => {
  it('serves the published table and confirms it against paired results', () => {
    const r = LeagueStandingsResponseSchema.parse(service.standings('2023-24'));
    expect(r.basis).toBe('published');
    expect(r.resultsAgreement).toEqual({ teams: 30, agreeing: 30 });
    const east = r.conferences.find((c) => c.conference === 'East')!;
    expect(east.rows[0]).toMatchObject({
      rank: 1,
      wins: 64,
      losses: 18,
      gamesBehind: 0,
    });
    expect(east.rows[0]!.team.abbreviation).toBe('BOS');
  });

  it('ranks league-wide from paired results when no table is published', () => {
    // NBA.com publishes a table for every archived season; hide one to exercise the fallback.
    const stub = Object.create(archive) as LeagueArchive;
    stub.summary = (s: string) => ({ ...archive.summary(s), standings: null });
    const r = new LeagueService(stub).standings('1987-88');
    expect(r.conferences[0]!.rows[0]!.team.abbreviation).toBe('LAL');
    expect(r.conferences[0]!.rows).toHaveLength(23);
    expect(r.basis).toBe('derived');
    expect(r.conferences.map((c) => c.conference)).toEqual(['League']);
    expect(r.provenance.coverage).toMatch(/no standings table/);
  });
});

describe('league leaders', () => {
  it('computes per-game, per-36 and totals from summed box lines with stated qualification', () => {
    const ppg = LeagueLeadersResponseSchema.parse(
      service.leaders({
        season: '2023-24',
        scope: 'regular-season',
        metric: 'points',
        mode: 'per-game',
        page: 1,
      }),
    );
    expect(ppg.rows[0]).toMatchObject({
      rank: 1,
      name: 'Luka Dončić',
      gamesPlayed: 70,
    });
    expect(ppg.rows[0]!.value).toBeCloseTo(2370 / 70, 4);
    expect(ppg.query.minGames).toBe(58); // 70% of 82, rounded up
    expect(ppg.qualification).toMatch(/not the NBA's official qualification rule/);
    const totals = service.leaders({
      season: '2023-24',
      scope: 'regular-season',
      metric: 'points',
      mode: 'totals',
      page: 1,
    });
    expect(totals.rows[0]).toMatchObject({ name: 'Luka Dončić', value: 2370 });
    const per36 = service.leaders({
      season: '2023-24',
      scope: 'regular-season',
      metric: 'points',
      mode: 'per-36',
      page: 1,
    });
    const top = per36.rows[0]!;
    const [pts, min] = [
      top.inputs.find((i) => i.label === 'Points')!.value,
      top.inputs.find((i) => i.label === 'MIN')!.value,
    ];
    expect(top.value).toBeCloseTo((pts / min) * 36, 3);
  });

  it('uses NBA.com possession counts for per-100 and refuses it where they do not exist', () => {
    const per100 = service.leaders({
      season: '2023-24',
      scope: 'regular-season',
      metric: 'assists',
      mode: 'per-100',
      page: 1,
    });
    const top = per100.rows[0]!;
    const poss = top.inputs.find((i) => i.label === 'POSS')!.value;
    expect(top.value).toBeCloseTo((top.inputs[0]!.value / poss) * 100, 3);
    expect(() =>
      service.leaders({
        season: '2023-24',
        scope: 'regular-season',
        metric: 'assists',
        mode: 'per-100',
        team: 'nba:1610612738',
        page: 1,
      }),
    ).toThrow(/whole season, not one team stint/);
    const early = archive.seasons.find(
      (x) =>
        service.seasonInfo(x).capabilities.playerStats &&
        !service.seasonInfo(x).capabilities.playerPossessions,
    )!;
    expect(() =>
      service.leaders({
        season: early,
        scope: 'regular-season',
        metric: 'assists',
        mode: 'per-100',
        page: 1,
      }),
    ).toThrow(/no player possession counts/);
  });

  it('computes shooting percentages from season makes and attempts with an attempts minimum', () => {
    const ts = service.leaders({
      season: '2023-24',
      scope: 'regular-season',
      metric: 'trueShootingPercentage',
      mode: 'totals',
      page: 1,
    });
    expect(ts.query.minAttempts).toBe(300);
    for (const r of ts.rows) {
      const [pts, fga, fta] = r.inputs.map((i) => i.value);
      expect(r.value).toBeCloseTo(pts! / (2 * (fga! + 0.44 * fta!)), 4);
      expect(fga).toBeGreaterThanOrEqual(300);
    }
    expect(() =>
      service.leaders({
        season: '2023-24',
        scope: 'regular-season',
        metric: 'fieldGoalPercentage',
        mode: 'per-game',
        page: 1,
      }),
    ).toThrow(/percentage is computed once/);
  });

  it('filters to one team stint and keeps competition ranks with midrank percentiles', () => {
    const knicks = service.leaders({
      season: '2023-24',
      scope: 'regular-season',
      metric: 'points',
      mode: 'totals',
      team: 'nba:1610612752',
      page: 1,
    });
    const og = knicks.rows.find((r) => r.name === 'OG Anunoby')!;
    expect(og.teams.map((t) => t.abbreviation)).toEqual(['NYK']);
    const stint = archive
      .summary('2023-24')
      .scopes[
        'regular-season'
      ].players.find((p) => p.playerId === 1628384 && p.teamId === 1610612752)!;
    expect(og.value).toBe(value(stint.totals, 'pts'));
    const gp = service.leaders({
      season: '2023-24',
      scope: 'regular-season',
      metric: 'gamesPlayed',
      mode: 'totals',
      page: 1,
    });
    const firstTie = gp.rows.filter((r) => r.value === gp.rows[0]!.value);
    expect(firstTie.every((r) => r.rank === 1)).toBe(true);
  });

  it('validates parameters at the API boundary', async () => {
    for (const [url, status] of [
      ['/api/league/leaders?metric=dunks', 400],
      ['/api/league/leaders?season=2023-25', 400],
      ['/api/league/leaders?season=1950-51', 404],
      ['/api/league/leaders?metric=points&metric=assists', 400],
      ['/api/league/leaders?season=2023-24&team=nba:1610612738&mode=per-100', 422],
      ['/api/league/seasons?x=1', 400],
    ] as const)
      expect((await request(app).get(url)).status, url).toBe(status);
    expect((await request(app).post('/api/league/leaders')).status).toBe(405);
    const seasons = await request(app).get('/api/league/seasons');
    expect(LeagueSeasonsResponseSchema.parse(seasons.body).seasons.length).toBe(
      archive.seasons.length,
    );
    expect((await request(createApp()).get('/api/league/seasons')).status).toBe(503);
  });
});
