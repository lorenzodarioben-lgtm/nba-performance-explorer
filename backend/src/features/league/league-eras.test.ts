import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  LeagueEraPlayersResponseSchema,
  LeagueErasResponseSchema,
} from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { LeagueArchive, value } from './league-archive.js';
import { LeagueEras } from './league-eras.js';
import { LeagueService, sumLines } from './league-service.js';

const service = new LeagueService(new LeagueArchive());
const eras = new LeagueEras(service);

describe('league environment', () => {
  const response = LeagueErasResponseSchema.parse(eras.eras());
  const env = (season: string) => response.seasons.find((s) => s.season === season)!;

  it('computes league rates from every team’s summed box scores and minutes', () => {
    expect(response.seasons.map((s) => s.season)).toEqual(service.archive.seasons);
    const reg = service.archive.summary('2023-24').scopes['regular-season'];
    const totals = sumLines(reg.teams.map((t) => t.totals));
    const games = reg.teams.reduce((n, t) => n + t.gp, 0);
    expect(env('2023-24').points).toBeCloseTo(value(totals, 'pts')! / games, 2);
    expect(env('2023-24').per36.points).toBeCloseTo(
      (value(totals, 'pts')! / value(totals, 'min')!) * 36,
      3,
    );
    expect(env('2023-24').pace).not.toBeNull();
  });

  it('leaves a rate empty where NBA.com did not record the field in every game', () => {
    expect(env('1984-85').rebounds).toBeNull();
    expect(env('1984-85').per36.steals).toBeNull();
    expect(env('1990-91').pace).toBeNull();
    expect(env('1990-91').rebounds).not.toBeNull();
  });
});

describe('league-relative player index', () => {
  const r = LeagueEraPlayersResponseSchema.parse(eras.players(['201939', '893'], 500));
  const curry = r.players.find((p) => p.playerId === '201939')!;
  const jordan = r.players.find((p) => p.playerId === '893')!;

  it('divides the player’s per-36 rate by the league’s that season', () => {
    const season = curry.seasons.find((s) => s.season === '2015-16')!;
    const stints = service.archive
      .summary('2015-16')
      .scopes['regular-season'].players.filter((p) => p.playerId === 201939);
    const t = sumLines(stints.map((p) => p.totals));
    const league = eras.environment().find((e) => e.season === '2015-16')!;
    const expected =
      (((value(t, 'fg3m')! / value(t, 'min')!) * 36) / league.per36.threesMade!) * 100;
    expect(season.index.threesMade).toBeCloseTo(expected, 0);
    expect(season.raw.threesMade).toBeCloseTo(
      value(t, 'fg3m')! / season.gamesPlayed,
      1,
    );
    const ts = value(t, 'pts')! / (2 * (value(t, 'fga')! + 0.44 * value(t, 'fta')!));
    expect(season.index.trueShooting).toBeCloseTo(
      (ts / league.trueShootingPct!) * 100,
      0,
    );
  });

  it('withholds the index where the league rate is unknown, and summarises only qualifying seasons', () => {
    const rookie = jordan.seasons.find((s) => s.season === '1984-85')!;
    expect(rookie.index.rebounds).toBeNull();
    expect(rookie.index.points).not.toBeNull();
    expect(jordan.summary.seasons).toBe(
      jordan.seasons.filter((s) => (s.minutes ?? 0) >= 500).length,
    );
    expect(r.model).toMatch(/100 is exactly the league rate/);
  });

  it('validates the era routes', async () => {
    const app = createApp(undefined, { leagueService: service });
    expect(
      (await request(app).get('/api/league/era-players?players=893,893')).status,
    ).toBe(400);
    expect(
      (await request(app).get('/api/league/era-players?players=1,2,3,4,5')).status,
    ).toBe(400);
    const missing = await request(app).get(
      '/api/league/era-players?players=893,999999999',
    );
    expect(missing.body.missing).toEqual(['999999999']);
    expect((await request(app).get('/api/league/player-search?q=j')).status).toBe(400);
    expect(
      (await request(app).get('/api/league/player-search?q=jokic')).body.results[0]
        .playerId,
    ).toBe('203999');
  });
});
