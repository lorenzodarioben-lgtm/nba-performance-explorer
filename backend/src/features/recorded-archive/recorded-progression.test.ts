import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  RecordedProgressionQuerySchema,
  type VerifiedRecordedGame,
} from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { RecordedArchiveProvider } from './recorded-provider.js';
import { observedProgression } from './recorded-progression.js';
describe('observed calendar-date record progression', () => {
  it('retains all daily high ties without inventing within-day order and leaves absent dates empty', () => {
    const p = new RecordedArchiveProvider(),
      g = p.calendar({ season: '2023-24', day: '02-29' }).games[0]!;
    const games: VerifiedRecordedGame[] = [
      { ...g, id: 'nba:0022300001', date: '2024-02-01', homeScore: 100, awayScore: 90 },
      { ...g, id: 'nba:0022300002', date: '2024-02-01', homeScore: 110, awayScore: 90 },
      { ...g, id: 'nba:0022300003', date: '2024-02-01', homeScore: 110, awayScore: 90 },
      { ...g, id: 'nba:0022300004', date: '2024-02-03', homeScore: 110, awayScore: 80 },
    ];
    const d = observedProgression(
      games,
      RecordedProgressionQuerySchema.parse({
        metric: 'teamPoints',
        minDailyGames: '2',
      }),
      '2024-02-01',
      '2024-02-03',
    );
    expect(d.progression).toHaveLength(2);
    expect(d.progression[0]).toMatchObject({
      value: 110,
      previousHigh: null,
      kind: 'new-high',
    });
    expect(d.progression[0]?.games).toHaveLength(2);
    expect(d.progression[1]).toMatchObject({
      value: 110,
      previousHigh: 110,
      kind: 'ties-current-high',
    });
    expect(d.series[1]).toMatchObject({ games: 0, meanValue: null, highValue: null });
    expect(d.series[2]).toMatchObject({ games: 1, meanValue: null, highValue: 110 });
    expect(d.series[0]?.meanValue).toBeCloseTo(320 / 3, 10);
  });
  it('uses only source-agreed games, resets window records and preserves source/sample boundaries', () => {
    const p = new RecordedArchiveProvider(),
      q = RecordedProgressionQuerySchema.parse({ metric: 'combinedPoints' }),
      d = p.progression(q);
    expect(d.matchingGames).toBe(1219);
    expect(d.quarantinedGameIds).toHaveLength(11);
    expect(d.series.reduce((s, x) => s + x.games, 0)).toBe(1219);
    expect(d.series.some((x) => x.games === 0 && x.meanValue === null)).toBe(true);
    expect(
      d.progression.every((r, i) => i === 0 || r.value >= d.progression[i - 1]!.value),
    ).toBe(true);
    expect(d.progression.at(-1)?.value).toBe(
      p.records({ metric: 'combinedPoints' }).value,
    );
    const window = p.progression({ ...q, from: '2024-02-01', to: '2024-02-29' });
    expect(window.series).toHaveLength(29);
    expect(window.progression[0]?.previousHigh).toBeNull();
  });
  it('rejects unsupported windows/queries and source-disabled routes', async () => {
    const app = createApp(undefined, {
      recordedArchiveProvider: new RecordedArchiveProvider(),
    });
    for (const q of [
      'from=2025-01-01',
      'from=2024-03-01&to=2024-02-01',
      'minDailyGames=16',
      'metric=netRating',
      'to=2024-02-30',
    ])
      expect((await request(app).get('/api/recorded/progression?' + q)).status).toBe(
        400,
      );
    expect(
      (await request(app).get('/api/recorded/progression?team=nba:1')).status,
    ).toBe(404);
    expect((await request(createApp()).get('/api/recorded/progression')).status).toBe(
      503,
    );
    expect(
      (await request(app).get('/api/recorded/progression?metric=finalMargin')).status,
    ).toBe(200);
  });
});
