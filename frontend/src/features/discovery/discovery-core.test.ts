import { describe, expect, it } from 'vitest';
import { nearestWithinCohort, readDiscoveryState } from './discovery-core';
const value = (playerId: string, zX: number, zY: number) => ({
  playerId,
  x: zX,
  y: zY,
  zX,
  zY,
  score: 0,
  rank: 1,
});
describe('selected-cohort similarity', () => {
  it('computes equal-axis distance and tied competition ranks without including target', () => {
    const rows = nearestWithinCohort(
      [value('1', 0, 0), value('2', 3, 4), value('3', -3, -4), value('4', 6, 8)],
      '1',
    );
    expect(rows.map((r) => [r.playerId, r.distance, r.rank])).toEqual([
      ['2', 5, 1],
      ['3', 5, 1],
      ['4', 10, 3],
    ]);
    expect(rows[0]?.xSquared).toBe(9);
    expect(rows[0]?.ySquared).toBe(16);
  });
  it('supports constant-axis inputs, absent targets and rejects corrupt cohorts', () => {
    expect(
      nearestWithinCohort([value('1', 0, 0), value('2', 0, 0)], '1')[0]?.distance,
    ).toBe(0);
    expect(nearestWithinCohort([value('1', 0, 0)], '2')).toEqual([]);
    expect(() =>
      nearestWithinCohort([value('1', 0, 0), value('2', NaN, 0)], '1'),
    ).toThrow();
    expect(() =>
      nearestWithinCohort([value('1', 0, 0), value('1', 1, 1)], '1'),
    ).toThrow();
  });
  it('rejects duplicate state, unselected targets, identical axes and unimplemented weights', () => {
    const base = 'players=1,2&seasons=2023-24,2023-24';
    expect(readDiscoveryState(new URLSearchParams(base + '&target=1')).valid).toBe(
      true,
    );
    for (const extra of [
      'target=3',
      'target=1&target=2',
      'x=pointsPerGame&y=pointsPerGame',
      'weightX=2',
      'redirect=evil',
    ])
      expect(readDiscoveryState(new URLSearchParams(base + '&' + extra)).valid).toBe(
        false,
      );
  });
});
