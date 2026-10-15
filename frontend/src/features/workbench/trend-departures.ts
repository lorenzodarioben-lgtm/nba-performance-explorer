import type { WorkbenchResponse } from '@nba-performance-explorer/contracts';

type Row = WorkbenchResponse['rows'][number];
export interface Departure {
  row: Row;
  /** Actual y minus the fit line's y at the same x. */
  residual: number;
  /** Residual divided by the population SD of every residual in the cohort. */
  standardised: number;
}

/**
 * Who sits furthest from the least-squares line: residuals from the cohort's own fit, ranked
 * both ways. Purely descriptive: "above the line" means more of the second metric than the
 * cohort's linear trend gives for that first-metric value, not better.
 */
export function trendDepartures(
  rows: readonly Row[],
  slope: number,
  intercept: number,
  count = 5,
) {
  const all = rows
    .filter((r) => r.y !== null)
    .map((row) => ({ row, residual: row.y! - (intercept + slope * row.x) }));
  if (all.length < 3) return null;
  const sd = Math.sqrt(all.reduce((s, d) => s + d.residual ** 2, 0) / all.length);
  if (!sd) return null;
  const ranked: Departure[] = all
    .map((d) => ({ ...d, standardised: d.residual / sd }))
    .sort((a, b) => b.residual - a.residual || a.row.label.localeCompare(b.row.label));
  return {
    sd,
    above: ranked.filter((d) => d.residual > 0).slice(0, count),
    below: ranked
      .filter((d) => d.residual < 0)
      .reverse()
      .slice(0, count),
  };
}
