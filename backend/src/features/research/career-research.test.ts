import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import {
  CareerResearchResponseSchema,
  type SeasonTotals,
} from '@nba-performance-explorer/contracts';
import { createApp } from '../../app.js';
import { fixturePlayerProvider } from '../players/fixture-player-provider.js';
import { providerUnavailable } from '../players/provider-error.js';
import { analyzeCareer } from './career-service.js';

const record = (
  season: string,
  overrides: Partial<SeasonTotals> = {},
): SeasonTotals => ({
  playerId: '2544',
  season,
  gamesPlayed: 40,
  minutes: 1200,
  points: 800,
  rebounds: 200,
  assists: 160,
  turnovers: 80,
  fieldGoalsMade: 300,
  fieldGoalsAttempted: 600,
  threesMade: 100,
  threesAttempted: 240,
  freeThrowsMade: 100,
  freeThrowsAttempted: 120,
  ...overrides,
});
describe('reported career and qualified peak', () => {
  it('sums counts, weights attempts, sorts chronology and retains exact peak ties', () => {
    const analysis = analyzeCareer(
      [
        record('2023-24'),
        record('2021-22', {
          gamesPlayed: 20,
          points: 400,
          fieldGoalsMade: 100,
          fieldGoalsAttempted: 200,
          threesMade: 0,
          threesAttempted: 0,
        }),
      ],
      '2544',
      'pointsPerGame',
      20,
    );
    expect(analysis.aggregate).toMatchObject({
      seasonsReported: 2,
      gamesPlayed: 60,
      points: 1200,
    });
    expect(analysis.aggregate?.metrics.effectiveFieldGoal).toBe(450 / 800);
    expect(analysis.seasons.map((s) => s.totals.season)).toEqual([
      '2021-22',
      '2023-24',
    ]);
    expect(analysis.peak).toMatchObject({
      value: 20,
      qualifiedSeasons: 2,
      excludedSeasons: 0,
      seasons: ['2021-22', '2023-24'],
    });
    expect(analysis.milestones[0]).toMatchObject({
      metric: 'points',
      threshold: 1000,
      reportedTotal: 1200,
      reached: true,
      reachedByReportedSeason: '2023-24',
    });
  });
  it('excludes low samples and missing denominators without imputing counts', () => {
    const rows = [
      record('2023-24', { gamesPlayed: 1, points: 50 }),
      record('2022-23', { points: null, fieldGoalsAttempted: null }),
    ];
    const result = analyzeCareer(rows, '2544', 'trueShooting', 20);
    expect(result.aggregate?.points).toBeNull();
    expect(result.aggregate?.metrics.trueShooting).toBeNull();
    expect(result.milestones[0]).toMatchObject({
      reached: null,
      reachedByReportedSeason: null,
    });
    expect(result.peak).toMatchObject({
      value: null,
      seasons: [],
      qualifiedSeasons: 0,
      excludedSeasons: 2,
    });
  });
  it('returns a valid zero-game/empty state and refuses duplicate or corrupt scopes', () => {
    expect(analyzeCareer([], '2544', 'pointsPerGame', 20).aggregate).toBeNull();
    expect(
      analyzeCareer([record('2023-24', { gamesPlayed: 0 })], '2544', 'pointsPerGame', 1)
        .peak.seasons,
    ).toEqual([]);
    for (const rows of [
      [record('2023-24'), record('2023-24')],
      [record('2023-24', { playerId: '1' })],
      [record('2023-24', { points: -1 })],
      Array.from({ length: 101 }, () => record('2023-24')),
    ]) {
      expect(() => analyzeCareer(rows, '2544', 'pointsPerGame', 20)).toThrow();
    }
  });
  it('serves schema-validated sourced records with retrieval time and no fabricated fixture fallback', async () => {
    const getCareerTotals = vi.fn().mockResolvedValue({
      records: [record('2023-24')],
      retrievedAt: '2026-10-13T16:00:00.000Z',
    });
    const app = createApp(fixturePlayerProvider, {
      playerSource: 'fixture',
      totalsProvider: { getSeasonTotals: vi.fn(), getCareerTotals },
    });
    const response = await request(app).get(
      '/api/players/2544/career?metric=pointsPer36&minGames=40',
    );
    expect(response.status).toBe(200);
    expect(CareerResearchResponseSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.peak.value).toBe(24);
    expect(response.body.provenance.retrievedAt).toBe('2026-10-13T16:00:00.000Z');
    expect(response.body.provenance.warnings.join(' ')).toContain('DEMO FIXTURES');
    expect(response.body.provenance.warnings.join(' ')).not.toContain(
      'retrieval time is unavailable',
    );
    const disabled = await request(createApp()).get('/api/players/2544/career');
    expect(disabled.body.status).toBe('unsupported');
    expect(disabled.body.aggregate).toBeNull();
  });
  it('validates bounded criteria before upstream access; preserves missing/error states', async () => {
    const getCareerTotals = vi
      .fn()
      .mockResolvedValue({ records: [], retrievedAt: '2026-10-13T16:00:00.000Z' });
    const app = createApp(fixturePlayerProvider, {
      totalsProvider: { getSeasonTotals: vi.fn(), getCareerTotals },
    });
    for (const path of [
      '/api/players/abc/career',
      '/api/players/2544/career?minGames=0',
      '/api/players/2544/career?minGames=83',
      '/api/players/2544/career?metric=bogus',
      '/api/players/2544/career?other=x',
      '/api/players/2544/career?metric=pointsPerGame&metric=pointsPer36',
    ]) {
      expect((await request(app).get(path)).status).toBe(400);
    }
    expect(getCareerTotals).not.toHaveBeenCalled();
    expect((await request(app).get('/api/players/999999/career')).status).toBe(404);
    expect((await request(app).get('/api/players/2544/career')).body.status).toBe(
      'records-unavailable',
    );
    getCareerTotals.mockRejectedValueOnce(providerUnavailable());
    expect((await request(app).get('/api/players/2544/career')).status).toBe(503);
    getCareerTotals.mockResolvedValueOnce({
      records: [record('2023-24', { playerId: '1' })],
      retrievedAt: '2026-10-13T16:00:00.000Z',
    });
    expect((await request(app).get('/api/players/2544/career')).status).toBe(502);
    expect((await request(app).post('/api/players/2544/career')).status).toBe(405);
  });
});
describe('bounded career comparison', () => {
  it('preserves transient source failures and unknown players as distinct slots', async () => {
    const getCareerTotals = vi.fn(async (id: string) => {
      if (id === '201939') throw providerUnavailable();
      return { records: [record('2023-24')], retrievedAt: '2026-10-13T16:00:00.000Z' };
    });
    const app = createApp(fixturePlayerProvider, {
      totalsProvider: { getSeasonTotals: vi.fn(), getCareerTotals },
    });
    const response = await request(app).get(
      '/api/analytics/careers?players=2544,201939,999999',
    );
    expect(response.status).toBe(200);
    expect(response.body.rows.map((r: { status: string }) => r.status)).toEqual([
      'available',
      'source-unavailable',
      'player-unavailable',
    ]);
    expect(response.body.rows[1].data).toBeNull();
    for (const suffix of [
      'players=2544,2544',
      'players=2544',
      'players=2544,201939&metric=bogus',
      'players=2544,201939&minGames=83',
      'players=2544,201939&extra=1',
    ])
      expect((await request(app).get(`/api/analytics/careers?${suffix}`)).status).toBe(
        400,
      );
  });
});
