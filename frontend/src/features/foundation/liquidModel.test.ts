import { describe, expect, it } from 'vitest';
import {
  LiquidModel,
  MAX_DROPLETS,
  MIN_DROPLET_RADIUS,
  MAX_DROPLET_RADIUS,
} from './liquidModel';

function random(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const model = (seed = 1) => new LiquidModel(64, random(seed));
function swipe(m: LiquidModel, speed: number, y = 0, angle = 0, segments = 26) {
  const point = (x: number) => ({
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle),
  });
  const dt = 130 / segments / speed;
  for (let i = 0; i < segments; i++) {
    m.disturb(
      point(-65 + (i * 130) / segments),
      point(-65 + ((i + 1) * 130) / segments),
      dt,
    );
    for (let j = 0; j < Math.ceil(dt * 120); j++) m.step(dt / Math.ceil(dt * 120));
  }
  for (let i = 0; i < 168; i++) m.step();
  return m;
}
const trials = (speed: number, y = 0, segments = 26) =>
  Array.from({ length: 32 }, (_, i) => swipe(model(i + 1), speed, y, 0, segments));
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

describe('liquid surface physics', () => {
  it('injects more energy for a faster swipe over exactly the same path', () => {
    const slow = new LiquidModel(64, random(1)),
      fast = new LiquidModel(64, random(1));
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
    const right = new LiquidModel(64, random(1)),
      left = new LiquidModel(64, random(1));
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
    const model = new LiquidModel(64, random(1));
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
  it('very gentle travel primarily ripples, with no detachment on a near miss', () => {
    const gentle = trials(40);
    expect(gentle.filter((m) => m.emittedTotal === 0).length).toBeGreaterThan(25);
    const near = new LiquidModel(64, random(1));
    near.disturb({ x: -100, y: 55 }, { x: 100, y: 55 }, 0.02);
    expect(near.activeDroplets).toBe(0);
  });
  it('separates differently sized boundary droplets on a sparse fast crossing', () => {
    const model = new LiquidModel(64, random(3));
    model.disturb({ x: -150, y: 0 }, { x: 150, y: 0 }, 0.016);
    const drops = model.droplets.filter((drop) => drop.active);
    expect(drops.length).toBeGreaterThanOrEqual(2);
    expect(new Set(drops.map((drop) => drop.radius)).size).toBeGreaterThan(1);
    for (const drop of drops) {
      expect(Math.hypot(drop.x, drop.y)).toBeGreaterThanOrEqual(44);
      expect(Math.hypot(drop.x, drop.y)).toBeLessThan(51);
      expect(drop.vx).toBeGreaterThan(0);
    }
    for (let i = 0; i < 24; i++) model.step();
    expect(
      model.droplets.some((drop) => drop.active && drop.x - drop.radius > 52),
    ).toBe(true);
  });
  it('inherits reversed and diagonal swipe momentum deterministically', () => {
    const left = model(17),
      diagonal = model(23),
      repeat = model(23);
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
    const model = new LiquidModel(64, random(1)),
      pool = model.droplets;
    for (let swipe = 0; swipe < 40; swipe++) {
      const sign = swipe % 2 ? -1 : 1;
      model.disturb({ x: -100 * sign, y: 0 }, { x: 100 * sign, y: 0 }, 0.02);
      for (let i = 0; i < 18; i++) model.step();
      expect(model.activeDroplets).toBeLessThanOrEqual(MAX_DROPLETS);
      for (const drop of model.droplets.filter((drop) => drop.active)) {
        expect(Number.isFinite(drop.x + drop.y + drop.vx + drop.vy)).toBe(true);
        expect(Math.hypot(drop.x, drop.y)).toBeLessThan(104);
        expect(drop.lifetime).toBeLessThanOrEqual(1.02);
        expect(drop.radius).toBeGreaterThanOrEqual(MIN_DROPLET_RADIUS);
        expect(drop.radius).toBeLessThanOrEqual(MAX_DROPLET_RADIUS);
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
  it('allows slow deliberate contact to accumulate work for small, optional detachments', () => {
    const slow = trials(220);
    const counts = slow.map((m) => m.emittedTotal);
    expect(counts).toContain(0);
    expect(counts.some((n) => n === 1)).toBe(true);
    expect(counts.some((n) => n === 2)).toBe(true);
    expect(counts.filter((n) => n >= 1 && n <= 2).length).toBeGreaterThan(23);
    expect(mean(slow.map((m) => m.emittedMass))).toBeLessThan(5);
  });
  it('lets very gentle contact release residual work from an already disturbed crest', () => {
    const touched = model(3),
      recovering = model(3);
    for (const m of [touched, recovering])
      m.disturb({ x: -65, y: 0 }, { x: 65, y: 0 }, 130 / 400);
    for (let i = 0; i < 12; i++) {
      touched.disturb({ x: 32 + i * 1.5, y: 0 }, { x: 33.5 + i * 1.5, y: 0 }, 0.03);
      for (let j = 0; j < 4; j++) {
        touched.step(0.03 / 4);
        recovering.step(0.03 / 4);
      }
    }
    expect(touched.emittedTotal).toBeGreaterThan(recovering.emittedTotal);
    const cold = model(3);
    for (let i = 0; i < 12; i++) {
      cold.disturb({ x: 32 + i * 1.5, y: 0 }, { x: 33.5 + i * 1.5, y: 0 }, 0.03);
      for (let j = 0; j < 4; j++) cold.step(0.03 / 4);
    }
    expect(cold.emittedTotal).toBe(0);
  });
  it('produces varied seeded outcomes with greater fast fragmentation and detached mass', () => {
    const slow = trials(220),
      medium = trials(650),
      fast = trials(1500);
    expect(new Set(fast.map((m) => m.emittedTotal)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(medium.map((m) => m.emittedTotal)).size).toBeGreaterThanOrEqual(3);
    expect(mean(fast.map((m) => m.emittedTotal))).toBeGreaterThan(
      mean(medium.map((m) => m.emittedTotal)),
    );
    expect(mean(fast.map((m) => m.emittedMass))).toBeGreaterThan(
      mean(medium.map((m) => m.emittedMass)) * 1.5,
    );
    expect(mean(medium.map((m) => m.emittedMass))).toBeGreaterThan(
      mean(slow.map((m) => m.emittedMass)) * 2,
    );
  });
  it('reproduces the entire state with an explicit seed and identical samples', () => {
    const a = swipe(model(712), 1500),
      b = swipe(model(712), 1500);
    expect(a.nodes).toEqual(b.nodes);
    expect(a.droplets).toEqual(b.droplets);
    expect(a.emittedTotal).toBe(b.emittedTotal);
    expect(a.emittedMass).toBe(b.emittedMass);
  });
  it('distinguishes a glancing chord from a centre crossing at the same speed', () => {
    const edge = trials(1500, 38),
      centre = trials(1500);
    expect(mean(centre.map((m) => m.emittedMass))).toBeGreaterThan(
      mean(edge.map((m) => m.emittedMass)) * 3,
    );
    expect(edge.some((m) => m.emittedTotal > 0)).toBe(true);
    const graze = model(21);
    graze.disturb({ x: -65, y: 38 }, { x: 65, y: 38 }, 0.06);
    expect(graze.droplets.filter((d) => d.active).every((d) => d.y > 10)).toBe(true);
  });
  it('preserves sparse-event separation without a mandatory spawn count', () => {
    const sparse = trials(1500, 0, 1);
    expect(sparse.every((m) => m.emittedTotal > 0)).toBe(true);
    expect(new Set(sparse.map((m) => m.emittedTotal)).size).toBeGreaterThan(3);
  });
  it('withdraws mechanical energy locally and recoils while retaining ongoing waves', () => {
    const m = model(9);
    m.disturb({ x: -65, y: 0 }, { x: 65, y: 0 }, 0.06);
    expect(m.emittedTotal).toBeGreaterThan(0);
    expect(m.separationLoss).toBeGreaterThan(1);
    expect(m.nodes.some((n) => n.velocity > 0)).toBe(true);
    expect(m.nodes.some((n) => n.velocity < 0)).toBe(true);
    const velocities = m.nodes.map((n) => n.velocity);
    for (let i = 0; i < 12; i++) m.step();
    m.disturb({ x: 0, y: -65 }, { x: 0, y: 65 }, 0.07);
    expect(m.nodes.map((n) => n.velocity)).not.toEqual(velocities);
    expect(m.emittedTotal).toBeGreaterThan(1);
    for (let i = 0; i < 720; i++) m.step();
    expect(m.activeDroplets).toBe(0);
    expect(m.energy()).toBeLessThan(0.002);
  });
});
