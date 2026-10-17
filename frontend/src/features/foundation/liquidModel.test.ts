import { describe, expect, it } from 'vitest';
import { LiquidModel, MAX_DROPLETS } from './liquidModel';

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
  it('keeps gentle and moderate crossings cohesive, with no droplets from near misses', () => {
    for (const seconds of [1.3, 0.3]) {
      const model = new LiquidModel();
      model.disturb({ x: -65, y: 0 }, { x: 65, y: 0 }, seconds);
      for (let i = 0; i < 120; i++) model.step();
      expect(model.activeDroplets).toBe(0);
    }
    const near = new LiquidModel();
    near.disturb({ x: -100, y: 55 }, { x: 100, y: 55 }, 0.02);
    expect(near.activeDroplets).toBe(0);
  });
  it('separates differently sized boundary droplets on a sparse fast crossing', () => {
    const model = new LiquidModel();
    model.disturb({ x: -150, y: 0 }, { x: 150, y: 0 }, 0.016);
    const drops = model.droplets.filter((drop) => drop.active);
    expect(drops.length).toBeGreaterThanOrEqual(2);
    expect(new Set(drops.map((drop) => drop.radius)).size).toBeGreaterThan(1);
    for (const drop of drops) {
      expect(Math.hypot(drop.x, drop.y)).toBeGreaterThanOrEqual(44);
      expect(Math.hypot(drop.x, drop.y)).toBeLessThan(48);
      expect(drop.vx).toBeGreaterThan(0);
    }
    for (let i = 0; i < 24; i++) model.step();
    expect(
      model.droplets.some((drop) => drop.active && drop.x - drop.radius > 52),
    ).toBe(true);
  });
  it('inherits reversed and diagonal swipe momentum deterministically', () => {
    const left = new LiquidModel(),
      diagonal = new LiquidModel(),
      repeat = new LiquidModel();
    left.disturb({ x: 65, y: 0 }, { x: -65, y: 0 }, 0.04);
    diagonal.disturb({ x: -90, y: -90 }, { x: 90, y: 90 }, 0.04);
    repeat.disturb({ x: -90, y: -90 }, { x: 90, y: 90 }, 0.04);
    expect(left.activeDroplets).toBeGreaterThan(0);
    expect(
      left.droplets.filter((drop) => drop.active).every((drop) => drop.vx < 0),
    ).toBe(true);
    expect(diagonal.activeDroplets).toBeGreaterThan(0);
    expect(
      diagonal.droplets
        .filter((drop) => drop.active)
        .every((drop) => drop.vx > 0 && drop.vy > 0),
    ).toBe(true);
    expect(diagonal.droplets).toEqual(repeat.droplets);
  });
  it('bounds the pool, flight and lifetime under repeated swipes, then fully recovers', () => {
    const model = new LiquidModel(),
      pool = model.droplets;
    for (let swipe = 0; swipe < 40; swipe++) {
      const sign = swipe % 2 ? -1 : 1;
      model.disturb({ x: -100 * sign, y: 0 }, { x: 100 * sign, y: 0 }, 0.02);
      for (let i = 0; i < 18; i++) model.step();
      expect(model.activeDroplets).toBeLessThanOrEqual(MAX_DROPLETS);
      for (const drop of model.droplets.filter((drop) => drop.active)) {
        expect(Number.isFinite(drop.x + drop.y + drop.vx + drop.vy)).toBe(true);
        expect(Math.hypot(drop.x, drop.y)).toBeLessThan(104);
        expect(drop.lifetime).toBeLessThanOrEqual(0.85);
      }
    }
    expect(model.droplets).toBe(pool);
    expect(pool).toHaveLength(MAX_DROPLETS);
    for (let i = 0; i < 600; i++) model.step();
    expect(model.activeDroplets).toBe(0);
    expect(model.energy()).toBeLessThan(0.002);
    model.disturb({ x: -100, y: 0 }, { x: 100, y: 0 }, 0.02);
    model.reset();
    expect(model.activeDroplets).toBe(0);
    expect(model.energy()).toBe(0);
  });
});
