import { COURT } from '../../charts/court';

/** A court rectangle in whole feet from the basket: x across (−25…25), y out (−6…90). */
export type CourtRegion = { x1: number; y1: number; x2: number; y2: number };

export const REGION_LIMITS = { x: [-25, 25], y: [-6, 90] } as const;

const clamp = (v: number, [lo, hi]: readonly [number, number]) =>
  Math.min(hi, Math.max(lo, v));

/** Inverts the studio's court projection (basket at the bottom, cropped at half court). */
export function feetFromSvg(svgX: number, svgY: number, depth = COURT.halfCourt) {
  return { x: (svgX + COURT.minX) / 10, y: (depth - svgY) / 10 };
}

/**
 * Two dragged corners (feet) become an ordered whole-foot region inside the limits, widened
 * outward so the drawn box is always covered. A box under a foot either way is no region.
 */
export function regionFromCorners(
  a: { x: number; y: number },
  b: { x: number; y: number },
): CourtRegion | null {
  const x1 = clamp(Math.floor(Math.min(a.x, b.x)), REGION_LIMITS.x);
  const x2 = clamp(Math.ceil(Math.max(a.x, b.x)), REGION_LIMITS.x);
  const y1 = clamp(Math.floor(Math.min(a.y, b.y)), REGION_LIMITS.y);
  const y2 = clamp(Math.ceil(Math.max(a.y, b.y)), REGION_LIMITS.y);
  if (Math.abs(a.x - b.x) < 1 || Math.abs(a.y - b.y) < 1 || x1 >= x2 || y1 >= y2)
    return null;
  return { x1, y1, x2, y2 };
}

export const regionParam = (r: CourtRegion) => `${r.x1},${r.y1},${r.x2},${r.y2}`;

export const describeRegion = (r: CourtRegion) =>
  `across ${r.x1} to ${r.x2} ft, out ${r.y1} to ${r.y2} ft from the basket`;
