import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  ArchiveGameSchema,
  PlayoffBracketResponseSchema,
  PlayoffSeriesFilmRoomResponseSchema,
  PlayoffSeriesSchema,
  type ArchiveGame,
} from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { RecordedArchiveProvider } from '../recorded-archive/recorded-provider.js';
import { analyzeSeries, seriesNeighbours } from './playoff-film-room.js';
import { WikipediaArchiveProvider, archiveSnapshot } from './archive-provider.js';
import { WikiArchiveClient } from './wiki-client.js';

const teams = new RecordedArchiveProvider().dataset.snapshots.map((s) => s.team);
const BOS = teams.find((t) => t.abbreviation === 'BOS')!;
const MIA = teams.find((t) => t.abbreviation === 'MIA')!;

/** A synthetic final from explicit period scores ([home, away] per period). */
function final(n: number, home: typeof BOS, periods: [number, number][]): ArchiveGame {
  const away = home.id === BOS.id ? MIA : BOS;
  const sourceId = `004230010${n}`;
  return ArchiveGameSchema.parse({
    id: `nba:${sourceId}`,
    sourceId,
    season: '2023-24',
    scope: 'playoffs',
    date: `2024-04-2${n}`,
    status: 'final',
    away,
    home,
    homeScore: periods.reduce((s, p) => s + p[0], 0),
    awayScore: periods.reduce((s, p) => s + p[1], 0),
    tipoffUtc: null,
    reportedTime: null,
    venue: null,
    quarters: periods.map(([h, a], i) => ({ period: i + 1, home: h, away: a })),
    leaders: [
      { teamId: away.id, points: null, rebounds: null, assists: null },
      { teamId: home.id, points: null, rebounds: null, assists: null },
    ],
    recapUrl: `https://www.nba.com/game/${sourceId}`,
  });
}

// BOS (teams[0]) wins G1 at home by 10 and G3 away in overtime after trailing after three;
// MIA wins G2 at home by 1. The series is unfinished in this record.
const g1 = final(1, BOS, [
  [30, 20],
  [25, 25],
  [25, 25],
  [20, 20],
]);
const g2 = final(2, MIA, [
  [25, 30],
  [25, 20],
  [20, 25],
  [21, 15],
]);
const g3 = final(3, MIA, [
  [30, 20],
  [20, 20],
  [25, 20],
  [20, 35],
  [5, 12],
]);
const unfinished = PlayoffSeriesSchema.parse({
  id: 'r1-BOS-MIA',
  round: 1,
  conference: 'East',
  teams: [BOS, MIA],
  wins: [2, 1],
  games: [
    { game: g1, number: 1, winner: BOS, after: [1, 0] },
    { game: g2, number: 2, winner: MIA, after: [1, 1] },
    { game: g3, number: 3, winner: BOS, after: [2, 1] },
  ],
  status: 'incomplete',
  winner: null,
  feeders: null,
  sourceIdRoundAgrees: true,
  totalPoints: [100 + 90 + 107, 90 + 91 + 100],
  overtimeGames: 1,
  homeWins: 2,
  seeds: null,
});

