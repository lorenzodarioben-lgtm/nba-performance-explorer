import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  ArchiveRankingResponseSchema,
  WorkbenchResponseSchema,
} from '@nba-performance-explorer/contracts';
import { RecordedArchiveProvider } from './recorded-provider.js';
import { createApp } from '../../app.js';

const p = new RecordedArchiveProvider();
const base = {
  season: '2023-24' as const,
  scope: 'regular-season' as const,
  metric: 'reboundsPerGame' as const,
  minGames: 20,
  page: 1,
  pageSize: 50,
};
const everyRow = (q: Parameters<RecordedArchiveProvider['rank']>[0]) => {
  const first = p.rank(q);
  const rows = [...first.rows];
  for (let page = 2; (page - 1) * 50 < first.total; page++)
    rows.push(...p.rank({ ...q, page }).rows);
  return { first, rows };
};

describe('source-listed position filters', () => {
  it('reads each player’s position from their own team page and keeps league ranks', () => {
    const all = everyRow(base);
    const listed = new Map(all.rows.map((r) => [r.playerId, r.positions ?? []]));
    // Every listed position is one of the five labels the team pages use.
    for (const positions of listed.values())
      for (const pos of positions) expect(['G', 'F', 'C', 'G/F', 'F/C']).toContain(pos);
    for (const family of ['G', 'F', 'C'] as const) {
      const filtered = everyRow({ ...base, position: family });
      const expected = all.rows.filter((r) =>
        (r.positions ?? []).some((pos) => pos.includes(family)),
      );
      expect(filtered.rows.map((r) => r.playerId)).toEqual(
        expected.map((r) => r.playerId),
      );
      // A filter never re-ranks: ranks and percentiles are the full cohort's.
      expect(filtered.rows.map((r) => r.rank)).toEqual(expected.map((r) => r.rank));
      expect(filtered.first.qualifiedPopulation).toBe(all.first.qualifiedPopulation);
    }
    // Hybrid labels count for both families; unlisted players are in neither.
    const sabonis = all.rows.find((r) => r.name === 'Domantas Sabonis')!;
    expect(sabonis.positions).toEqual(['F/C']);
    const families = (id: string) =>
      (['G', 'F', 'C'] as const).filter((f) =>
        everyRow({ ...base, position: f }).rows.some((r) => r.playerId === id),
      );
    expect(families(sabonis.playerId)).toEqual(['F', 'C']);
    const unlisted = all.rows.filter((r) => !r.positions?.length);
    expect(unlisted.length).toBe(all.first.positionUnlistedPlayers);
    if (unlisted[0]) expect(families(unlisted[0].playerId)).toEqual([]);
  });

  it('builds workbench position cohorts with exclusions counted inside the cohort', () => {
    const all = p.workbench({
      season: '2023-24',
      entity: 'players',
      view: 'distribution',
      metric: 'fieldGoalPercentage',
      order: 'desc',
    });
    const centers = p.workbench({
      season: '2023-24',
      entity: 'players',
      view: 'distribution',
      metric: 'fieldGoalPercentage',
      order: 'desc',
      position: 'C',
    });
    expect(centers.cohort).toBe(
      'Recorded centers (listed C or F/C) with 20+ games, 2023-24 regular season',
    );
    expect(centers.summary.n).toBeLessThan(all.summary.n);
    const reasons = Object.fromEntries(
      centers.excluded.map((e) => [e.reason, e.count]),
    );
    const allReasons = Object.fromEntries(all.excluded.map((e) => [e.reason, e.count]));
    expect(reasons['No roster position listed on the team page']).toBeGreaterThan(0);
    // Counted within the family, so fewer than league-wide.
    expect(reasons['No value for this metric in the source']).toBeLessThan(
      allReasons['No value for this metric in the source']!,
    );
    // The cohort's values are exactly the centre rows from the league workbench.
    const leagueCenters = everyRow({
      ...base,
      metric: 'fieldGoalPercentage',
      position: 'C',
    });
    expect(new Set(centers.rows.map((r) => r.id))).toEqual(
      new Set(leagueCenters.rows.map((r) => r.playerId)),
    );
  });

  it('validates the position parameter on both endpoints', async () => {
    const app = createApp(undefined, { recordedArchiveProvider: p });
    const ok = await request(app).get(
      '/api/recorded/leaders?position=C&metric=blocksPerGame',
    );
    expect(ok.status).toBe(200);
    expect(ArchiveRankingResponseSchema.parse(ok.body).query.position).toBe('C');
    const wb = await request(app).get('/api/recorded/workbench?position=G');
    expect(WorkbenchResponseSchema.parse(wb.body).cohort).toMatch(/^Recorded guards/);
    for (const bad of [
      '/api/recorded/leaders?position=PG',
      '/api/recorded/leaders?position=G/F',
      '/api/recorded/workbench?position=X',
      '/api/recorded/workbench?entity=teams&metric=winPercentage&position=G',
    ])
      expect((await request(app).get(bad)).status, bad).toBe(400);
  });
});
