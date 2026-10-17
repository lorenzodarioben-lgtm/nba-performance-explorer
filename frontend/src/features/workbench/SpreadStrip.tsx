import type { WorkbenchSummary } from '@nba-performance-explorer/contracts';

/**
 * A one-line summary of a cohort's spread: the range, the interquartile box, the median and the
 * mean, with an optional marker for the selected entity. Exact values are written underneath.
 */
export function SpreadStrip({
  summary,
  format,
  marker,
}: {
  summary: WorkbenchSummary;
  format: (value: number | null) => string;
  marker: { value: number; label: string } | null;
}) {
  const { min, q1, median, q3, max, mean } = summary;
  if (min === null || max === null || q1 === null || q3 === null || median === null)
    return null;
  const span = max - min || 1;
  const at = (v: number) => `${((v - min) / span) * 100}%`;
  return (
    <figure className="spread" aria-label="Cohort spread">
      <div className="spread__track" aria-hidden="true">
        <span
          className="spread__box"
          style={{ left: at(q1), width: `${((q3 - q1) / span) * 100}%` }}
        />
        <span className="spread__median" style={{ left: at(median) }} />
        {mean !== null ? (
          <span className="spread__mean" style={{ left: at(mean) }} />
        ) : null}
        {marker ? (
          <span className="spread__marker" style={{ left: at(marker.value) }} />
        ) : null}
      </div>
      <figcaption className="spread__caption">
        <span>Min {format(min)}</span>
        <span>Q1 {format(q1)}</span>
        <span>Median {format(median)}</span>
        <span>Q3 {format(q3)}</span>
        <span>Max {format(max)}</span>
        {mean !== null ? <span>Mean {format(mean)} (dot)</span> : null}
        {marker ? (
          <span className="spread__you">
            {marker.label} {format(marker.value)}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
