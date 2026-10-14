import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import {
  CapabilityResponseSchema,
  ComparisonResponseSchema,
  PlayerInsightsResponseSchema,
} from '@nba-performance-explorer/contracts';

import { createApp } from '../../app.js';
import { fixturePlayerProvider } from '../players/fixture-player-provider.js';
import { providerTimeout, providerUnavailable } from '../players/provider-error.js';
import { RecordedArchiveProvider } from '../recorded-archive/recorded-provider.js';
import { createLineupStudyProvider } from '../lineup-study/lineup-study-provider.js';

describe('research endpoints', () => {
  it('reports configured genuine recorded and research lineup capabilities separately from unsupported official feeds', async () => {
    const app = createApp(undefined, {
      recordedArchiveProvider: new RecordedArchiveProvider(),
      lineupStudyProvider: await createLineupStudyProvider(),
    });
    const response = await request(app).get('/api/data-sources/status');
    const data = CapabilityResponseSchema.parse(response.body);
    expect(data.hostVerified).toBe(false);
    expect(
      data.capabilities.find((c) => c.id === 'recorded-historical-research')?.status,
    ).toBe('available');
    expect(
      data.capabilities.find((c) => c.id === 'research-lineup-reports')?.reason,
    ).toContain('researcher-reconstructed');
    expect(data.capabilities.find((c) => c.id === 'league-analytics')?.status).toBe(
      'blocked',
    );
  });
  it('rejects mismatched player and season scope before displaying another record', async () => {
    const provider = Object.create(
      fixturePlayerProvider,
    ) as typeof fixturePlayerProvider;
    provider.getPlayerById = vi
      .fn()
      .mockResolvedValue({ id: '201939', fullName: 'Wrong source profile' });
    expect(
      (await request(createApp(provider)).get('/api/players/2544/insights')).status,
    ).toBe(502);
    provider.getPlayerById =
      fixturePlayerProvider.getPlayerById.bind(fixturePlayerProvider);
    const stats = await fixturePlayerProvider.getPlayerSeasonStats('2544', '2023-24');
    provider.getPlayerSeasonStats = vi
      .fn()
      .mockResolvedValue({ ...stats, season: '2022-23' });
    expect(
      (
        await request(createApp(provider)).get(
          '/api/players/2544/insights?season=2023-24',
        )
      ).status,
    ).toBe(502);
  });
  it('warns when the filtered rolling cohort is smaller than its window', async () => {
    const response = await request(createApp()).get(
      '/api/players/2544/insights?season=2023-24&window=20&opponent=BOS',
    );
    expect(response.body.recent.sample).toBeLessThan(20);
    expect(response.body.provenance.warnings.join(' ')).toContain(
      'Fewer matching games',
    );
  });
  it('returns bounded typed insights and explicit demo/coverage warnings', async () => {
    const response = await request(createApp()).get(
      '/api/players/2544/insights?season=2023-24&window=5&pageSize=2',
    );
    expect(response.status).toBe(200);
    const data = PlayerInsightsResponseSchema.parse(response.body);
    expect(data.games).toHaveLength(2);
    expect(data.summary.sample).toBeGreaterThan(2);
    expect(data.provenance.source).toBe('fixture');
    expect(data.provenance.retrievedAt).toBeNull();
    expect(data.provenance.isLive).toBe(false);
    expect(data.provenance.warnings.join(' ')).toContain('DEMO FIXTURES');
    expect(data.provenance.warnings.join(' ')).toContain('season summary reports');
  });
  it('uses newest observed season when none is requested', async () => {
    const response = await request(createApp()).get('/api/players/2544/insights');
    expect(response.body.season).toBe('2023-24');
  });
  it('returns honest missing-season and empty-game states', async () => {
    const missing = await request(createApp()).get(
      '/api/players/2544/insights?season=2025-26',
    );
    expect(missing.status).toBe(200);
    expect(missing.body.stats).toBeNull();
    expect(missing.body.summary.points).toBeNull();
    const empty = await request(createApp()).get(
      '/api/players/2544/insights?season=2018-19',
    );
    expect(empty.body.stats).not.toBeNull();
    expect(empty.body.games).toEqual([]);
  });
  it('supports a known profile with no career seasons', async () => {
    const provider = {
      ...fixturePlayerProvider,
      getPlayerById: fixturePlayerProvider.getPlayerById.bind(fixturePlayerProvider),
      listPlayerSeasons: vi.fn().mockResolvedValue([]),
      getPlayerSeasonStats: vi.fn(),
      listPlayerGames: vi.fn(),
      listPlayerSeasonStats: vi.fn(),
      searchPlayers: vi.fn(),
    };
    const response = await request(createApp(provider)).get(
      '/api/players/2544/insights',
    );
    expect(response.status).toBe(200);
    expect(response.body.season).toBeNull();
    expect(provider.getPlayerSeasonStats).not.toHaveBeenCalled();
  });
  it('returns 404 for an unknown player', async () => {
    expect(
      (await request(createApp()).get('/api/players/999999/insights')).status,
    ).toBe(404);
  });
  it.each([
    '/api/players/not-an-id/insights',
    '/api/players/2544/insights?window=0',
    '/api/players/2544/insights?window=5&window=10',
    '/api/players/2544/insights?to=2024-02-30',
    '/api/analytics/compare?players=2544,2544&seasons=2023-24,2023-24',
    '/api/analytics/compare?players=2544,201939&seasons=2023-24',
    '/api/analytics/compare?players=2544&seasons=2023-24',
    '/api/analytics/compare?players=2544,201939&seasons=2023-24,2023-24&url=https://example.com',
  ])('rejects malformed/batched query %s', async (path) => {
    expect((await request(createApp()).get(path)).status).toBe(400);
  });
  it('returns comparison values and per-slot missingness', async () => {
    const response = await request(createApp()).get(
      '/api/analytics/compare?players=2544,201939,1641705&seasons=2023-24,1999-00,2023-24',
    );
    expect(response.status).toBe(200);
    const data = ComparisonResponseSchema.parse(response.body);
    expect(data.rows.map((r) => r.status)).toEqual([
      'available',
      'season-unavailable',
      'available',
    ]);
    expect(data.rows[1]?.stats).toBeNull();
  });
  it('sanitizes source outages without fixture fallback', async () => {
    const provider = Object.create(
      fixturePlayerProvider,
    ) as typeof fixturePlayerProvider;
    provider.getPlayerById = vi
      .fn()
      .mockRejectedValue(providerTimeout('private response detail'));
    const response = await request(
      createApp(provider, { playerSource: 'nba-stats' }),
    ).get('/api/players/2544/insights');
    expect(response.status).toBe(504);
    expect(JSON.stringify(response.body)).not.toContain('private response');
    const comparison = await request(
      createApp(provider, { playerSource: 'nba-stats' }),
    ).get('/api/analytics/compare?players=2544,201939&seasons=2023-24,2023-24');
    expect(
      comparison.body.rows.every(
        (r: { status: string; stats: unknown }) =>
          r.status === 'source-unavailable' && r.stats === null,
      ),
    ).toBe(true);
    expect(comparison.body.provenance.source).toBe('nba-stats');
  });
  it('rejects corrupt duplicate records as a sanitized source error', async () => {
    const provider = Object.create(
      fixturePlayerProvider,
    ) as typeof fixturePlayerProvider;
    const games = await fixturePlayerProvider.listPlayerGames('2544', '2023-24');
    provider.listPlayerGames = vi.fn().mockResolvedValue([...games, games[0]]);
    const response = await request(createApp(provider)).get(
      '/api/players/2544/insights?season=2023-24',
    );
    expect(response.status).toBe(502);
  });
  it('propagates unavailable upstream without retrying', async () => {
    const provider = Object.create(
      fixturePlayerProvider,
    ) as typeof fixturePlayerProvider;
    provider.getPlayerById = vi.fn().mockRejectedValue(providerUnavailable());
    expect(
      (await request(createApp(provider)).get('/api/players/2544/insights')).status,
    ).toBe(503);
    expect(provider.getPlayerById).toHaveBeenCalledTimes(1);
  });
  it('reports configuration and blocked capabilities without health claims', async () => {
    const response = await request(createApp()).get('/api/data-sources/status');
    const data = CapabilityResponseSchema.parse(response.body);
    expect(data.hostVerified).toBe(false);
    expect(
      data.capabilities.find((c) => c.id === 'shots-lineups-history')?.status,
    ).toBe('blocked');
    expect((await request(createApp()).post('/api/data-sources/status')).status).toBe(
      405,
    );
  });
});
