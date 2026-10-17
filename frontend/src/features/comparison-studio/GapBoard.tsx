import { motion } from 'motion/react';
import type {
  ProfileMetric,
  RecordedPlayerComparisonResponse,
} from '@nba-performance-explorer/contracts';

import { useSeen } from '../../motion/choreography';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { springs } from '../../motion/tokens';
import { markerPath } from '../../charts/markers';
import { useChartWidth } from '../../charts/useChartWidth';
import { METRIC_LABEL, PLAYER_STYLE } from './studio-style';

export type GapScale = 'z' | 'percentile' | 'raw';

const LABEL_W = 132;
const ROW_H = 46;
const PAD_R = 16;

/**
 * The gap board: one row per category, ordered by the widest standardised gap, every player a
 * distinct shape and colour on the row's track. The shared z scale (−3 to +3 cohort SDs) and the
 * percentile scale compare rows directly; the raw scale gives each row its own range. Markers
 * move by transform when the scale changes.
 */
export function GapBoard({
  data,
  scale,
}: {
  data: RecordedPlayerComparisonResponse;
  scale: GapScale;
}) {
  const [measure, width] = useChartWidth(640);
  const [seenRef, seen] = useSeen<HTMLDivElement>();
  const allowed = useMotionAllowed();
  const trackW = Math.max(120, width - LABEL_W - PAD_R);
  const players = data.players.filter((p) => p.qualified);
  const height = data.gaps.length * ROW_H + 26;
  // The shared z scale covers every value (never clipped), at least ±3 cohort SDs.
  const zMax = Math.max(
    3,
    Math.ceil(
      Math.max(...players.flatMap((p) => p.zScores.map((z) => Math.abs(z ?? 0)))),
    ),
  );
  const position = (
    metric: ProfileMetric,
    value: number | null,
    raw: readonly number[],
  ) => {
    if (value === null) return null;
    if (scale === 'z') return (value + zMax) / (2 * zMax);
    if (scale === 'percentile') return value / 100;
    const lo = Math.min(...raw),
      hi = Math.max(...raw);
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.15;
    return (value - (lo - pad)) / (hi - lo + 2 * pad);
  };
  const midline = scale === 'z' ? 0.5 : scale === 'percentile' ? 0.5 : null;
  return (
    <div className="gapboard" ref={measure}>
      <div ref={seenRef}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Gap board on the ${scale === 'z' ? 'standardised' : scale} scale; exact values are in the table below.`}
        >
          {scale !== 'raw' ? (
            <g className="gapboard__axis">
              {(scale === 'z'
                ? Array.from({ length: 2 * zMax + 1 }, (_, k) => k - zMax)
                : [0, 25, 50, 75, 100]
              ).map((t) => {
                const x =
                  LABEL_W +
                  (scale === 'z' ? (t + zMax) / (2 * zMax) : t / 100) * trackW;
                return (
                  <g key={t}>
                    <line x1={x} x2={x} y1={6} y2={height - 20} className="ch-grid" />
                    <text x={x} y={height - 6} textAnchor="middle" className="ch-axis">
                      {scale === 'z' ? (t > 0 ? `+${t}` : t) : t}
                    </text>
                  </g>
                );
              })}
            </g>
          ) : null}
          {midline !== null ? (
            <line
              className="ch-zero"
              x1={LABEL_W + midline * trackW}
              x2={LABEL_W + midline * trackW}
              y1={6}
              y2={height - 20}
            />
          ) : null}
          {data.gaps.map((gap, row) => {
            const i = data.metrics.indexOf(gap.metric);
            const y = 10 + row * ROW_H + ROW_H / 2;
            const raw = players.flatMap((p) =>
              p.values[i] === null ? [] : [p.values[i]!],
            );
            return (
              <g key={gap.metric} className="gapboard__row">
                <text x={0} y={y + 4} className="gapboard__label">
                  {METRIC_LABEL[gap.metric]}
                </text>
                <line
                  x1={LABEL_W}
                  x2={LABEL_W + trackW}
                  y1={y}
                  y2={y}
                  className="gapboard__track"
                />
                {players.map((p) => {
                  const order = data.players.indexOf(p);
                  const v =
                    scale === 'z'
                      ? p.zScores[i]!
                      : scale === 'percentile'
                        ? p.percentiles[i]!
                        : p.values[i]!;
                  const at = position(gap.metric, v, raw);
                  if (at === null) return null;
                  const style = PLAYER_STYLE[order]!;
                  const x = LABEL_W + at * trackW;
                  return (
                    <motion.g
                      key={p.playerId}
                      initial={
                        allowed ? { x: LABEL_W + 0.5 * trackW, opacity: 0 } : false
                      }
                      animate={{
                        x: seen || !allowed ? x : LABEL_W + 0.5 * trackW,
                        opacity: seen || !allowed ? 1 : 0,
                      }}
                      transition={allowed ? springs.data : { duration: 0 }}
                    >
                      <path
                        d={markerPath(style.shape, 0, y + style.lane, 6)}
                        fill={style.color}
                        stroke="#111114"
                        strokeWidth={1.5}
                      >
                        <title>
                          {p.name}: {p.values[i]!.toFixed(1)} {METRIC_LABEL[gap.metric]}
                          , z {p.zScores[i]!.toFixed(2)},{' '}
                          {Math.round(p.percentiles[i]!)}th percentile
                        </title>
                      </path>
                    </motion.g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="lchart__note">
        {scale === 'z'
          ? `Standardised: cohort standard deviations from the cohort mean (centre line), ±${zMax} shown so no value is clipped. Rows share one scale, so distances compare across categories.`
          : scale === 'percentile'
            ? 'Percentile within the cohort (centre line = 50th). Rows share one scale.'
            : 'Raw values: each row has its own range around these players, so compare positions within a row only.'}{' '}
        Rows run from the widest gap to the closest.
      </p>
    </div>
  );
}
