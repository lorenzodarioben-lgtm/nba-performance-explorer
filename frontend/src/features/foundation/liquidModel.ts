/** Small, bounded surface-wave model. Units are CSS pixels and seconds. */
export interface Point {
  x: number;
  y: number;
}
export interface LiquidNode extends Point {
  displacement: number;
  velocity: number;
}
export interface LiquidDroplet extends Point {
  vx: number;
  vy: number;
  radius: number;
  age: number;
  lifetime: number;
  active: boolean;
}

export const MAX_DROPLETS = 12;
export const DETACH_SPEED = 900;
const AXES = ['x', 'y'] as const;

const clamp = (value: number, limit: number) =>
  Math.max(-limit, Math.min(limit, value));

function segmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

export class LiquidModel {
  readonly nodes: LiquidNode[];
  readonly radius = 44;
  readonly droplets: LiquidDroplet[] = Array.from({ length: MAX_DROPLETS }, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 0,
    age: 0,
    lifetime: 0,
    active: false,
  }));
  offset = { x: 0, y: 0 };
  private drift = { x: 0, y: 0 };
  private previous: Float64Array;
  private outline: Point[];
  private separationCooldown = 0;

  constructor(count = 64) {
    this.nodes = Array.from({ length: count }, (_, i) => ({
      x: Math.cos((i / count) * Math.PI * 2),
      y: Math.sin((i / count) * Math.PI * 2),
      displacement: 0,
      velocity: 0,
    }));
    this.previous = new Float64Array(count);
    this.outline = Array.from({ length: count }, () => ({ x: 0, y: 0 }));
  }

  /** Swept influence prevents a fast swipe from skipping the surface between pointer events. */
  disturb(from: Point, to: Point, seconds: number) {
    const dx = to.x - from.x,
      dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.1 || seconds <= 0 || !Number.isFinite(distance + seconds)) return;
    const speed = Math.min(2400, distance / Math.max(0.008, seconds));
    const gain = Math.pow(speed / 2400, 0.72);
    const ux = dx / distance,
      uy = dy / distance;
    let influence = 0;
    for (const n of this.nodes) {
      const separation = segmentDistance(
        { x: n.x * this.radius, y: n.y * this.radius },
        from,
        to,
      );
      const weight = Math.exp(-Math.pow(separation / 24, 2));
      if (weight < 0.015) continue;
      influence = Math.max(influence, weight);
      // A narrow pressure crest with a negative wake excites local capillary ripples,
      // alongside the broader directional drag. This avoids one uniform balloon stretch.
      const band = separation / 16;
      const wake = (1 - band * band) * Math.exp(-0.5 * band * band);
      n.velocity = clamp(
        n.velocity + (ux * n.x + uy * n.y) * gain * (220 * weight + 110 * wake),
        340,
      );
    }
    this.drift.x = clamp(this.drift.x + ux * gain * 38 * influence, 70);
    this.drift.y = clamp(this.drift.y + uy * gain * 38 * influence, 70);
    if (speed >= DETACH_SPEED && influence > 0.65 && !this.separationCooldown) {
      // Solve the swept segment's downstream circle intersection. A near miss
      // can excite the surface, but only an actual boundary crossing separates.
      const fx = from.x - this.offset.x,
        fy = from.y - this.offset.y;
      const a = dx * dx + dy * dy,
        b = 2 * (fx * dx + fy * dy);
      const c = fx * fx + fy * fy - this.radius * this.radius;
      const discriminant = b * b - 4 * a * c;
      if (discriminant >= 0) {
        const exit = (-b + Math.sqrt(discriminant)) / (2 * a);
        if (exit >= 0 && exit <= 1 && this.energy() > 12) {
          const angle = Math.atan2(fy + dy * exit, fx + dx * exit);
          this.separate(angle, ux, uy, speed);
        }
      }
    }
  }

  private separate(angle: number, ux: number, uy: number, speed: number) {
    const count = Math.min(5, 2 + Math.floor((speed - DETACH_SPEED) / 450));
    let emitted = 0;
    for (let j = 0; j < count; j++) {
      const drop = this.droplets.find((d) => !d.active);
      if (!drop) break;
      const spread = (j - (count - 1) / 2) * 0.17;
      const theta = angle + spread;
      const index =
        Math.round(((theta / (Math.PI * 2) + 1) % 1) * this.nodes.length) %
        this.nodes.length;
      const node = this.nodes[index]!;
      if (node.velocity < 65) continue;
      const nx = Math.cos(theta),
        ny = Math.sin(theta);
      const radius = [4.4, 3.3, 2.5, 3.8, 2.1][j]!;
      const edge = this.radius + node.displacement + radius * 0.35;
      drop.x = nx * edge + this.offset.x;
      drop.y = ny * edge + this.offset.y;
      // Smaller masses carry the same crest impulse farther, avoiding an even fan.
      const launch = (90 + speed * 0.055) * (0.7 + (4.4 - radius) * 0.12);
      drop.vx = (ux * 0.8 + nx * 0.2) * launch - uy * spread * 90;
      drop.vy = (uy * 0.8 + ny * 0.2) * launch + ux * spread * 90;
      drop.radius = radius;
      drop.age = 0;
      drop.lifetime = 0.64 + j * 0.045;
      drop.active = true;
      // Separation takes momentum from the same crest that launched the drop.
      for (let k = -1; k <= 1; k++) {
        const crest = this.nodes[(index + k + this.nodes.length) % this.nodes.length]!;
        crest.velocity *= 0.62;
      }
      emitted++;
    }
    if (emitted) {
      this.drift.x -= ux * emitted * 2;
      this.drift.y -= uy * emitted * 2;
      this.separationCooldown = 0.12;
    }
  }

  get activeDroplets() {
    let count = 0;
    for (const drop of this.droplets) if (drop.active) count++;
    return count;
  }

  /** Fixed 120 Hz integration with a neighbor spring and area-restoring pressure. */
  step(dt = 1 / 120) {
    const previous = this.previous;
    let sum = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      previous[i] = this.nodes[i]!.displacement;
      sum += previous[i]!;
    }
    const mean = sum / previous.length;
    this.nodes.forEach((n, i) => {
      const wave =
        previous[(i + 1) % previous.length]! +
        previous[(i + previous.length - 1) % previous.length]! -
        2 * previous[i]!;
      n.velocity +=
        (-130 * n.displacement + 480 * wave - 9 * n.velocity - 95 * mean) * dt;
      n.displacement = clamp(n.displacement + n.velocity * dt, this.radius * 0.3);
    });
    for (const axis of AXES) {
      this.drift[axis] += (-105 * this.offset[axis] - 12 * this.drift[axis]) * dt;
      this.offset[axis] = clamp(this.offset[axis] + this.drift[axis] * dt, 7);
    }
    this.separationCooldown = Math.max(0, this.separationCooldown - dt);
    const drag = Math.exp(-3.2 * dt);
    for (const drop of this.droplets) {
      if (!drop.active) continue;
      drop.age += dt;
      const distance = Math.hypot(drop.x, drop.y);
      const cohesion = drop.age > 0.12 ? 85 : 0;
      drop.vx = (drop.vx - (drop.x / (distance || 1)) * cohesion * dt) * drag;
      drop.vy = (drop.vy + (26 - (drop.y / (distance || 1)) * cohesion) * dt) * drag;
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      if (
        drop.age >= drop.lifetime ||
        distance > 94 ||
        (drop.age > 0.18 && distance < this.radius)
      ) {
        drop.active = false;
      }
    }
  }

  energy() {
    return (
      this.nodes.reduce(
        (sum, n) => sum + n.displacement ** 2 + n.velocity ** 2 / 130,
        0,
      ) /
        this.nodes.length +
      this.offset.x ** 2 +
      this.offset.y ** 2 +
      (this.drift.x ** 2 + this.drift.y ** 2) / 105 +
      this.activeDroplets
    );
  }

  reset() {
    for (const n of this.nodes) {
      n.displacement = 0;
      n.velocity = 0;
    }
    this.offset = { x: 0, y: 0 };
    this.drift = { x: 0, y: 0 };
    for (const drop of this.droplets) drop.active = false;
    this.separationCooldown = 0;
  }

  boundary(): Point[] {
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i]!,
        point = this.outline[i]!;
      point.x = n.x * (this.radius + n.displacement) + this.offset.x;
      point.y = n.y * (this.radius + n.displacement) + this.offset.y;
    }
    return this.outline;
  }
}
