import { motion } from 'motion/react';
import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';

import { useMotionAllowed } from '../motion/MotionPreference';
import { easings, springs } from '../motion/tokens';
import { ChartTip, TipRow } from './ChartTip';
import { linear, niceDomain, niceTicks } from './scale';
import { useChartWidth } from './useChartWidth';

const PAD = { top: 16, right: 12, bottom: 28, left: 40 };

export interface BarDatum {
  key: string;
  label: string;
  value: number | null;
  /** Extra readout lines for the tooltip. */
  detail?: readonly { label: string; value: string }[];
  tone?: 'default' | 'accent' | 'muted';
}

/**
 * Vertical bars for a sequence (a game log, a season run). Bars rise from the baseline when
 * they enter view, missing values are marked as not recorded rather than drawn as zero, and the
 * keyboard can step through every bar.
 */
export function BarChart({
  data,
  label,
  format,
  height = 220,
  reference,
  yDomain,
  color = 'var(--chalk-3)',
  accent = 'var(--red-hi)',
  onSelect,
  selected,
  tickLabel,
}: {
  data: readonly BarDatum[];
  label: string;
  format: (value: number) => string;
  height?: number;
  reference?: { value: number; label: string } | null;
  yDomain?: readonly [number, number];
  color?: string;
  accent?: string;
  onSelect?: (index: number) => void;
  selected?: number | null;
  tickLabel?: (datum: BarDatum, index: number) => ReactNode;
}) {
  const [measure, width] = useChartWidth();
  const allowed = useMotionAllowed();
  const readoutId = useId();
  const [active, setActive] = useState<number | null>(null);

  const [lo, hi] = useMemo(() => {
    if (yDomain) return [yDomain[0], yDomain[1]] as const;
    const values = data
      .map((datum) => datum.value)
      .filter((value): value is number => value !== null && Number.isFinite(value));
    if (reference) values.push(reference.value);
    const max = values.length ? Math.max(...values) : 1;
    const min = values.length ? Math.min(0, ...values) : 0;
    return niceDomain(min, max || 1, 4);
  }, [data, reference, yDomain]);

  const plotW = Math.max(40, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const y = linear([lo, hi], [PAD.top + plotH, PAD.top]);
  const step = plotW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(28, step * 0.68));
  const xAt = (index: number) => PAD.left + step * index + step / 2;
  const ticks = niceTicks(lo, hi, 4);
  const labelEvery = Math.max(
    1,
    Math.ceil(data.length / Math.max(2, Math.floor(plotW / 54))),
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!data.length) return;
    const current = active ?? -1;
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = Math.min(data.length - 1, current + 1);
    else if (event.key === 'ArrowLeft') next = Math.max(0, current - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = data.length - 1;
    else if (
      (event.key === 'Enter' || event.key === ' ') &&
      active !== null &&
      onSelect
    ) {
      event.preventDefault();
      onSelect(active);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  };

  const activeDatum = active === null ? null : data[active];

  return (
    <div className="bchart" ref={measure}>
      <div
        className="lchart__surface"
        role="group"
        tabIndex={0}
        aria-label={`${label}. Use the arrow keys to read each bar${onSelect ? ', Enter to open it' : ''}.`}
        aria-describedby={readoutId}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={height} aria-hidden="true" className="lchart__svg">
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
          {data.map((datum, index) => {
            const x = xAt(index) - barW / 2;
            const isOn = active === index || selected === index;
            const fill =
              datum.tone === 'accent'
                ? accent
                : datum.tone === 'muted'
                  ? 'var(--chalk-4)'
                  : color;
            if (datum.value === null || !Number.isFinite(datum.value)) {
              return (
                <rect
                  key={datum.key}
                  className="bchart__missing"
                  x={x}
                  y={y(0) - 3}
                  width={barW}
                  height={3}
                />
              );
            }
            const top = Math.min(y(datum.value), y(0));
            const h = Math.abs(y(0) - y(datum.value));
            return allowed ? (
              <motion.rect
                key={datum.key}
                className={`bchart__bar ${isOn ? 'is-on' : ''}`}
                x={x}
                width={barW}
                fill={isOn ? accent : fill}
                rx={1.5}
                style={{ originY: 1, transformBox: 'fill-box' }}
                initial={{ scaleY: 0, y: top, height: h }}
                whileInView={{ scaleY: 1 }}
                animate={{ y: top, height: h }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  scaleY: {
                    duration: 0.7,
                    ease: easings.arena,
                    delay: Math.min(0.5, index * 0.012),
                  },
                  default: springs.data,
                }}
              />
            ) : (
              <rect
                key={datum.key}
                className={`bchart__bar ${isOn ? 'is-on' : ''}`}
                x={x}
                y={top}
                width={barW}
                height={h}
                rx={1.5}
                fill={isOn ? accent : fill}
              />
            );
          })}
          <line
            className="ch-zero"
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={y(0)}
            y2={y(0)}
          />
          {reference ? (
            <g className="bchart__ref">
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(reference.value)}
                y2={y(reference.value)}
              />
              <text
                className="ch-axis ch-halo"
                x={PAD.left + plotW}
                y={y(reference.value) - 6}
                textAnchor="end"
              >
                {reference.label}
              </text>
            </g>
          ) : null}
          {data.map((datum, index) =>
            index % labelEvery === 0 ? (
              <text
                key={datum.key}
                className="ch-axis"
                x={xAt(index)}
                y={height - 9}
                textAnchor="middle"
              >
                {tickLabel ? tickLabel(datum, index) : datum.label}
              </text>
            ) : null,
          )}
          {data.map((datum, index) => (
            <rect
              key={`hit-${datum.key}`}
              className="lchart__hit"
              x={PAD.left + step * index}
              y={0}
              width={step}
              height={height}
              onPointerEnter={() => setActive(index)}
              onPointerLeave={() =>
                setActive((current) => (current === index ? null : current))
              }
              onClick={onSelect ? () => onSelect(index) : undefined}
              style={onSelect ? { cursor: 'pointer' } : undefined}
            />
          ))}
        </svg>
        {activeDatum && active !== null ? (
          <ChartTip
            x={xAt(active)}
            y={activeDatum.value === null ? y(0) : y(Math.max(0, activeDatum.value))}
            width={width}
          >
            <span className="tip__k">{activeDatum.label}</span>
            <span className="tip__v">
              {activeDatum.value === null ? 'Not recorded' : format(activeDatum.value)}
            </span>
            {activeDatum.detail?.map((line) => (
              <TipRow key={line.label} label={line.label} value={line.value} />
            ))}
          </ChartTip>
        ) : null}
        <p id={readoutId} className="sr-only" aria-live="polite">
          {activeDatum
            ? `${activeDatum.label}: ${activeDatum.value === null ? 'not recorded' : format(activeDatum.value)}`
            : ''}
        </p>
      </div>
    </div>
  );
}
