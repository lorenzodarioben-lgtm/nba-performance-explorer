import type { WorkbenchResponse } from '@nba-performance-explorer/contracts';

import { trendDepartures, type Departure } from './trend-departures';

/** A residual's size in the second metric's units (percentages as percentage points). */
const size = (y: NonNullable<WorkbenchResponse['y']>, v: number) =>
  y.unit === 'percent'
    ? `${(v * 100).toFixed(1)} pts`
    : v.toFixed(Math.abs(v) < 1 ? 2 : 1);

export function TrendOutliers({
  data,
  pick,
  onPick,
}: {
  data: WorkbenchResponse;
  pick: string | null;
  onPick: (id: string) => void;
}) {
  const rel = data.relationship;
  if (!data.y || rel?.slope == null || rel.intercept == null) return null;
  const result = trendDepartures(data.rows, rel.slope, rel.intercept);
  if (!result) return null;
  const yLabel = data.y.label.toLowerCase();
  const list = (title: string, items: Departure[]) => (
    <div className="wb-trend__col">
      <h3>{title}</h3>
      {items.length ? (
        <ol>
          {items.map((d) => (
            <li key={d.row.id}>
              <button
                type="button"
                className="reset wb-trend__pick"
                aria-pressed={pick === d.row.id}
                onClick={() => onPick(d.row.id)}
              >
                <span className="wb-trend__name">{d.row.label}</span>
                <span className="wb-trend__num">
                  {d.residual > 0 ? '+' : '−'}
                  {size(data.y!, Math.abs(d.residual))}
                  <small>
                    {' '}
                    {d.standardised > 0 ? '+' : '−'}
                    {Math.abs(d.standardised).toFixed(1)} SD
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="wb-trend__none">No one on this side of the line.</p>
      )}
    </div>
  );
  return (
    <section className="wb-trend" aria-label="Furthest from the fit line">
      <p className="wb-trend__lede">
        Furthest from the line: actual {yLabel} minus what the cohort&rsquo;s linear
        trend gives at the same {data.metric.label.toLowerCase()}. SD is the spread of
        every residual ({size(data.y, result.sd)}). Above the line is more {yLabel} than
        the trend, not better.
      </p>
      <div className="wb-trend__cols">
        {list('Above the line', result.above)}
        {list('Below the line', result.below)}
      </div>
    </section>
  );
}
