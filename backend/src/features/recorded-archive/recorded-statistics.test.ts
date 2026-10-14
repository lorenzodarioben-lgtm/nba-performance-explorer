import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { RecordedAnalyticsQuerySchema } from '@nba-performance-explorer/contracts';
import { distribution, analyzeRecordedPairs } from './recorded-statistics.js';
import { RecordedArchiveProvider } from './recorded-provider.js';
import { createApp } from '../../app.js';
describe('recorded common-cohort statistics', () => {
  it('uses population SD, interpolated quantiles and conservative histogram boundaries', () => {
    const d = distribution([1, 2, 3, 4]);
    expect(d).toMatchObject({
      sample: 4,
      min: 1,
      max: 4,
      mean: 2.5,
      q25: 1.75,
      median: 2.5,
      q75: 3.25,
    });
    expect(d.standardDeviation).toBeCloseTo(Math.sqrt(1.25), 12);
    expect(d.bins.map((b) => b.count)).toEqual([2, 2]);
    expect(distribution([7, 7, 7])).toMatchObject({
      standardDeviation: 0,
      bins: [{ from: 7, to: 7, count: 3 }],
    });
    expect(distribution([])).toMatchObject({ sample: 0, mean: null, bins: [] });
    expect(() => distribution([Infinity])).toThrow();
  });
  it('retains tied score ranks, explicit negative direction and constant/small-sample correlation missingness', () => {
    const rows = [1, 2, 3].map((n) => ({
      playerId: String(n),
      name: `Fixture${n}`,
      gamesPlayed: 20,
      x: n,
      y: 4 - n,
    }));
    const equal = analyzeRecordedPairs(rows, 1, 1);
    expect(equal.rows.map((r) => r.rank)).toEqual([1, 1, 1]);
    expect(equal.correlation).toBeCloseTo(-1, 12);
    expect(equal.rows[0]?.xPercentile).toBeCloseTo(100 / 6, 10);
    expect(analyzeRecordedPairs(rows, -1, 1).rows[0]?.playerId).toBe('1');
    expect(analyzeRecordedPairs(rows.slice(0, 2), 1, 1).correlation).toBeNull();
    expect(
      analyzeRecordedPairs(
        rows.map((r) => ({ ...r, x: 1 })),
        1,
        1,
      ).correlation,
    ).toBeNull();
  });
  it('uses the genuine common denominator and withholds excluded targets rather than zero-valued dots', () => {
    const p = new RecordedArchiveProvider(),
      q = RecordedAnalyticsQuerySchema.parse({ target: '201939' }),
      data = p.analytics(q);
    expect(data.rows.length).toBeGreaterThan(100);
    expect(data.xDistribution.sample).toBe(data.rows.length);
    expect(data.yDistribution.bins.reduce((s, b) => s + b.count, 0)).toBe(
      data.rows.length,
    );
    expect(data.targetAvailable).toBe(true);
    expect(data.rows.find((r) => r.playerId === '201939')?.x).toBe(26.4);
    expect(p.analytics({ ...q, target: '999' }).targetAvailable).toBe(false);
    expect(data.correlation).not.toBeNull();
  });
  it('rejects identical/unsupported metrics, invalid weights and unsupported source year', async () => {
    const app = createApp(undefined, {
      recordedArchiveProvider: new RecordedArchiveProvider(),
    });
    for (const path of [
      '/api/recorded/analytics?x=pointsPerGame&y=pointsPerGame',
      '/api/recorded/analytics?weightX=6',
      '/api/recorded/analytics?x=trueShooting',
      '/api/recorded/analytics?season=2025-26',
    ])
      expect((await request(app).get(path)).status).toBe(400);
    const r = await request(app).get(
      '/api/recorded/analytics?minGames=60&target=201939',
    );
    expect(r.status).toBe(200);
    expect(r.body.provenance.source).toBe('wikipedia');
    expect(r.body.targetAvailable).toBe(true);
  });
});