describe('series film room analysis', () => {
  it('derives margins, running margins, halves and period totals from teams[0]’s side', () => {
    const a = analyzeSeries(unfinished);
    expect(a.games.map((g) => g.margin)).toEqual([10, -1, 7]);
    expect(a.games.map((g) => g.total)).toEqual([190, 181, 207]);
    // Away games flip the sides: in G2 BOS scored 30, 20, 25, 15 = 90… against MIA 91.
    expect(a.games[1]!.periods.map((p) => p.points)).toEqual([
      [30, 25],
      [20, 25],
      [25, 20],
      [15, 21],
    ]);
    expect(a.games[1]!.periods.map((p) => p.cumulativeMargin)).toEqual([5, 0, 5, -1]);
    expect(a.games[1]!.wonFromBehindAfterThree).toBe(true);
    // G3: MIA led by 15 after three, BOS won in overtime.
    expect(a.games[2]!.periods.map((p) => p.cumulativeMargin)).toEqual([
      -10, -10, -15, 0, 7,
    ]);
    expect(a.games[2]!.halves).toEqual({
      first: [40, 50],
      second: [55, 45],
      overtime: [12, 5],
    });
    expect(a.games[2]!.wonFromBehindAfterThree).toBe(true);
    expect(a.comebacksAfterThree).toBe(2);
    expect(a.periodTotals).toEqual([
      { period: 'Q1', points: [80, 75] },
      { period: 'Q2', points: [65, 70] },
      { period: 'Q3', points: [70, 70] },
      { period: 'Q4', points: [70, 61] },
      { period: 'OT', points: [12, 5] },
    ]);
    expect(a.widestPeriod).toEqual({ period: 'Q4', margin: 9 });
    expect(a.pointsPerGame).toEqual([297 / 3, 281 / 3]);
    expect(a.averageMargin).toBeCloseTo(16 / 3, 12);
    expect(a.closest).toEqual({ margin: 1, gameIds: [g2.id] });
    expect(a.largest).toEqual({ margin: 10, gameId: g1.id, winnerId: BOS.id });
    // An unfinished series has no clinching game.
    expect(a.games.some((g) => g.clinching)).toBe(false);
    expect(seriesNeighbours(unfinished, [unfinished])).toEqual({
      previous: [null, null],
      next: null,
    });
  });

  it('reconciles every recorded 2024 series with its final scores, wins and points', async () => {
    const provider = new WikipediaArchiveProvider(
      new WikiArchiveClient(() => Promise.reject(new TypeError('offline test'))),
      'bundled',
    );
    const app = createApp(undefined, { archiveProvider: provider });
    const bracket = PlayoffBracketResponseSchema.parse(
      (await request(app).get('/api/games/bracket')).body,
    );
    expect(bracket.series).toHaveLength(15);
    expect(bracket.champion?.abbreviation).toBe('BOS');
    expect(bracket.recordedGames).toBe(archiveSnapshot().playoffs.games.length);
    for (const s of bracket.series) {
      const res = await request(app).get(`/api/games/series/${s.id}`);
      expect(res.status, s.id).toBe(200);
      const room = PlayoffSeriesFilmRoomResponseSchema.parse(res.body);
      const a = room.analysis;
      // Period points add up to each final; wins and points match the series record.
      for (const [i, g] of a.games.entries()) {
        const sum = g.periods.reduce(
          (t, p) => [t[0] + p.points[0], t[1] + p.points[1]],
          [0, 0],
        );
        expect(sum[0] - sum[1], `${s.id} G${i + 1}`).toBe(g.margin);
        expect(sum[0] + sum[1]).toBe(g.total);
        expect(g.periods.at(-1)!.cumulativeMargin).toBe(g.margin);
      }
      expect(a.games.filter((g) => g.margin > 0)).toHaveLength(s.wins[0]);
      expect(a.games.filter((g) => g.margin < 0)).toHaveLength(s.wins[1]);
      expect(a.pointsPerGame.map((p) => Math.round(p * a.games.length))).toEqual(
        s.totalPoints,
      );
      expect(a.games.filter((g) => g.clinching)).toHaveLength(1);
      if (s.round === 4) expect(room.next).toBeNull();
      else expect(bracket.series.some((x) => x.id === room.next)).toBe(true);
      expect(room.provenance.warnings.join(' ')).toMatch(/Served from the snapshot/);
    }
    // The 2024 Finals, as recorded: Boston 4–1, Dallas's 38-point Game 4 the widest margin.
    const finals = PlayoffSeriesFilmRoomResponseSchema.parse(
      (await request(app).get('/api/games/series/r4-BOS-DAL')).body,
    );
    expect(finals.analysis.games.map((g) => g.margin)).toEqual([18, 7, 7, -38, 18]);
    expect(finals.analysis.largest).toMatchObject({
      margin: 38,
      winnerId: 'nba:1610612742',
    });
    expect(finals.previous).toEqual(['r3-BOS-IND', 'r3-DAL-MIN']);
    expect(finals.series.seeds).toEqual([1, 5]);
  });

  it('validates series IDs strictly', async () => {
    const app = createApp(undefined, {
      archiveProvider: new WikipediaArchiveProvider(
        new WikiArchiveClient(() => Promise.reject(new TypeError('offline test'))),
        'bundled',
      ),
    });
    for (const bad of ['x', 'r5-BOS-DAL', 'r4-bos-dal', 'r4-BOS-DAL?extra=1'])
      expect((await request(app).get(`/api/games/series/${bad}`)).status, bad).toBe(
        400,
      );
    expect((await request(app).get('/api/games/series/r1-AAA-BBB')).status).toBe(404);
    expect((await request(app).post('/api/games/series/r4-BOS-DAL')).status).toBe(405);
    expect(
      (await request(createApp()).get('/api/games/series/r4-BOS-DAL')).status,
    ).toBe(503);
  });

  it('falls back to the committed snapshot when the live source fails', async () => {
    const provider = new WikipediaArchiveProvider(
      new WikiArchiveClient(() => Promise.reject(new TypeError('network down'))),
    );
    const data = await provider.getGames();
    expect(data.page.bundled).toBe(true);
    expect(data.page.revision).toBe(archiveSnapshot().playoffs.page.revision);
    expect(data.seeds?.seeds?.size).toBe(16);
  });
});
