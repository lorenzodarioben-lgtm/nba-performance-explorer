import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  CohortQuerySchema,
  CohortResponseSchema,
} from '@nba-performance-explorer/contracts';

import { createApp } from '../../app.js';
import { analyzeCohort } from './cohort-core.js';

const query = {
  x: 'pointsPerGame' as const,
  y: 'assistsPerGame' as const,
  weightX: 1,
  weightY: 1,
  minGames: 10,
};
const inputs = [
  { playerId: '1', x: 10, y: 1 },
  { playerId: '2', x: 20, y: 2 },
  { playerId: '3', x: 30, y: 3 },
];

describe('selected-cohort analytics', () => {
  it('reproduces hand-calculated population z-scores, score and correlation', () => {
    const result = analyzeCohort(inputs, query);
    expect(result.rows[0]?.playerId).toBe('3');
    expect(result.rows[0]?.zX).toBeCloseTo(Math.sqrt(1.5));
    expect(result.rows[0]?.score).toBeCloseTo(2 * Math.sqrt(1.5), 5);
    expect(result.correlation).toBeCloseTo(1);
    expect(result.rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });
  it('orders negative scores numerically and respects negative/zero weights', () => {
    const result = analyzeCohort(inputs, { ...query, weightX: -1, weightY: 0 });
    expect(result.rows.map((r) => r.playerId)).toEqual(['1', '2', '3']);
    expect(result.rows[2]?.score).toBeLessThan(0);
  });
  it('keeps ties with competition ranks and handles zero variance', () => {
    const result = analyzeCohort(
      [
        { playerId: '1', x: 30, y: 2 },
        { playerId: '2', x: 30, y: 2 },
        { playerId: '3', x: 10, y: 2 },
      ],
      query,
    );
    expect(result.rows.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(result.rows.every((r) => r.zY === 0)).toBe(true);
    expect(result.correlation).toBeNull();
  });
  it('does not claim correlation from tiny or empty cohorts', () => {
    expect(analyzeCohort(inputs.slice(0, 2), query).correlation).toBeNull();
    expect(analyzeCohort([], query).rows).toEqual([]);
    expect(analyzeCohort([inputs[0]!], query).rows[0]?.score).toBe(0);
  });
  it('calculates negative correlation and preserves inputs', () => {
    const copy = [...inputs];
    expect(
      analyzeCohort(
        inputs.map((r) => ({ ...r, y: 4 - r.y })),
        query,
      ).correlation,
    ).toBeCloseTo(-1);
    expect(inputs).toEqual(copy);
  });
  it.each([
    { weightX: '6' },
    { weightX: 'NaN' },
    { weightY: '-5.01' },
    { minGames: '83' },
    { x: 'usage' },
    { players: '2544,2544' },
    { players: ['2544', '201939'] },
    { seasonType: 'playoffs' },
  ])('rejects malformed cohort query %j', (override) => {
    expect(
      CohortQuerySchema.safeParse({
        players: '2544,201939',
        seasons: '2023-24,2023-24',
        ...override,
      }).success,
    ).toBe(false);
  });
  it('returns a qualified fixture cohort, source label and bounded values', async () => {
    const response = await request(createApp()).get(
      '/api/analytics/cohort?players=2544,201939,1641705&seasons=2023-24,2023-24,2023-24&minGames=10',
    );
    expect(response.status).toBe(200);
    const data = CohortResponseSchema.parse(response.body);
    expect(data.analysis.sample).toBe(3);
    expect(data.provenance.source).toBe('fixture');
    expect(data.provenance.coverage).toContain('Not a league population');
  });
  it('excludes unsupported TS inputs instead of making approximate totals from averages', async () => {
    const response = await request(createApp()).get(
      '/api/analytics/cohort?players=2544,201939&seasons=2023-24,2023-24&x=trueShooting',
    );
    expect(response.status).toBe(200);
    expect(response.body.analysis.sample).toBe(0);
    expect(response.body.analysis.excluded).toHaveLength(2);
  });
  it('excludes missing seasons and keeps the selected sample explicit', async () => {
    const response = await request(createApp()).get(
      '/api/analytics/cohort?players=2544,201939&seasons=1999-00,2023-24&minGames=0',
    );
    expect(response.body.analysis.sample).toBe(1);
    expect(response.body.analysis.excluded[0].playerId).toBe('2544');
    expect(response.body.analysis.correlation).toBeNull();
  });
});
