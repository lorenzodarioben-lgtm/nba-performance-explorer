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
  phase: number;
  wobble: number;
  neckTime: number;
  active: boolean;
}

export const MAX_DROPLETS = 16;
export const MIN_DROPLET_RADIUS = 1.15;
export const MAX_DROPLET_RADIUS = 6;
const AXES = ['x', 'y'] as const;

const clamp = (value: number, limit: number) =>
  Math.max(-limit, Math.min(limit, value));

function segmentDistance(px: number, py: number, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(px - a.x - t * dx, py - a.y - t * dy);
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
    phase: 0,
    wobble: 0,
    neckTime: 0,
    active: false,
  }));
  offset = { x: 0, y: 0 };
  private drift = { x: 0, y: 0 };
  private previous: Float64Array;
  private outline: Point[];
  private tensile: Float64Array;
  private refractory: Float64Array;
  private cohesion: Float64Array;
  private pointerVelocity = { x: 0, y: 0 };
  private pointerMemory = 0;
  private contactDirection = { x: 1, y: 0 };
  /** Monotonic counts survive idle reset, so browser trials count every detachment. */
  emittedTotal = 0;
  emittedMass = 0;
  separationLoss = 0;

  constructor(
    count = 64,
    private readonly random: () => number = Math.random,
  ) {
    this.nodes = Array.from({ length: count }, (_, i) => ({
      x: Math.cos((i / count) * Math.PI * 2),
      y: Math.sin((i / count) * Math.PI * 2),
      displacement: 0,
      velocity: 0,
    }));
    this.previous = new Float64Array(count);
    this.outline = Array.from({ length: count }, () => ({ x: 0, y: 0 }));
    this.tensile = new Float64Array(count);
    this.refractory = new Float64Array(count);
    this.cohesion = Float64Array.from({ length: count }, () => 0.9 + random() * 0.2);
  }

  /** Swept influence prevents a fast swipe from skipping the surface between pointer events. */
  disturb(from: Point, to: Point, seconds: number) {
    const dx = to.x - from.x,
      dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.1 || seconds <= 0 || !Number.isFinite(distance + seconds)) return;
    const speed = Math.min(2400, distance / Math.max(0.001, seconds));
    const gain = Math.pow(speed / 2400, 0.72);
    const ux = dx / distance,
      uy = dy / distance;
    const travel = 1 - Math.exp(-distance / 22);
    const acceleration =
      this.pointerMemory > 0
        ? Math.min(
            1,
            Math.hypot(
              ux * speed - this.pointerVelocity.x,
              uy * speed - this.pointerVelocity.y,
            ) /
              (Math.max(seconds, 0.016) * 16000),
          )
        : 0;
    const fx = from.x - this.offset.x,
      fy = from.y - this.offset.y;
    const a = distance * distance,
      b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - this.radius * this.radius;
    const discriminant = b * b - 4 * a * c;
    const root = Math.sqrt(Math.max(0, discriminant));
    const entry = (-b - root) / (2 * a),
      exit = (-b + root) / (2 * a);
    const wetDistance =
      discriminant > 0
        ? distance * Math.max(0, Math.min(1, exit) - Math.max(0, entry))
        : 0;
    const ex = (fx + dx * exit) / this.radius,
      ey = (fy + dy * exit) / this.radius;
    const incidence = Math.abs(ux * ex + uy * ey);
    // Work integrates actual travel through the body, not the number of pointer events.
    // The exit crest receives pressure even while the cursor is inside the liquid.
    const work =
      (wetDistance / (2 * this.radius)) *
      (3.4 + Math.pow(speed / 350, 0.8) * 2) *
      (0.7 + incidence * 0.3) *
      (1 + acceleration * 0.22);
    let influence = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i]!;
      if (wetDistance > 0) {
        const crestDistance = Math.hypot(n.x - ex, n.y - ey) * this.radius;
        const crest = Math.exp(-Math.pow(crestDistance / (18 + incidence * 12), 2));
        this.tensile[i] = Math.min(28, this.tensile[i]! + work * crest);
      }
      const separation = segmentDistance(
        n.x * this.radius,
        n.y * this.radius,
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
        n.velocity +
          (ux * n.x + uy * n.y) * gain * (220 * weight + 110 * wake) * travel,
        340,
      );
    }
    this.drift.x = clamp(this.drift.x + ux * gain * 38 * influence * travel, 70);
    this.drift.y = clamp(this.drift.y + uy * gain * 38 * influence * travel, 70);
    if (influence > 0.05) {
      this.pointerVelocity.x = ux * speed;
      this.pointerVelocity.y = uy * speed;
      this.pointerMemory = 0.18;
      this.contactDirection.x = ux;
      this.contactDirection.y = uy;
    }
    if (wetDistance > 0) this.fragment();
  }

  private fragment() {
    // A safety bound, not a spawn quota. Each pinch-off must pay its own surface cost.
    for (let attempt = 0; attempt < 8; attempt++) {
      let drop: LiquidDroplet | undefined;
      for (const candidate of this.droplets) {
        if (!candidate.active) {
          drop = candidate;
          break;
        }
      }
      if (!drop) break;
      let index = -1,
        strongest = 0;
      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i]!;
        if (
          this.refractory[i]! > 0 ||
          n.velocity < 10 ||
          this.tensile[i]! < 2.3 * this.cohesion[i]!
        )
          continue;
        const neighbours =
          (this.nodes[(i + 1) % this.nodes.length]!.displacement +
            this.nodes[(i + this.nodes.length - 1) % this.nodes.length]!.displacement) /
          2;
        const strain = Math.abs(n.displacement - neighbours);
        const stress =
          (this.tensile[i]! +
            Math.max(0, n.displacement) * 0.16 +
            strain * 0.4 +
            n.velocity / 140) /
          this.cohesion[i]!;
        const score = stress * (0.9 + this.random() * 0.2);
        if (score > strongest) {
          strongest = score;
          index = i;
        }
      }
      if (index < 0) break;
      const node = this.nodes[index]!;
      const capacity = Math.min(4.85, 0.8 + Math.sqrt(strongest) * 0.7);
      // A skewed size distribution: satellites are common; large blobs require work.
      const radius = Math.min(
        MAX_DROPLET_RADIUS,
        MIN_DROPLET_RADIUS +
          Math.min(1.2, Math.max(0, strongest - 6) * 0.1) +
          Math.pow(this.random(), 2.35) * capacity,
      );
      const cost = (2.2 + radius * radius * 0.4) * this.cohesion[index]!;
      if (this.tensile[index]! < cost) {
        // A neck that cannot overcome cohesion relaxes and dissipates some work.
        this.tensile[index] = this.tensile[index]! * 0.86;
        this.refractory[index] = 0.025;
        continue;
      }
      const theta =
        Math.atan2(node.y, node.x) +
        ((this.random() - 0.5) * Math.PI * 2) / this.nodes.length;
      const nx = Math.cos(theta),
        ny = Math.sin(theta);
      const edge = this.radius + node.displacement + radius * 0.35;
      drop.x = nx * edge + this.offset.x;
      drop.y = ny * edge + this.offset.y;
      const ux = this.contactDirection.x,
        uy = this.contactDirection.y;
      const speed = Math.hypot(this.pointerVelocity.x, this.pointerVelocity.y);
      const launch =
        ((18 +
          Math.sqrt(this.tensile[index]!) * 15 +
          Math.max(0, node.velocity) * 0.38 +
          speed * 0.025) *
          (0.82 + this.random() * 0.36)) /
        Math.pow(radius / 2, 0.2);
      const shear = (this.random() - 0.5) * Math.min(35, strongest * 2);
      drop.vx =
        nx * launch * 0.55 + ux * launch * 0.45 - ny * shear + this.drift.x * 0.35;
      drop.vy =
        ny * launch * 0.55 + uy * launch * 0.45 + nx * shear + this.drift.y * 0.35;
      drop.radius = radius;
      drop.age = 0;
      drop.lifetime = 0.52 + Math.min(0.38, launch / 650) + this.random() * 0.12;
      drop.phase = this.random() * Math.PI * 2;
      drop.wobble = 0.08 + Math.min(0.14, strongest / 120);
      drop.neckTime = 0.065 + radius * 0.01;
      drop.active = true;
      this.emittedTotal++;
      this.emittedMass += radius * radius;
      const before = this.surfaceEnergy();
      // Drain a size-dependent patch of this crest, never reset the whole surface.
      for (let k = -5; k <= 5; k++) {
        const j = (index + k + this.nodes.length) % this.nodes.length;
        const weight = Math.exp(-Math.pow(k / (1.35 + radius * 0.5), 2));
        this.tensile[j] = Math.max(0, this.tensile[j]! - cost * weight);
        const crest = this.nodes[j]!;
        crest.velocity *= 1 - weight * Math.min(0.7, 0.25 + radius * 0.07);
        crest.displacement *= 1 - weight * 0.12;
        if (weight > 0.6) this.refractory[j] = 0.04 + radius * 0.012;
      }
      this.separationLoss += Math.max(0, before - this.surfaceEnergy());
      this.drift.x -= (nx * radius * radius * launch) / 1300;
      this.drift.y -= (ny * radius * radius * launch) / 1300;
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
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i]!;
      const wave =
        previous[(i + 1) % previous.length]! +
        previous[(i + previous.length - 1) % previous.length]! -
        2 * previous[i]!;
      n.velocity +=
        (-130 * n.displacement + 480 * wave - 9 * n.velocity - 95 * mean) * dt;
      n.displacement = clamp(n.displacement + n.velocity * dt, this.radius * 0.3);
    }
    for (const axis of AXES) {
      this.drift[axis] += (-105 * this.offset[axis] - 12 * this.drift[axis]) * dt;
      this.offset[axis] = clamp(this.offset[axis] + this.drift[axis] * dt, 7);
    }
    this.pointerMemory = Math.max(0, this.pointerMemory - dt);
    const relax = Math.exp(-1.8 * dt);
    for (let i = 0; i < this.nodes.length; i++) {
      this.tensile[i] = this.tensile[i]! * relax;
      this.refractory[i] = Math.max(0, this.refractory[i]! - dt);
    }
    this.fragment();
    for (const drop of this.droplets) {
      if (!drop.active) continue;
      drop.age += dt;
      const distance = Math.hypot(drop.x, drop.y);
      // Spend the final lifetime faster near the local flight limit, with continuous
      // shrinkage; no hard position clamp or sudden off-canvas culling.
      drop.age += dt * Math.max(0, distance - 76) * 0.8;
      const cohesion =
        drop.age > drop.neckTime
          ? Math.max(0, 1 - (distance - this.radius) / 48) * 65
          : 0;
      const drag = Math.exp(-(2.1 + 1.4 / drop.radius) * dt);
      drop.vx = (drop.vx - (drop.x / (distance || 1)) * cohesion * dt) * drag;
      drop.vy = (drop.vy + (26 - (drop.y / (distance || 1)) * cohesion) * dt) * drag;
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      // Approach the flight limit by shrinking, rather than abruptly clipping a blob.
      if (
        drop.age >= drop.lifetime ||
        (drop.age > drop.neckTime && distance + drop.radius < this.radius)
      ) {
        drop.active = false;
      }
    }
  }

  surfaceEnergy() {
    let surface = 0;
    for (const n of this.nodes) surface += n.displacement ** 2 + n.velocity ** 2 / 130;
    return (
      surface / this.nodes.length +
      this.offset.x ** 2 +
      this.offset.y ** 2 +
      (this.drift.x ** 2 + this.drift.y ** 2) / 105
    );
  }

  energy() {
    let tension = 0;
    for (const work of this.tensile) tension = Math.max(tension, work * work * 0.001);
    return this.surfaceEnergy() + tension + this.activeDroplets;
  }

  reset() {
    for (const n of this.nodes) {
      n.displacement = 0;
      n.velocity = 0;
    }
    this.offset = { x: 0, y: 0 };
    this.drift = { x: 0, y: 0 };
    for (const drop of this.droplets) drop.active = false;
    this.tensile.fill(0);
    this.refractory.fill(0);
    this.pointerMemory = 0;
    this.pointerVelocity.x = 0;
    this.pointerVelocity.y = 0;
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
