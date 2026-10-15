import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  LeagueRecordsResponseSchema,
  LeagueTeamRankingsResponseSchema,
} from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { LeagueArchive, value } from './league-archive.js';
import { capabilities, LeagueService } from './league-service.js';
import { LeagueRecords } from './league-records.js';

const service = new LeagueService(new LeagueArchive());
const records = new LeagueRecords(service);
const app = createApp(undefined, { leagueService: service });

describe('league record book', () => {
  const steals = LeagueRecordsResponseSchema.parse(
    records.records({
      scope: 'regular-season',
      kind: 'game',
      category: 'steals',
      mode: 'totals',
    }),
  );

  it('covers exactly the seasons whose box scores add up, and lists the rest with a reason', () => {
    const playerSeasons = service.archive.seasons.filter(
      (s) => capabilities(service.archive.summary(s)).playerStats,
    );
    expect(steals.coverage.included).toEqual(playerSeasons);
    expect(steals.coverage.excluded.map((e) => e.season)).toContain('1992-93');
    expect(
      steals.coverage.excluded.every((e) => /box scores do not add up/.test(e.reason)),
    ).toBe(true);
    expect(steals.provenance.coverage).toMatch(/Not all-time NBA records/);
  });

  it('keeps every tie with the tenth best and matches the archived box lines', () => {
    const tenth = steals.records[9]!.value;
    expect(steals.records.length).toBeGreaterThanOrEqual(10);
    expect(steals.records.every((r) => r.value >= tenth)).toBe(true);
    for (const r of steals.records.filter(
      (x) => x.rank === steals.records.at(-1)!.rank,
    ))
      expect(r.value).toBe(tenth);
    const top = steals.records[0]!;
    const line = service.archive
      .playerLines(top.season, 'regular-season')
      .find((l) => l.gameId === top.game!.id && String(l.playerId) === top.playerId)!;
    expect(value(line.line, 'stl')).toBe(top.value);
  });

  it('records progression only upward, with ties at the standing mark', () => {
    const p = steals.progression;
    expect(p[0]!.kind).toBe('first');
    expect(p[0]!.season).toBe(steals.coverage.included[0]);
    let best = p[0]!.value;
    for (const e of p.slice(1)) {
      if (e.kind === 'tie') expect(e.value).toBe(best);
      else if (e.kind === 'new') {
        expect(e.value).toBeGreaterThan(best);
        best = e.value;
      }
    }
    expect(best).toBe(steals.records[0]!.value);
  });

  it('qualifies per-game season records and computes them from totals', () => {
    const r = records.records({
      scope: 'regular-season',
      kind: 'season',
      category: 'points',
      mode: 'per-game',
    });
    const top = r.records[0]!;
    const sc = service.archive.summary(top.season).scopes['regular-season'];
    const stints = sc.players.filter((p) => String(p.playerId) === top.playerId);
    const pts = stints.reduce((n, p) => n + value(p.totals, 'pts')!, 0);
    expect(top.value).toBeCloseTo(pts / top.gamesPlayed!, 2);
    expect(top.gamesPlayed).toBeGreaterThanOrEqual(
      Math.ceil(0.7 * Math.max(...sc.teams.map((t) => t.gp))),
    );
  });
});

describe('league team rankings', () => {
  it('ranks lower-is-better measures from the lowest', () => {
    const r = LeagueTeamRankingsResponseSchema.parse(
      records.teamRankings('2007-08', 'regular-season', 'defensiveRating'),
    );
    expect(r.direction).toBe('lower-is-better');
    expect(r.rows[0]!.value).toBe(Math.min(...r.rows.map((x) => x.value)));
    expect(r.rows[0]!.team.abbreviation).toBe('BOS');
  });

  it('computes records from paired results and refuses ratings NBA.com does not publish', () => {
    const win = records.teamRankings('1995-96', 'regular-season', 'winPercentage');
    expect(win.rows[0]).toMatchObject({ wins: 72, losses: 10 });
    expect(win.rows[0]!.value).toBeCloseTo(72 / 82, 4);
    const rating = records.teamRankings('1990-91', 'regular-season', 'netRating');
    expect(rating.rows).toHaveLength(0);
    expect(rating.unavailable).toMatch(/does not estimate possessions/);
  });

  it('validates the records and rankings routes', async () => {
    expect((await request(app).get('/api/league/records?category=dunks')).status).toBe(
      400,
    );
    expect(
      (
        await request(app).get(
          '/api/league/team-rankings?metric=netRating&season=1950-51',
        )
      ).status,
    ).toBe(404);
    expect(
      (await request(app).get('/api/league/team-rankings?metric=pace')).status,
    ).toBe(200);
  });
});
