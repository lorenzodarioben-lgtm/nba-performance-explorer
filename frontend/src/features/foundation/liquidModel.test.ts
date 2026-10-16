import { describe, expect, it } from 'vitest';
import { LiquidModel } from './liquidModel';

describe('liquid surface physics', () => {
  it('injects more energy for a faster swipe over exactly the same path', () => {
    const slow = new LiquidModel(),
      fast = new LiquidModel();
    slow.disturb({ x: -65, y: 10 }, { x: 65, y: 10 }, 1.3);
    fast.disturb({ x: -65, y: 10 }, { x: 65, y: 10 }, 0.06);
    expect(fast.energy()).toBeGreaterThan(slow.energy() * 10);
    for (let i = 0; i < 12; i++) {
      slow.step();
      fast.step();
    }
    expect(
      Math.max(...fast.nodes.map((n) => Math.abs(n.displacement))),
    ).toBeGreaterThan(Math.max(...slow.nodes.map((n) => Math.abs(n.displacement))) * 2);
  });
  it('responds to direction and recovers its circular resting boundary', () => {
    const right = new LiquidModel(),
      left = new LiquidModel();
    right.disturb({ x: -65, y: 0 }, { x: 65, y: 0 }, 0.06);
    left.disturb({ x: 65, y: 0 }, { x: -65, y: 0 }, 0.06);
    right.step();
    left.step();
    expect(right.offset.x).toBeGreaterThan(0);
    expect(left.offset.x).toBeLessThan(0);
    for (let i = 0; i < 600; i++) right.step();
    expect(right.energy()).toBeLessThan(0.002);
    for (const p of right.boundary()) expect(Math.hypot(p.x, p.y)).toBeCloseTo(44, 2);
  });
  it('bounds repeated impulses and ignores invalid or distant samples', () => {
    const model = new LiquidModel();
    model.disturb({ x: 400, y: 400 }, { x: 450, y: 450 }, 0.01);
    model.disturb({ x: 0, y: 0 }, { x: Infinity, y: 0 }, 0.01);
    model.disturb({ x: 0, y: 0 }, { x: 50, y: 0 }, 0);
    expect(model.energy()).toBe(0);
    for (let i = 0; i < 300; i++) {
      model.disturb({ x: -65, y: 0 }, { x: 65, y: 0 }, 0.001);
      model.step();
      expect(
        model.nodes.every(
          (n) => Number.isFinite(n.displacement) && Math.abs(n.displacement) <= 13.2,
        ),
      ).toBe(true);
    }
    expect(model.nodes).toHaveLength(64);
    model.reset();
    expect(model.energy()).toBe(0);
  });
});
