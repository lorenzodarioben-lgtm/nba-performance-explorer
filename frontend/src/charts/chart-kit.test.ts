import { describe, expect, it } from 'vitest';

import { COURT, courtLines, projectCourt } from './court';
import { linear, nearestIndex, niceDomain, niceTicks, segments } from './scale';

describe('chart scales', () => {
  it('maps and inverts a linear domain', () => {
    const scale = linear([0, 50], [200, 0]);
    expect(scale(25)).toBe(100);
    expect(scale.invert(100)).toBe(25);
  });

  it('produces round ticks that cover the domain', () => {
    expect(niceTicks(0, 30, 5)).toEqual([0, 5, 10, 15, 20, 25, 30]);
    expect(niceDomain(3.2, 27.4, 5)).toEqual([0, 30]);
  });

  it('never bridges a missing value', () => {
    const parts = segments([1, 2, null, 4, undefined, 6, 7], (value) => value);
    expect(parts).toEqual([[1, 2], [4], [6, 7]]);
  });

  it('finds the nearest category for a pointer position', () => {
    expect(nearestIndex([0, 50, 100], 70)).toBe(1);
    expect(nearestIndex([0, 50, 100], 80)).toBe(2);
  });
});

describe('court geometry', () => {
  it('places the corner three where the 22 ft line meets the 23.75 ft arc', () => {
    expect(COURT.arcBreakY).toBeCloseTo(89.47, 1);
  });

  it('projects recorded coordinates without altering them', () => {
    const top = projectCourt('top');
    expect(top.point(0, 0)).toEqual([250, 52.5]);
    expect(top.point(-250, -52.5)).toEqual([0, 0]);
    const bottom = projectCourt('bottom', 300);
    expect(bottom.point(0, 300)).toEqual([250, 0]);
    expect(bottom.viewBox).toBe('0 0 500 352.5');
  });

  it('draws every line kind for a full half court', () => {
    const kinds = new Set(courtLines(projectCourt('top')).map((line) => line.kind));
    expect([...kinds].sort()).toEqual(
      ['arc', 'backboard', 'boundary', 'dashed', 'hash', 'lane', 'rim'].sort(),
    );
  });
});
