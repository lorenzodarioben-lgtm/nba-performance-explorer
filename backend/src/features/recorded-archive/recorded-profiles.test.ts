import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { RecordedProfilesQuerySchema } from '@nba-performance-explorer/contracts';
import { normalizeRecordedProfiles } from './recorded-profiles.js';
import { RecordedArchiveProvider } from './recorded-provider.js';
import { createApp } from '../../app.js';
const rows = (values: number[]) =>
  values.map((value, i) => ({
    playerId: String(i + 1),
    name: `Fixture ${i + 1}`,
    gamesPlayed: 20,
    value,
  }));
describe('common-cohort percentile profiles', () => {
  it('uses the common intersection for ties, ranks, constant axes and population SD', () => {
    const columns = [
      { metric: 'pointsPerGame' as const, rows: rows([1, 1, 3, 9]) },
      { metric: 'reboundsPerGame' as const, rows: rows([3, 2, 1]) },
      { metric: 'assistsPerGame' as const, rows: rows([7, 7, 7]) },
    ];
    const r = normalizeRecordedProfiles(columns, ['1', '3', '4', '999']);
    expect(r.population).toBe(3);
    expect(r.metricPopulations[0]?.qualified).toBe(4);
    expect(r.metricPopulations[0]?.mean).toBeCloseTo(5 / 3, 12);
    expect(r.metricPopulations[0]?.standardDeviation).toBeCloseTo(Math.sqrt(8 / 9), 12);
    expect(r.profiles[0]?.categories[0]).toMatchObject({ rank: 2, value: 1 });
    expect(r.profiles[0]?.categories[0]?.percentile).toBeCloseTo(100 / 3, 12);
    expect(r.profiles[1]?.categories[0]?.percentile).toBeCloseTo(250 / 3, 12);
    expect(r.profiles[0]?.categories[2]).toMatchObject({
      percentile: 50,
      zScore: 0,
      rank: 1,
    });
    expect(
      r.profiles
        .slice(2)
        .every((p) => !p.available && !p.categories.length && p.gamesPlayed === null),
    ).toBe(true);
    expect(normalizeRecordedProfiles(columns, ['3']).profiles[0]).toEqual(
      r.profiles[1],
    );
  });
  it('preserves absent denominators and emits no fabricated normalized categories', () => {
    const r = normalizeRecordedProfiles(
      [
        { metric: 'pointsPerGame', rows: rows([1]) },
        { metric: 'reboundsPerGame', rows: [] },
        { metric: 'assistsPerGame', rows: rows([2]) },
      ],
      ['1'],
    );
    expect(r.population).toBe(0);
    expect(
      r.metricPopulations.every((m) => m.mean === null && m.standardDeviation === null),
    ).toBe(true);
    expect(r.profiles[0]).toMatchObject({
      available: false,
      categories: [],
      name: null,
    });
  });
  it('normalizes genuine five-category profiles without changing the cohort for chosen players', () => {
    const p = new RecordedArchiveProvider(),
      q = RecordedProfilesQuerySchema.parse({ players: '201939,2544,999' }),
      r = p.profiles(q);
    expect(r.population).toBeGreaterThan(100);
    expect(
      r.profiles[0]?.categories.find((c) => c.metric === 'pointsPerGame')?.value,
    ).toBe(26.4);
    expect(r.profiles[0]?.available).toBe(true);
    expect(r.profiles[2]?.categories).toEqual([]);
    expect(p.profiles({ ...q, players: ['201939'] }).population).toBe(r.population);
    const playoffs = p.profiles({ ...q, scope: 'playoffs' });
    expect(playoffs.population).toBe(8);
    expect(playoffs.profiles[0]?.available).toBe(false);
    expect(p.profiles({ ...q, minGames: 150 }).population).toBe(0);
  });
  it('enforces strict cardinality, scope, unique categories and explicit unavailable source', async () => {
    const app = createApp(undefined, {
      recordedArchiveProvider: new RecordedArchiveProvider(),
    });
    for (const qs of [
      'players=1,1',
      'players=1,2,3,4,5',
      'metrics=pointsPerGame,reboundsPerGame',
      'metrics=pointsPerGame,pointsPerGame,assistsPerGame',
      'metrics=pointsPerGame,reboundsPerGame,trueShooting',
      'season=2025-26',
      'players=201939&players=2544',
    ])
      expect((await request(app).get('/api/recorded/profiles?' + qs)).status).toBe(400);
    expect(
      (await request(app).get('/api/recorded/profiles?players=201939,999')).body
        .profiles[1].available,
    ).toBe(false);
    expect((await request(createApp()).get('/api/recorded/profiles')).status).toBe(503);
    expect((await request(app).post('/api/recorded/profiles')).status).toBe(405);
  });
});
