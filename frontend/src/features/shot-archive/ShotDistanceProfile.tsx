import { motion } from 'motion/react';
import type { ShotResponse } from '@nba-performance-explorer/contracts';

import { useSeen } from '../../motion/choreography';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { easings } from '../../motion/tokens';
import { linear } from '../../charts/scale';
import { useChartWidth } from '../../charts/useChartWidth';
import { ResearchTable } from '../research/ResearchShell';

type Group = ShotResponse['groups'][number];

const PAD = { top: 14, right: 40, bottom: 30, left: 34 };
const HEIGHT = 190;

const binLabel = (b: Group['distances'][number]) =>
  b.toFeet === null ? `${b.fromFeet}+` : `${b.fromFeet}–${b.toFeet}`;
const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`);

/**
 * Where a group's attempts come from by source distance: bars count attempts (the hatched part is
 * three-point attempts), red diamonds mark FG% on the right-hand scale where a bin meets the
 * minimum-attempts rule. `maxAttempts` is shared across panels so equal bars mean equal counts.
 */
export function ShotDistanceProfile({
  group,
  maxAttempts,
  minAttempts,
}: {
  group: Group;
  maxAttempts: number;
  minAttempts: number;
}) {
  const [measure, width] = useChartWidth(420);
  const [seenRef, seen] = useSeen<HTMLDivElement>();
  const allowed = useMotionAllowed();
  const plotW = Math.max(60, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const bins = group.distances;
  const step = plotW / bins.length;
  const barW = Math.max(4, step * 0.64);
  const y = linear([0, Math.max(1, maxAttempts)], [PAD.top + plotH, PAD.top]);
  const yPct = linear([0, 1], [PAD.top + plotH, PAD.top]);
  const x = (i: number) => PAD.left + step * i + step / 2;
  const points = bins.flatMap((b, i) =>
    b.fgPercentage === null ? [] : [{ i, v: b.fgPercentage }],
  );
  const line = points
    .map((p, n) => {
      const joined = n > 0 && points[n - 1]!.i === p.i - 1;
      return `${joined ? 'L' : 'M'}${x(p.i).toFixed(1)},${yPct(p.v).toFixed(1)}`;
    })
    .join('');
  const hatch = `hatch-${(group.playerId ?? 'all').replace(/\W/g, '')}`;
  return (
    <div className="distprofile" ref={measure} data-chart="distance-profile">
      <p className="distprofile__head">
        <b>Distance profile</b>
        <span>
          Mean source distance{' '}
          {group.meanDistanceFeet === null
            ? '—'
            : `${group.meanDistanceFeet.toFixed(1)} ft`}
        </span>
      </p>
      <div ref={seenRef}>
        <svg
          width={width}
          height={HEIGHT}
          className="lchart__svg"
          role="img"
          aria-label={`${group.label}: attempts and field-goal percentage by source distance; exact values in the table below.`}
        >
          <defs>
            <pattern
              id={hatch}
              width="4"
              height="4"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="4" height="4" fill="var(--chalk-4)" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="4"
                stroke="var(--coal)"
                strokeWidth="1.6"
              />
            </pattern>
          </defs>
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line
                className="ch-grid"
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={yPct(t)}
                y2={yPct(t)}
              />
              <text
                className="ch-axis"
                x={PAD.left + plotW + 6}
                y={yPct(t) + 3.5}
              >{`${t * 100}%`}</text>
              <text
                className="ch-axis"
                x={PAD.left - 6}
                y={yPct(t) + 3.5}
                textAnchor="end"
              >
                {Math.round(t * Math.max(1, maxAttempts))}
              </text>
            </g>
          ))}
          {bins.map((b, i) => {
            const top = y(b.attempts);
            const h = PAD.top + plotH - top;
            const threeH = b.attempts ? (h * b.threePointAttempts) / b.attempts : 0;
            const bar = (
              <>
                <rect
                  x={x(i) - barW / 2}
                  y={top}
                  width={barW}
                  height={h}
                  className="distprofile__bar"
                />
                {threeH > 0 ? (
                  <rect
                    x={x(i) - barW / 2}
                    y={top}
                    width={barW}
                    height={threeH}
                    fill={`url(#${hatch})`}
                  />
                ) : null}
              </>
            );
            return (
              <g key={b.fromFeet}>
                {allowed ? (
                  <motion.g
                    style={{ originY: 1, transformBox: 'fill-box' }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: seen ? 1 : 0 }}
                    transition={{ duration: 0.7, ease: easings.arena, delay: i * 0.03 }}
                  >
                    {bar}
                  </motion.g>
                ) : (
                  bar
                )}
                {step >= 34 || i % 2 === 0 ? (
                  <text
                    className="ch-axis"
                    x={x(i)}
                    y={HEIGHT - 10}
                    textAnchor="middle"
                  >
                    {binLabel(b)}
                  </text>
                ) : null}
                <title>
                  {binLabel(b)} ft: {b.attempts} attempts ({b.threePointAttempts}{' '}
                  threes), {b.makes} makes, FG {pct(b.fgPercentage)}
                </title>
              </g>
            );
          })}
          <path d={line} className="distprofile__line" />
          {points.map((p) => (
            <path
              key={p.i}
              className="distprofile__dot"
              d={`M${x(p.i)},${yPct(p.v) - 5}l5,5l-5,5l-5,-5z`}
            />
          ))}
        </svg>
      </div>
      <p className="lchart__note">
        Feet from the source distance field. Hatching marks three-point attempts; red
        diamonds are FG% where a bin has at least {minAttempts} attempts.
      </p>
      <ResearchTable label={`${group.label} shot distance profile`}>
        <table>
          <caption>
            Every filtered attempt by source distance, before pagination
          </caption>
          <thead>
            <tr>
              <th scope="col">Feet</th>
              <th scope="col">Attempts</th>
              <th scope="col">3PA</th>
              <th scope="col">Makes</th>
              <th scope="col">FG</th>
              <th scope="col">Points/attempt</th>
            </tr>
          </thead>
          <tbody>
            {bins.map((b) => (
              <tr key={b.fromFeet}>
                <th scope="row">{binLabel(b)}</th>
                <td>{b.attempts}</td>
                <td>{b.threePointAttempts}</td>
                <td>{b.makes}</td>
                <td>{pct(b.fgPercentage)}</td>
                <td>{b.pointsPerAttempt?.toFixed(3) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResearchTable>
    </div>
  );
}
