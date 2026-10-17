import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  RecordedSimilarityResponseSchema,
  type SimilarityMetric,
} from '@nba-performance-explorer/contracts';
import { RecordedArchiveProvider } from './recorded-provider.js';
import { buildSimilarity } from './recorded-similarity.js';
import { createApp } from '../../app.js';

const p = new RecordedArchiveProvider();
const find = (player: string, metrics: SimilarityMetric[], minGames = 20, limit = 10) =>
  p.similarity({ season: '2023-24', player, metrics, minGames, limit });

const row = (id: string, games: number, value: number | null) =>
  ({
    playerId: id,
    name: `Player ${id}`,
    teams: [{ abbreviation: 'BOS' }],
    gamesPlayed: games,
    value,
  }) as never;

describe('recorded similarity', () => {
  it('measures RMS z distance inside one cohort and orders neighbours by it', () => {
    // Synthetic cohort: a = (0, 0), b = (1, 1), c = (2, 0), d = (3, 3); e is below the
    // games minimum and f has no value for the second metric, so neither joins.
    const everyone = [
      row('1', 30, null),
      row('2', 30, null),
      row('3', 30, null),
      row('4', 30, null),
      row('5', 5, null),
      row('6', 30, null),
    ];
    const first = [
      row('1', 30, 0),
      row('2', 30, 1),
      row('3', 30, 2),
      row('4', 30, 3),
      row('5', 5, 9),
      row('6', 30, 1),
    ];
    const second = [
      row('1', 30, 0),
      row('2', 30, 1),
      row('3', 30, 0),
      row('4', 30, 3),
      row('5', 5, 9),
      row('6', 30, null),
    ];
    const built = buildSimilarity(
      everyone,
      [
        { metric: 'pointsPerGame', rows: first },
        { metric: 'reboundsPerGame', rows: second },
      ],
      '1',
      20,
      10,
    )!;
    expect(built.cohort).toBe(4);
    expect(built.excluded).toEqual({ belowMinimum: 1, missingMetric: 1 });
    // Population SD: first metric mean 1.5, sd √1.25; second mean 1, sd √1.5.
    const z1 = (v: number) => (v - 1.5) / Math.sqrt(1.25);
    const z2 = (v: number) => (v - 1) / Math.sqrt(1.5);
    const expected = (x: number, y: number) =>
      Math.sqrt(((z1(x) - z1(0)) ** 2 + (z2(y) - z2(0)) ** 2) / 2);
    expect(built.neighbours.map((n) => n.playerId)).toEqual(['2', '3', '4']);
    expect(built.neighbours[0]!.distance).toBeCloseTo(expected(1, 1), 12);
    expect(built.neighbours[1]!.distance).toBeCloseTo(expected(2, 0), 12);
    expect(built.neighbours[1]).toMatchObject({
      closest: 'reboundsPerGame',
      furthest: 'pointsPerGame',
      rank: 2,
    });
    expect(built.neighbours[1]!.differences[1]).toBe(0);
    // Unknown players are not invented.
    expect(buildSimilarity(everyone, [], '99', 20, 10)).toBeNull();
  });

  it('finds Jokić’s nearest seasons on real recorded rows', () => {
    const r = RecordedSimilarityResponseSchema.parse(
      find('203999', [
        'pointsPerGame',
        'reboundsPerGame',
        'assistsPerGame',
        'fieldGoalPercentage',
      ]),
    );
    expect(r.targetStatus).toBe('in-cohort');
    expect(r.target!.values).toEqual([26.4, 12.4, 9, 0.583]);
    expect(r.neighbours.slice(0, 2).map((n) => n.name)).toEqual([
      'Domantas Sabonis',
      'Giannis Antetokounmpo',
    ]);
    const distances = r.neighbours.map((n) => n.distance);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    // Every cohort member is accounted for: in, below the minimum, or missing a metric.
    const all = p.similarity({
      season: '2023-24',
      player: '203999',
      metrics: ['pointsPerGame', 'reboundsPerGame'],
      minGames: 1,
      limit: 25,
    })!;
    expect(all.excluded.belowMinimum).toBe(0);
    expect(r.cohort + r.excluded.belowMinimum + r.excluded.missingMetric).toBe(
      all.cohort + all.excluded.missingMetric,
    );
  });

  it('explains why a player outside the cohort has no neighbours', () => {
    const embiid = find('203954', ['pointsPerGame', 'reboundsPerGame'], 40)!;
    expect(embiid).toMatchObject({
      targetStatus: 'below-minimum',
      targetGames: 39,
      target: null,
      neighbours: [],
    });
    // Anunoby was traded: no combined FG% in the source, so no invented value.
    const anunoby = find('1628384', ['pointsPerGame', 'fieldGoalPercentage'])!;
    expect(anunoby.targetStatus).toBe('missing-metric');
  });

  it('validates the query strictly', async () => {
    const app = createApp(undefined, { recordedArchiveProvider: p });
    const ok = await request(app).get(
      '/api/recorded/similarity?player=203999&metrics=pointsPerGame,reboundsPerGame&limit=3',
    );
    expect(ok.status).toBe(200);
    expect(RecordedSimilarityResponseSchema.parse(ok.body).neighbours).toHaveLength(3);
    expect(
      (
        await request(app).get(
          '/api/recorded/similarity?player=1&metrics=pointsPerGame,reboundsPerGame',
        )
      ).status,
    ).toBe(404);
    for (const bad of [
      'player=203999&metrics=pointsPerGame',
      'player=203999&metrics=pointsPerGame,pointsPerGame',
      'player=203999&metrics=pointsPerGame,points',
      'player=203999&metrics=pointsPerGame,reboundsPerGame&limit=26',
      'player=203999&metrics=pointsPerGame,reboundsPerGame&minGames=0',
      'player=abc&metrics=pointsPerGame,reboundsPerGame',
      'player=203999&metrics=pointsPerGame,reboundsPerGame&extra=1',
      'player=203999&player=2544&metrics=pointsPerGame,reboundsPerGame',
    ])
      expect(
        (await request(app).get(`/api/recorded/similarity?${bad}`)).status,
        bad,
      ).toBe(400);
    expect(
      (
        await request(app).post(
          '/api/recorded/similarity?player=203999&metrics=pointsPerGame,reboundsPerGame',
        )
      ).status,
    ).toBe(405);
  });
});
