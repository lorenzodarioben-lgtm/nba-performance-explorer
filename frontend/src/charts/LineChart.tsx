import { motion } from 'motion/react';
import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

import { useSeen } from '../motion/choreography';
import { useMotionAllowed } from '../motion/MotionPreference';
import { easings, springs } from '../motion/tokens';
import { ChartTip, TipRow } from './ChartTip';
import { markerPath, type MarkerShape } from './markers';
import { linear, nearestIndex, niceDomain, niceTicks, segments } from './scale';
import { useChartWidth } from './useChartWidth';

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  dash?: string | undefined;
  shape?: MarkerShape | undefined;
  /** One value per category; null is a gap in the record and is never bridged. */
  values: readonly (number | null)[];
  /**
   * Optional: true at an index whose point must not connect to the previous one even though
   * both exist (e.g. adjacent reported seasons that are years apart).
   */
  breakBefore?: readonly boolean[] | undefined;
}

export type IndexRange = readonly [number, number];

const PAD = { top: 18, right: 18, bottom: 30, left: 44 };

/** A y domain that holds every recorded value with a little headroom (zero-based when all ≥ 0). */
function autoDomain(
  series: readonly LineSeries[],
  reference?: number,
): [number, number] {
  const values = series.flatMap((entry) =>
    entry.values.filter(
      (value): value is number => value !== null && Number.isFinite(value),
    ),
  );
  if (reference !== undefined) values.push(reference);
  if (!values.length) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.abs(max) || 1;
  const floor = min >= 0 && min - span * 0.6 <= 0 ? 0 : min - span * 0.08;
  return niceDomain(floor, max + span * 0.06);
}

function showCategoryLabel(index: number, count: number, every: number) {
  if (index % every === 0) return true;
  // The last category is labelled only when it is not crowding the previous label.
  return index === count - 1 && (count - 1) % every >= every / 2;
}

/**
 * The platform line chart. Gaps stay gaps, values are plotted exactly as returned, the
 * crosshair snaps to the nearest recorded category, and every reading is reachable from the
 * keyboard (arrow keys, Home/End; Shift+arrows extend a brush when brushing is enabled).
 */
