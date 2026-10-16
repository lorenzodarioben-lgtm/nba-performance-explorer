import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  LeagueDistributionResponseSchema,
  LeagueMovementResponseSchema,
  LeaguePlayerResponseSchema,
} from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { LeagueArchive } from './league-archive.js';
import { LeaguePlayers } from './league-players.js';
import { LeagueService } from './league-service.js';

const service = new LeagueService(new LeagueArchive());
const players = new LeaguePlayers(service);

describe('a player across the archive', () => {
  const lebron = LeaguePlayerResponseSchema.parse(players.player('2544'));

  it('dates milestones to the game in which a total first reached them', () => {
    expect(lebron.coverage).toMatchObject({
      firstSeason: '2003-04',
      mayPredateArchive: false,
      wholeCareer: true,
    });
    const at = (label: string) =>
      lebron.milestones.find((m) => m.label === label)!.game;
    // Matches the record: 30,000 points on 23 Jan 2018, 40,000 on 2 Mar 2024.
    expect(at('30,000 career points')).toMatchObject({
      date: '2018-01-23',
      opponent: 'SAS',
    });
    expect(at('40,000 career points')).toMatchObject({
      date: '2024-03-02',
      opponent: 'DEN',
    });
    const dates = lebron.milestones.map((m) => m.game.date);
    expect(dates).toEqual([...dates].sort());
  });

  it('keeps career highs with every game at the mark', () => {
    const pts = lebron.careerHighs.regularSeason.find((m) => m.key === 'pts')!;
    expect(pts).toMatchObject({ value: 61, count: 1 });
    expect(pts.games[0]).toMatchObject({ date: '2014-03-03', opponent: 'CHA' });
    for (const s of lebron.seasons) {
      const high = s.highs.find((h) => h.key === 'pts');
      const low = s.lows.find((h) => h.key === 'pts');
      if (high && low) expect(high.value).toBeGreaterThanOrEqual(low.value);
    }
  });

  it('counts availability inside each stint’s span and orders trades by date', () => {
    for (const s of lebron.seasons)
      for (const st of s.stints)
        expect(st.teamGamesInSpan).toBeGreaterThanOrEqual(st.gamesPlayed);
    const og = players.player('1628384').seasons.find((s) => s.season === '2023-24')!;
    expect(og.stints.map((st) => st.team.abbreviation)).toEqual(['TOR', 'NYK']);
    expect(og.stints[0]!.lastGame < og.stints[1]!.firstGame).toBe(true);
  });

  it('says when the archive cannot hold the whole career', () => {
    const kareem = players.player('76003');
    expect(kareem.coverage).toMatchObject({
      firstSeason: '1983-84',
      mayPredateArchive: true,
      wholeCareer: false,
    });
    expect(
      kareem.milestones.every(
        (m) => m.archiveCount && /in archived games/.test(m.label),
      ),
    ).toBe(true);
    const jordan = players.player('893');
    expect(jordan.coverage.incompleteSeasons.length).toBeGreaterThan(0);
    expect(jordan.coverage.wholeCareer).toBe(false);
  });
});

describe('rank movement and distributions', () => {
  it('ends the dated leaderboard on the season’s final standings of the leaders page', () => {
    const m = LeagueMovementResponseSchema.parse(
      players.movement({
        season: '2023-24',
        scope: 'regular-season',
        metric: 'points',
        mode: 'per-game',
      }),
    );
    const leaders = service.leaders({
      season: '2023-24',
      scope: 'regular-season',
      metric: 'points',
      mode: 'per-game',
      page: 1,
    });
    expect(m.snapshot[0]!.name).toBe(leaders.rows[0]!.name);
    expect(m.snapshot[0]!.value).toBeCloseTo(leaders.rows[0]!.value, 1);
    expect(m.query.date).toBe(m.dates.at(-1));
    expect(m.trajectories[0]!.ranks).toHaveLength(m.dates.length);
  });

  it('uses only games through the chosen date', () => {
    const early = players.movement({
      season: '2023-24',
      scope: 'regular-season',
      metric: 'points',
      mode: 'totals',
      date: '2023-10-26',
    });
    const lines = service.archive
      .playerLines('2023-24', 'regular-season')
      .filter((l) => l.date <= '2023-10-26');
    const totals = new Map<number, number>();
    for (const l of lines)
      totals.set(l.playerId, (totals.get(l.playerId) ?? 0) + (l.line[15] ?? 0));
    expect(early.snapshot[0]!.value).toBe(Math.max(...totals.values()));
    expect(() =>
      players.movement({
        season: '2023-24',
        scope: 'regular-season',
        metric: 'points',
        mode: 'totals',
        date: '2023-12-24',
      }),
    ).toThrow(/No regular-season games/);
  });

  it('describes the same cohort as the leaders page, with the player marked', () => {
    const d = LeagueDistributionResponseSchema.parse(
      players.distribution({
        season: '2023-24',
        scope: 'regular-season',
        metric: 'trueShootingPercentage',
        player: '203999',
      }),
    );
    const leaders = service.rank({
      season: '2023-24',
      scope: 'regular-season',
      metric: 'trueShootingPercentage',
      mode: 'totals',
      page: 1,
    });
    expect(d.n).toBe(leaders.rows.length);
    expect(d.bins.reduce((n, b) => n + b.count, 0)).toBe(d.n);
    const s = d.summary!;
    expect(s.min <= s.q1 && s.q1 <= s.median && s.median <= s.q3 && s.q3 <= s.max).toBe(
      true,
    );
    const row = leaders.rows.find((r) => r.playerId === '203999')!;
    expect(d.marker).toMatchObject({
      value: row.value,
      percentile: row.percentile,
      rank: row.rank,
    });
    expect(d.profile.map((p) => p.metric)).toContain('points');
  });

  it('validates the player routes', async () => {
    const app = createApp(undefined, { leagueService: service });
    expect((await request(app).get('/api/league/players/2544')).status).toBe(200);
    expect((await request(app).get('/api/league/players/abc')).status).toBe(400);
    expect((await request(app).get('/api/league/players/1')).status).toBe(404);
    expect((await request(app).get('/api/league/movement?metric=dunks')).status).toBe(
      400,
    );
    expect((await request(app).get('/api/league/movement?season=1992-93')).status).toBe(
      422,
    );
    expect(
      (await request(app).get('/api/league/distribution?metric=points&player=2544'))
        .status,
    ).toBe(200);
  });
});
