/** Small, bounded surface-wave model. Units are CSS pixels and seconds. */
export interface Point {
  x: number;
  y: number;
}
export interface LiquidNode extends Point {
  displacement: number;
  velocity: number;
}

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
  offset = { x: 0, y: 0 };
  private drift = { x: 0, y: 0 };

  constructor(count = 64) {
    this.nodes = Array.from({ length: count }, (_, i) => ({
      x: Math.cos((i / count) * Math.PI * 2),
      y: Math.sin((i / count) * Math.PI * 2),
      displacement: 0,
      velocity: 0,
    }));
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
  }

  /** Fixed 120 Hz integration with a neighbor spring and area-restoring pressure. */
  step(dt = 1 / 120) {
    const previous = this.nodes.map((n) => n.displacement);
    const mean = previous.reduce((sum, d) => sum + d, 0) / previous.length;
    this.nodes.forEach((n, i) => {
      const wave =
        previous[(i + 1) % previous.length]! +
        previous[(i + previous.length - 1) % previous.length]! -
        2 * previous[i]!;
      n.velocity +=
        (-130 * n.displacement + 480 * wave - 9 * n.velocity - 95 * mean) * dt;
      n.displacement = clamp(n.displacement + n.velocity * dt, this.radius * 0.3);
    });
    for (const axis of ['x', 'y'] as const) {
      this.drift[axis] += (-105 * this.offset[axis] - 12 * this.drift[axis]) * dt;
      this.offset[axis] = clamp(this.offset[axis] + this.drift[axis] * dt, 7);
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
      (this.drift.x ** 2 + this.drift.y ** 2) / 105
    );
  }

  reset() {
    for (const n of this.nodes) {
      n.displacement = 0;
      n.velocity = 0;
    }
    this.offset = { x: 0, y: 0 };
    this.drift = { x: 0, y: 0 };
  }

  boundary(): Point[] {
    return this.nodes.map((n) => ({
      x: n.x * (this.radius + n.displacement) + this.offset.x,
      y: n.y * (this.radius + n.displacement) + this.offset.y,
    }));
  }
}