export function LineChart({
  categories,
  series,
  label,
  height = 300,
  yDomain,
  format,
  formatCategory = (category) => category,
  brushable = false,
  brush,
  onBrush,
  footnote,
  zero,
}: {
  categories: readonly string[];
  series: readonly LineSeries[];
  /** Accessible name of the interactive chart surface. */
  label: string;
  height?: number;
  /** Shared scales across small multiples or comparisons. */
  yDomain?: readonly [number, number];
  format: (value: number) => string;
  formatCategory?: (category: string) => string;
  brushable?: boolean;
  brush?: IndexRange | null;
  onBrush?: (range: IndexRange | null) => void;
  footnote?: ReactNode;
  /** Draw a reference line at this value (e.g. zero or a league average). */
  zero?: number;
}) {
  const [measure, width] = useChartWidth();
  const allowed = useMotionAllowed();
  const [seenRef, seen] = useSeen<HTMLDivElement>();
  const clipId = useId();
  const readoutId = useId();
  const [active, setActive] = useState<number | null>(null);
  const [draft, setDraft] = useState<IndexRange | null>(null);
  const dragStart = useRef<number | null>(null);

  const [lo, hi] = useMemo(
    () => (yDomain ? [yDomain[0], yDomain[1]] : autoDomain(series, zero)),
    [yDomain, series, zero],
  );

  const plotW = Math.max(40, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const count = categories.length;
  const xAt = (index: number) =>
    PAD.left + (count <= 1 ? plotW / 2 : (index / (count - 1)) * plotW);
  const y = linear([lo, hi], [PAD.top + plotH, PAD.top]);
  const ticks = niceTicks(lo, hi, height > 240 ? 5 : 3);
  const xs = categories.map((_, index) => xAt(index));
  // Long sequences (an 82-game season) shrink their markers so they never bury the line.
  const dense = count > 1 && plotW / (count - 1) < 12;
  const maxLabels = Math.max(2, Math.floor(plotW / 62));
  const labelEvery = Math.max(1, Math.ceil(count / maxLabels));

  const paths = series.map((entry) => {
    const parts = segments(
      entry.values.map((value, index) => ({ value, index })),
      (point) => point.value,
    ).flatMap((part) => {
      if (!entry.breakBefore) return [part];
      const split: (typeof part)[] = [];
      for (const point of part) {
        if (!split.length || entry.breakBefore[point.index]) split.push([point]);
        else split[split.length - 1]!.push(point);
      }
      return split;
    });
    return parts.map((part) =>
      part
        .map(
          (point, order) =>
            `${order ? 'L' : 'M'}${xAt(point.index).toFixed(2)} ${y(point.value as number).toFixed(2)}`,
        )
        .join(''),
    );
  });

  const indexFromPointer = (event: PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!rect) return null;
    return nearestIndex(xs, event.clientX - rect.left);
  };

  const shownBrush = draft ?? brush ?? null;

  const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
    const index = indexFromPointer(event);
    if (index === null) return;
    if (index !== active) setActive(index);
    if (brushable && dragStart.current !== null) {
      const next: IndexRange = [
        Math.min(dragStart.current, index),
        Math.max(dragStart.current, index),
      ];
      if (!draft || draft[0] !== next[0] || draft[1] !== next[1]) setDraft(next);
    }
  };
  const onPointerDown = (event: PointerEvent<SVGRectElement>) => {
    if (!brushable) return;
    const index = indexFromPointer(event);
    if (index === null) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragStart.current = index;
    setDraft(null);
  };
  const onPointerUp = () => {
    if (!brushable || dragStart.current === null) return;
    const range = draft;
    dragStart.current = null;
    setDraft(null);
    onBrush?.(range && range[1] > range[0] ? range : null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!count) return;
    const current = active ?? -1;
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = Math.min(count - 1, current + 1);
    else if (event.key === 'ArrowLeft')
      next = Math.max(0, current < 0 ? 0 : current - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = count - 1;
    else if (event.key === 'Escape') {
      setActive(null);
      if (brushable && brush) onBrush?.(null);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    if (brushable && event.shiftKey) {
      const anchor = brush
        ? next > current
          ? brush[0]
          : brush[1]
        : current < 0
          ? next
          : current;
      const range: IndexRange = [Math.min(anchor, next), Math.max(anchor, next)];
      onBrush?.(range[1] > range[0] ? range : null);
    }
    setActive(next);
  };

  const readout =
    active === null
      ? ''
      : `${formatCategory(categories[active] ?? '')}: ${series
          .map((entry) => {
            const value = entry.values[active];
            return `${entry.label} ${value === null || value === undefined ? 'not recorded' : format(value)}`;
          })
          .join(', ')}`;

  const activeTop =
    active === null
      ? 0
      : Math.min(
          ...series
            .map((entry) => entry.values[active])
            .filter((value): value is number => value !== null && value !== undefined)
            .map((value) => y(value)),
          PAD.top + plotH,
        );

  return (
    <div className="lchart" ref={measure}>
      <div
        ref={seenRef}
        className="lchart__surface"
        role="group"
        aria-label={`${label}. Use the arrow keys to read each point${brushable ? '; hold Shift to select a range' : ''}.`}
        aria-describedby={readoutId}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={height} className="lchart__svg" aria-hidden="true">
          <defs>
            <clipPath id={clipId}>
              {allowed ? (
                <motion.rect
                  x={PAD.left - 8}
                  y={0}
                  width={plotW + 16}
                  height={height}
                  style={{ originX: 0, transformBox: 'fill-box' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: seen ? 1 : 0 }}
                  transition={{ duration: 1.25, ease: easings.arena }}
                />
              ) : (
                <rect x={PAD.left - 8} y={0} width={plotW + 16} height={height} />
              )}
            </clipPath>
          </defs>
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                className="ch-grid"
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text
                className="ch-axis"
                x={PAD.left - 8}
                y={y(tick) + 3.5}
                textAnchor="end"
              >
                {format(tick)}
              </text>
            </g>
          ))}
          {zero !== undefined ? (
            <line
              className="ch-zero"
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={y(zero)}
              y2={y(zero)}
            />
          ) : null}
          {categories.map((category, index) =>
            showCategoryLabel(index, count, labelEvery) ? (
              <text
                key={category + index}
                className="ch-axis"
                x={xAt(index)}
                y={height - 9}
                textAnchor={
                  count > 1 && index === 0
                    ? 'start'
                    : count > 1 && index === count - 1
                      ? 'end'
                      : 'middle'
                }
              >
                {formatCategory(category)}
              </text>
            ) : null,
          )}
          {shownBrush ? (
            <rect
              className="lchart__brush"
              x={xAt(shownBrush[0]) - 6}
              y={PAD.top - 6}
              width={xAt(shownBrush[1]) - xAt(shownBrush[0]) + 12}
              height={plotH + 12}
            />
          ) : null}
          {active !== null ? (
            <line
              className="lchart__cross"
              x1={xAt(active)}
              x2={xAt(active)}
              y1={PAD.top}
              y2={PAD.top + plotH}
            />
          ) : null}
          <g clipPath={`url(#${clipId})`}>
            {series.map((entry, seriesIndex) => (
              <g key={entry.id} data-series={entry.id}>
                {paths[seriesIndex]?.map((d, part) => (
                  <motion.path
                    key={part}
                    d={d}
                    initial={false}
                    animate={{ d }}
                    transition={springs.data}
                    fill="none"
                    stroke={entry.color}
                    strokeWidth={2.5}
                    strokeDasharray={entry.dash}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
                {entry.values.map((value, index) =>
                  value === null || value === undefined ? null : (
                    <path
                      key={index}
                      className="lchart__mark"
                      d={markerPath(
                        entry.shape ?? 'circle',
                        xAt(index),
                        y(value),
                        active === index ? 5 : dense ? 1.6 : 3.4,
                      )}
                      fill={entry.color}
                      stroke="#111114"
                      strokeWidth={dense && active !== index ? 0 : 1.5}
                    />
                  ),
                )}
              </g>
            ))}
          </g>
          <rect
            className="lchart__hit"
            x={PAD.left - 12}
            y={0}
            width={plotW + 24}
            height={height}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={() => {
              if (dragStart.current === null) setActive(null);
            }}
          />
        </svg>
        {active !== null ? (
          <ChartTip x={xAt(active)} y={activeTop} width={width}>
            <span className="tip__k">{formatCategory(categories[active] ?? '')}</span>
            {series.map((entry) => {
              const value = entry.values[active];
              return (
                <TipRow
                  key={entry.id}
                  swatch={entry.color}
                  label={entry.label}
                  value={
                    value === null || value === undefined
                      ? 'Not recorded'
                      : format(value)
                  }
                />
              );
            })}
          </ChartTip>
        ) : null}
        <p id={readoutId} className="sr-only" aria-live="polite">
          {readout}
        </p>
      </div>
      {footnote ? <p className="lchart__note">{footnote}</p> : null}
    </div>
  );
}
