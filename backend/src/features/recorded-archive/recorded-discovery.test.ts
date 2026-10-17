import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  RecordedDiscoveryQuerySchema,
  RecordedCalendarQuerySchema,
  RecordedAnalyticsQuerySchema,
  MonthDaySchema,
} from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { RecordedArchiveProvider } from './recorded-provider.js';
import { discoverRecorded } from './recorded-discovery.js';
import { analyzeRecordedPairs } from './recorded-statistics.js';
const provider = new RecordedArchiveProvider();
describe('recorded cohort discovery and calendar', () => {
  it('uses the genuine common qualified pool and auditable distance contributions', () => {
    const q = RecordedDiscoveryQuerySchema.parse({ target: '201939', limit: '10' }),
      d = provider.discovery(q);
    expect(d.eligiblePool).toHaveLength(363);
    expect(d.rows).toHaveLength(10);
    expect(d.targetRow?.x).toBe(26.4);
    expect(d.rows.some((r) => r.playerId === q.target)).toBe(false);
    for (const r of d.rows) {
      expect(r.distance).toBeCloseTo(
        Math.sqrt(r.xSquaredDifference! + r.ySquaredDifference!),
        6,
      );
      expect(r.xSquaredDifference).toBe((r.zX - d.targetRow!.zX) ** 2);
    }
    expect(d.totalMatches).toBe(362);
    expect(provider.discovery({ ...q, target: '999' })).toMatchObject({
      targetAvailable: false,
      targetRow: null,
      rows: [],
    });
  });
  it('keeps constant-axis ties and threshold selection explicit without imputing targets', () => {
    const base = provider.analytics(RecordedAnalyticsQuerySchema.parse({})),
      pairs = analyzeRecordedPairs(
        ['1', '2', '3'].map((playerId) => ({
          playerId,
          name: `Synthetic${playerId}`,
          gamesPlayed: 40,
          x: 1,
          y: 1,
        })),
        1,
        1,
      );
    const q = RecordedDiscoveryQuerySchema.parse({ target: '1' }),
      d = discoverRecorded({ ...base, ...pairs }, q);
    expect(d.rows.map((r) => r.distance)).toEqual([0, 0]);
    expect(d.rows.map((r) => r.rank)).toEqual([1, 1]);
    const criteria = provider.discovery(
      RecordedDiscoveryQuerySchema.parse({
        mode: 'thresholds',
        minGames: '40',
        maxX: '15',
        minY: '8',
        limit: '50',
      }),
    );
    expect(criteria.rows.length).toBeGreaterThan(0);
    expect(
      criteria.rows.every(
        (r) => r.gamesPlayed >= 40 && r.x <= 15 && r.y >= 8 && r.distance === null,
      ),
    ).toBe(true);
    expect(criteria.eligiblePool.length).toBeGreaterThan(criteria.totalMatches);
  });
  it('accepts real leap-day calendar labels and retains only paired-source final results', () => {
    expect(MonthDaySchema.safeParse('02-29').success).toBe(true);
    expect(MonthDaySchema.safeParse('02-30').success).toBe(false);
    expect(MonthDaySchema.safeParse('13-01').success).toBe(false);
    const d = provider.calendar(RecordedCalendarQuerySchema.parse({ day: '02-29' }));
    expect(d.games.length).toBeGreaterThan(0);
    expect(d.reconciledGames).toBe(1219);
    expect(d.quarantinedGameIds).toHaveLength(11);
    expect(
      d.games.every(
        (g) =>
          g.date === '2024-02-29' &&
          g.sources.length === 2 &&
          !d.quarantinedGameIds.includes(g.id),
      ),
    ).toBe(true);
    const first = d.games[0]!,
      filtered = provider.calendar(
        RecordedCalendarQuerySchema.parse({ day: '02-29', team: first.home.id }),
      );
    expect(
      filtered.games.every((g) => [g.home.id, g.away.id].includes(first.home.id)),
    ).toBe(true);
    expect(
      provider.calendar(RecordedCalendarQuerySchema.parse({ day: '07-04' })).games,
    ).toEqual([]);
  });
  it('rejects malformed/duplicate state and disabled data without a fixture fallback', async () => {
    const app = createApp(undefined, { recordedArchiveProvider: provider });
    for (const path of [
      '/discovery?x=pointsPerGame&y=pointsPerGame',
      '/discovery?maxX=-1',
      '/discovery?limit=51',
      '/discovery?weightX=1',
      '/calendar?day=02-30',
      '/calendar?day=02-29&day=04-01',
      '/calendar?day=04-01&season=2025-26',
    ])
      expect((await request(app).get(`/api/recorded${path}`)).status).toBe(400);
    expect(
      (await request(app).get('/api/recorded/calendar?day=04-01&team=nba:1')).status,
    ).toBe(404);
    expect((await request(createApp()).get('/api/recorded/discovery')).status).toBe(
      503,
    );
    expect((await request(app).post('/api/recorded/calendar')).status).toBe(405);
    expect(
      (await request(app).get('/api/recorded/discovery?target=201939')).body
        .targetAvailable,
    ).toBe(true);
  });
});
