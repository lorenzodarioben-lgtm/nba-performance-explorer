// Half-court geometry in the shot dataset's own coordinate system: basket centre at (0, 0),
// 10 units per foot, x across the court (−250…250), y away from the basket. The baseline sits
// 5.25 ft behind the rim (y = −52.5) and the half-court line 47 ft from the baseline (y = 417.5).
// Lines follow the official court dimensions: 4 ft backboard offset, 16 ft lane, 15 ft free-throw
// distance from the backboard, 6 ft free-throw circle, 4 ft restricted arc, 22 ft corner threes
// meeting a 23.75 ft arc. Shot marks are always placed from raw recorded coordinates.

export const COURT = {
  minX: -250,
  maxX: 250,
  baseline: -52.5,
  halfCourt: 417.5,
  backboardY: -12.5,
  freeThrowY: 137.5,
  laneHalf: 80,
  innerLaneHalf: 60,
  rimRadius: 7.5,
  restrictedRadius: 40,
  ftCircleRadius: 60,
  cornerX: 220,
  arcRadius: 237.5,
  /** y where the corner three straight line meets the 23.75 ft arc. */
  arcBreakY: Math.sqrt(237.5 ** 2 - 220 ** 2),
} as const;

export type BasketSide = 'top' | 'bottom';

export interface CourtProjection {
  /** Court units → SVG units. */
  point: (x: number, y: number) => [number, number];
  /** SVG viewBox for a court cropped at `depth` (court y). */
  viewBox: string;
  width: number;
  height: number;
  depth: number;
  side: BasketSide;
}

export function projectCourt(
  side: BasketSide,
  depth: number = COURT.halfCourt,
): CourtProjection {
  const height = depth - COURT.baseline;
  const point: CourtProjection['point'] =
    side === 'top'
      ? (x, y) => [x - COURT.minX, y - COURT.baseline]
      : (x, y) => [x - COURT.minX, depth - y];
  return { point, viewBox: `0 0 500 ${height}`, width: 500, height, depth, side };
}

export interface CourtLine {
  d: string;
  kind: 'boundary' | 'lane' | 'arc' | 'rim' | 'hash' | 'dashed' | 'backboard';
}

/** Path data for every court line, clipped visually by the SVG viewBox at the crop depth. */
export function courtLines(projection: CourtProjection): CourtLine[] {
  const P = (x: number, y: number) => projection.point(x, y).join(' ');
  const sweepAway = projection.side === 'top' ? 0 : 1;
  const sweepToward = 1 - sweepAway;
  const c = COURT;
  const lines: CourtLine[] = [
    {
      kind: 'boundary',
      d: `M${P(c.minX, c.baseline)} L${P(c.maxX, c.baseline)} L${P(c.maxX, c.halfCourt)} L${P(c.minX, c.halfCourt)} Z`,
    },
    {
      kind: 'lane',
      d: `M${P(-c.laneHalf, c.baseline)} L${P(-c.laneHalf, c.freeThrowY)} L${P(c.laneHalf, c.freeThrowY)} L${P(c.laneHalf, c.baseline)}`,
    },
    {
      kind: 'lane',
      d: `M${P(-c.innerLaneHalf, c.baseline)} L${P(-c.innerLaneHalf, c.freeThrowY)} M${P(c.innerLaneHalf, c.baseline)} L${P(c.innerLaneHalf, c.freeThrowY)}`,
    },
    {
      kind: 'arc',
      d: `M${P(-c.ftCircleRadius, c.freeThrowY)} A${c.ftCircleRadius} ${c.ftCircleRadius} 0 0 ${sweepAway} ${P(c.ftCircleRadius, c.freeThrowY)}`,
    },
    {
      kind: 'dashed',
      d: `M${P(-c.ftCircleRadius, c.freeThrowY)} A${c.ftCircleRadius} ${c.ftCircleRadius} 0 0 ${sweepToward} ${P(c.ftCircleRadius, c.freeThrowY)}`,
    },
    {
      kind: 'arc',
      d: `M${P(-c.restrictedRadius, 0)} A${c.restrictedRadius} ${c.restrictedRadius} 0 0 ${sweepAway} ${P(c.restrictedRadius, 0)} M${P(-c.restrictedRadius, 0)} L${P(-c.restrictedRadius, c.backboardY)} M${P(c.restrictedRadius, 0)} L${P(c.restrictedRadius, c.backboardY)}`,
    },
    { kind: 'backboard', d: `M${P(-30, c.backboardY)} L${P(30, c.backboardY)}` },
    {
      kind: 'rim',
      d: `M${P(-c.rimRadius, 0)} A${c.rimRadius} ${c.rimRadius} 0 1 0 ${P(c.rimRadius, 0)} A${c.rimRadius} ${c.rimRadius} 0 1 0 ${P(-c.rimRadius, 0)}`,
    },
    {
      kind: 'arc',
      d: `M${P(-c.cornerX, c.baseline)} L${P(-c.cornerX, c.arcBreakY)} A${c.arcRadius} ${c.arcRadius} 0 0 ${sweepAway} ${P(c.cornerX, c.arcBreakY)} L${P(c.cornerX, c.baseline)}`,
    },
    {
      kind: 'arc',
      d: `M${P(-60, c.halfCourt)} A60 60 0 0 ${sweepToward} ${P(60, c.halfCourt)} M${P(-20, c.halfCourt)} A20 20 0 0 ${sweepToward} ${P(20, c.halfCourt)}`,
    },
  ];
  // Lane-space marks, the low block and the 28 ft sideline hash marks.
  const hashes = [17.5, 57.5, 87.5]
    .map(
      (y) =>
        `M${P(-c.laneHalf, y)} L${P(-c.laneHalf - 8, y)} M${P(c.laneHalf, y)} L${P(c.laneHalf + 8, y)}`,
    )
    .join(' ');
  lines.push({ kind: 'hash', d: hashes });
  lines.push({
    kind: 'hash',
    d: `M${P(-c.laneHalf, 27.5)} L${P(-c.laneHalf - 8, 27.5)} L${P(-c.laneHalf - 8, 37.5)} L${P(-c.laneHalf, 37.5)} M${P(c.laneHalf, 27.5)} L${P(c.laneHalf + 8, 27.5)} L${P(c.laneHalf + 8, 37.5)} L${P(c.laneHalf, 37.5)}`,
  });
  lines.push({
    kind: 'hash',
    d: `M${P(c.minX, 227.5)} L${P(c.minX + 30, 227.5)} M${P(c.maxX, 227.5)} L${P(c.maxX - 30, 227.5)}`,
  });
  return lines;
}

