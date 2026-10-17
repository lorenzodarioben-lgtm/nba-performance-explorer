import { describe, expect, it } from 'vitest';
import type { SeasonTotals } from '@nba-performance-explorer/contracts';
import { shootingProfile } from './shooting-core';
const totals: SeasonTotals = {
  playerId: '1',
  season: '2023-24',
  gamesPlayed: 1,
  minutes: 30,
  points: 32,
  rebounds: 1,
  assists: 1,
  turnovers: 1,
  fieldGoalsMade: 10,
  fieldGoalsAttempted: 20,
  threesMade: 4,
  threesAttempted: 10,
  freeThrowsMade: 8,
  freeThrowsAttempted: 10,
};
describe('raw shooting count integrity', () => {
  it('subtracts three-pointers, reconciles points and keeps FTA outside FGA shares', () => {
    const p = shootingProfile(totals, 5);
    expect(p.rows.map((r) => [r.made, r.attempted, r.points, r.percentage])).toEqual([
      [6, 10, 12, 0.6],
      [4, 10, 12, 0.4],
      [8, 10, 8, 0.8],
    ]);
    expect(p.rows[0]?.pointShare).toBe(12 / 32);
    expect(p.rows[0]?.fieldGoalAttemptShare).toBe(0.5);
    expect(p.rows[2]?.fieldGoalAttemptShare).toBeNull();
    expect(p.freeThrowRate).toBe(0.5);
  });
  it('suppresses low-sample ratios but retains counts; missing and zero denominators stay unavailable', () => {
    expect(shootingProfile(totals, 11).rows[0]).toMatchObject({
      made: 6,
      attempted: 10,
      percentage: null,
      qualification: 'Below selected attempt minimum',
    });
    const missing = shootingProfile({ ...totals, threesAttempted: null }, 1);
    expect(missing.rows[0]?.attempted).toBeNull();
    expect(missing.rows[1]?.percentage).toBeNull();
    const zero = shootingProfile(
      {
        ...totals,
        fieldGoalsMade: 0,
        fieldGoalsAttempted: 0,
        threesMade: 0,
        threesAttempted: 0,
        freeThrowsMade: 0,
        freeThrowsAttempted: 0,
        points: 0,
      },
      1,
    );
    expect(zero.rows.every((r) => r.percentage === null && r.pointShare === null)).toBe(
      true,
    );
    expect(zero.freeThrowRate).toBeNull();
  });
  it('allows actual free-throw rates above1 and rejects inconsistent two-point/scoring math', () => {
    const ft = shootingProfile(
      {
        ...totals,
        fieldGoalsMade: 1,
        fieldGoalsAttempted: 2,
        threesMade: 0,
        threesAttempted: 0,
        freeThrowsMade: 6,
        freeThrowsAttempted: 6,
        points: 8,
      },
      1,
    );
    expect(ft.freeThrowRate).toBe(3);
    expect(() =>
      shootingProfile(
        {
          ...totals,
          fieldGoalsMade: 10,
          fieldGoalsAttempted: 11,
          threesMade: 2,
          threesAttempted: 5,
        },
        1,
      ),
    ).toThrow();
    expect(() => shootingProfile({ ...totals, points: 33 }, 1)).toThrow();
  });
});
