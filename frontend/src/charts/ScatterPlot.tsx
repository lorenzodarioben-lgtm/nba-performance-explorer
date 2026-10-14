import { motion } from 'motion/react';
import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

import { useSeen } from '../motion/choreography';
import { useMotionAllowed } from '../motion/MotionPreference';
import { easings } from '../motion/tokens';
import { ChartTip, TipRow } from './ChartTip';
import { linear, niceDomain, niceTicks } from './scale';
import { useChartWidth } from './useChartWidth';

export interface ScatterPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  /** Short tag drawn next to the mark (e.g. its table row number). */
  tag?: string | undefined;
  highlight?: boolean | undefined;
}

const PAD = { top: 16, right: 20, bottom: 44, left: 56 };

/**
 * A relationship chart: nearest-point hover with a crosshair, keyboard reading in x order and,
 * when `onBrush` is given, rectangle brushing. The brush rectangle follows the pointer by
 * writing attributes directly (no React state per frame); the selection is committed once on
 * release.
 */
export function ScatterPlot({
  points,
  label,
  xLabel,
  yLabel,
  formatX,
  formatY,
  height = 340,
  onBrush,
  selected,
}: {
  points: readonly ScatterPoint[];
  label: string;
  xLabel: string;
  yLabel: string;
  formatX: (value: number) => string;
  formatY: (value: number) => string;
  height?: number;
  onBrush?: ((ids: readonly string[]) => void) | undefined;
  selected?: ReadonlySet<string> | undefined;
}) {
  const [measure, width] = useChartWidth();
  const allowed = useMotionAllowed();
  const [seenRef, seen] = useSeen<HTMLDivElement>();
  const readoutId = useId();
  const [active, setActive] = useState<string | null>(null);
  const brushRect = useRef<SVGRectElement>(null);
  const dragStart = useRef<[number, number] | null>(null);

  const [x0, x1] = useMemo(() => {
    const xs = points.map((p) => p.x);
    const min = Math.min(...xs);
    const max = Math.max(...xs);
    const pad = (max - min || Math.abs(max) || 1) * 0.06;
    // Never pad a non-negative measure below zero.
    return niceDomain(min >= 0 ? Math.max(0, min - pad) : min - pad, max + pad, 5);
  }, [points]);
  const [y0, y1] = useMemo(() => {
    const ys = points.map((p) => p.y);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const pad = (max - min || Math.abs(max) || 1) * 0.08;
    return niceDomain(min >= 0 ? Math.max(0, min - pad) : min - pad, max + pad, 5);
  }, [points]);
  const plotW = Math.max(60, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const x = linear([x0, x1], [PAD.left, PAD.left + plotW]);
  const y = linear([y0, y1], [PAD.top + plotH, PAD.top]);
  const byX = useMemo(
    () => [...points].sort((a, b) => a.x - b.x || a.y - b.y),
    [points],
  );
  const activePoint = points.find((p) => p.id === active) ?? null;

  const local = (event: PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    return rect
      ? ([event.clientX - rect.left, event.clientY - rect.top] as const)
      : null;
  };

  const nearest = (px: number, py: number) => {
    let best: ScatterPoint | null = null;
    let distance = Infinity;
    for (const point of points) {
      const d = Math.hypot(x(point.x) - px, y(point.y) - py);
      if (d < distance) {
        distance = d;
        best = point;
      }
    }
    return distance <= 48 ? best : null;
  };

  const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
    const at = local(event);
    if (!at) return;
    if (dragStart.current && brushRect.current) {
      const [sx, sy] = dragStart.current;
      brushRect.current.setAttribute('x', String(Math.min(sx, at[0])));
      brushRect.current.setAttribute('y', String(Math.min(sy, at[1])));
      brushRect.current.setAttribute('width', String(Math.abs(at[0] - sx)));
      brushRect.current.setAttribute('height', String(Math.abs(at[1] - sy)));
      brushRect.current.style.display = 'block';
      return;
    }
    const hit = nearest(at[0], at[1]);
    const id = hit?.id ?? null;
    if (id !== active) setActive(id);
  };

  const onPointerDown = (event: PointerEvent<SVGRectElement>) => {
    if (!onBrush) return;
    const at = local(event);
    if (!at) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragStart.current = [at[0], at[1]];
  };

  const onPointerUp = (event: PointerEvent<SVGRectElement>) => {
    if (!onBrush || !dragStart.current) return;
    const at = local(event);
    const [sx, sy] = dragStart.current;
    dragStart.current = null;
    if (brushRect.current) brushRect.current.style.display = 'none';
    if (!at || (Math.abs(at[0] - sx) < 6 && Math.abs(at[1] - sy) < 6)) {
      onBrush([]);
      return;
    }
    const [minX, maxX] = [Math.min(sx, at[0]), Math.max(sx, at[0])];
    const [minY, maxY] = [Math.min(sy, at[1]), Math.max(sy, at[1])];
    onBrush(
      points
        .filter((p) => {
          const px = x(p.x);
          const py = y(p.y);
          return px >= minX && px <= maxX && py >= minY && py <= maxY;
        })
        .map((p) => p.id),
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!byX.length) return;
    const index = byX.findIndex((p) => p.id === active);
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      next = Math.min(byX.length - 1, index + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = Math.max(0, index < 0 ? 0 : index - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = byX.length - 1;
    else if (event.key === 'Escape') {
      setActive(null);
      onBrush?.([]);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setActive(byX[next]?.id ?? null);
  };

  const xTicks = niceTicks(x0, x1, Math.max(3, Math.floor(plotW / 110)));
  const yTicks = niceTicks(y0, y1, 5);
  const dimming = Boolean(selected && selected.size);

  return (
    <div className="scatter" ref={measure}>
      <div
        ref={seenRef}
        className="lchart__surface"
        role="group"
        tabIndex={0}
        aria-label={`${label}. Use the arrow keys to read each point in x order${onBrush ? '; drag on the chart to select a group' : ''}.`}
        aria-describedby={readoutId}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={height} aria-hidden="true" className="lchart__svg">
          {yTicks.map((tick) => (
            <g key={`y${tick}`}>
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
                {formatY(tick)}
              </text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <g key={`x${tick}`}>
              <line
                className="ch-grid"
                x1={x(tick)}
                x2={x(tick)}
                y1={PAD.top}
                y2={PAD.top + plotH}
              />
              <text
                className="ch-axis"
                x={x(tick)}
                y={PAD.top + plotH + 16}
                textAnchor="middle"
              >
                {formatX(tick)}
              </text>
            </g>
          ))}
          <text
            className="ch-axis"
            x={PAD.left + plotW / 2}
            y={height - 6}
            textAnchor="middle"
          >
            {xLabel}
          </text>
          <text
            className="ch-axis"
            x={14}
            y={PAD.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 14 ${PAD.top + plotH / 2})`}
          >
            {yLabel}
          </text>
          {activePoint ? (
            <g className="scatter__cross">
              <line
                x1={x(activePoint.x)}
                x2={x(activePoint.x)}
                y1={PAD.top}
                y2={PAD.top + plotH}
              />
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(activePoint.y)}
                y2={y(activePoint.y)}
              />
            </g>
          ) : null}
          {points.map((point, index) => {
            const isOn = point.id === active;
            const inSelection = !dimming || selected?.has(point.id);
            return (
              <g key={point.id} data-point={point.id} opacity={inSelection ? 1 : 0.25}>
                <motion.circle
                  cx={x(point.x)}
                  cy={y(point.y)}
                  r={point.highlight ? 7 : isOn ? 6.5 : 5}
                  fill={point.highlight ? '#ef4444' : '#3b82f6'}
                  stroke={isOn ? '#f4f3f1' : '#111114'}
                  strokeWidth={isOn ? 2 : 1.5}
                  style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
                  initial={allowed ? { scale: 0, opacity: 0 } : false}
                  animate={seen ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: easings.arena,
                    delay: Math.min(0.6, index * 0.01),
                  }}
                />
                {point.tag ? (
                  <text
                    className="ch-axis ch-halo"
                    x={x(point.x) + 8}
                    y={y(point.y) - 7}
                  >
                    {point.tag}
                  </text>
                ) : null}
              </g>
            );
          })}
          <rect
            ref={brushRect}
            className="lchart__brush"
            x={0}
            y={0}
            width={0}
            height={0}
            style={{ display: 'none' }}
          />
          <rect
            className="lchart__hit"
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={() => {
              if (!dragStart.current) setActive(null);
            }}
          />
        </svg>
        {activePoint ? (
          <ChartTip x={x(activePoint.x)} y={y(activePoint.y)} width={width}>
            <span className="tip__k">{activePoint.label}</span>
            <TipRow label={xLabel} value={formatX(activePoint.x)} />
            <TipRow label={yLabel} value={formatY(activePoint.y)} />
          </ChartTip>
        ) : null}
        <p id={readoutId} className="sr-only" aria-live="polite">
          {activePoint
            ? `${activePoint.label}: ${xLabel} ${formatX(activePoint.x)}, ${yLabel} ${formatY(activePoint.y)}`
            : ''}
        </p>
      </div>
    </div>
  );
}