export type SourceZone =
  | 'Restricted Area'
  | 'In The Paint (Non-RA)'
  | 'Mid-Range'
  | 'Left Corner 3'
  | 'Right Corner 3'
  | 'Above the Break 3'
  | 'Backcourt';

/**
 * Approximate drawing areas for the source's own zone names, used only to shade a zone view.
 * Every attempt keeps its recorded zone; these outlines never reclassify a shot.
 */
export function zoneAreas(
  projection: CourtProjection,
): Partial<Record<SourceZone, string>> {
  const P = (x: number, y: number) => projection.point(x, y).join(' ');
  const c = COURT;
  const away = projection.side === 'top' ? 0 : 1;
  const toward = 1 - away;
  const depth = Math.min(projection.depth, c.halfCourt);
  const ra = `M${P(-c.restrictedRadius, c.baseline)} L${P(-c.restrictedRadius, 0)} A${c.restrictedRadius} ${c.restrictedRadius} 0 0 ${away} ${P(c.restrictedRadius, 0)} L${P(c.restrictedRadius, c.baseline)} Z`;
  const paint = `M${P(-c.laneHalf, c.baseline)} L${P(-c.laneHalf, c.freeThrowY)} L${P(c.laneHalf, c.freeThrowY)} L${P(c.laneHalf, c.baseline)} Z ${ra}`;
  const insideArc = `M${P(-c.cornerX, c.baseline)} L${P(-c.cornerX, c.arcBreakY)} A${c.arcRadius} ${c.arcRadius} 0 0 ${away} ${P(c.cornerX, c.arcBreakY)} L${P(c.cornerX, c.baseline)} Z`;
  const mid = `${insideArc} M${P(-c.laneHalf, c.baseline)} L${P(c.laneHalf, c.baseline)} L${P(c.laneHalf, c.freeThrowY)} L${P(-c.laneHalf, c.freeThrowY)} Z`;
  const leftCorner = `M${P(c.minX, c.baseline)} L${P(-c.cornerX, c.baseline)} L${P(-c.cornerX, c.arcBreakY)} L${P(c.minX, c.arcBreakY)} Z`;
  const rightCorner = `M${P(c.maxX, c.baseline)} L${P(c.cornerX, c.baseline)} L${P(c.cornerX, c.arcBreakY)} L${P(c.maxX, c.arcBreakY)} Z`;
  const aboveBreak = `M${P(c.minX, c.arcBreakY)} L${P(-c.cornerX, c.arcBreakY)} A${c.arcRadius} ${c.arcRadius} 0 0 ${away} ${P(c.cornerX, c.arcBreakY)} L${P(c.maxX, c.arcBreakY)} L${P(c.maxX, depth)} L${P(c.minX, depth)} Z`;
  void toward;
  return {
    'Restricted Area': ra,
    'In The Paint (Non-RA)': paint,
    'Mid-Range': mid,
    'Left Corner 3': leftCorner,
    'Right Corner 3': rightCorner,
    'Above the Break 3': aboveBreak,
  };
}
