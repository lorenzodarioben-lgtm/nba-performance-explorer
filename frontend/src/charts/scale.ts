// Minimal scale helpers for the in-house SVG chart kit. Charts only scale values returned by the
// data contracts; no statistic is computed here.

export interface LinearScale {
  (value: number): number;
  invert: (pixel: number) => number;
  domain: readonly [number, number];
  range: readonly [number, number];
}

export function linear(
  domain: readonly [number, number],
  range: readonly [number, number],
): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  const scale = ((value: number) =>
    r0 + ((value - d0) / span) * (r1 - r0)) as LinearScale;
  scale.invert = (pixel: number) => d0 + ((pixel - r0) / (r1 - r0 || 1)) * span;
  Object.assign(scale, { domain, range });
  return scale;
}

/** Round, human tick values covering [min, max] with roughly `count` steps. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const span = max - min;
  const raw = span / Math.max(1, count);
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const ratio = raw / power;
  const step = power * (ratio >= 7.5 ? 10 : ratio >= 3.5 ? 5 : ratio >= 1.5 ? 2 : 1);
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-6; v += step) {
    ticks.push(Number(v.toFixed(10)));
  }
  return ticks;
}

/** Extend a domain outward to the nearest nice tick. */
export function niceDomain(min: number, max: number, count = 5): [number, number] {
  const ticks = niceTicks(min, max, count);
  if (ticks.length < 2) return [min, max];
  const step = (ticks[1] as number) - (ticks[0] as number);
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

/** Index of the item whose x is nearest to `x` (items sorted by x). */
export function nearestIndex(xs: readonly number[], x: number): number {
  let best = 0;
  let distance = Infinity;
  xs.forEach((value, index) => {
    const d = Math.abs(value - x);
    if (d < distance) {
      distance = d;
      best = index;
    }
  });
  return best;
}

/** Rounded-top bar path (square at the baseline), the system's bar shape. */
export function barPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 3,
) {
  const h = Math.max(0, height);
  const r = Math.min(radius, h, width / 2);
  return `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + width - r}Q${x + width} ${y} ${x + width} ${y + r}V${y + h}Z`;
}

/**
 * Split a series into contiguous segments wherever a value is missing, so lines are never drawn
 * across gaps in the record.
 */
export function segments<T>(
  items: readonly T[],
  value: (item: T) => number | null | undefined,
): T[][] {
  const out: T[][] = [];
  let current: T[] = [];
  for (const item of items) {
    const v = value(item);
    if (v === null || v === undefined || !Number.isFinite(v)) {
      if (current.length) out.push(current);
      current = [];
    } else {
      current.push(item);
    }
  }
  if (current.length) out.push(current);
  return out;
}
