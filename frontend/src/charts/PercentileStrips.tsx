import { motion } from 'motion/react';

import { useSeen } from '../motion/choreography';
import { useMotionAllowed } from '../motion/MotionPreference';
import { easings } from '../motion/tokens';
import { markerPath, type MarkerShape } from './markers';
import { useChartWidth } from './useChartWidth';

export interface StripPlayer {
  id: string;
  name: string;
  color: string;
  shape: MarkerShape;
  /** Percentile 0–100 per category key; null when the player has no value there. */
  values: Readonly<Record<string, number | null>>;
}

const LABEL_W = 64;
const VALUE_W = 0;
const LANE = 12;

/**
 * Percentile strips: one 0–100 track per category, every player a marker on it. Players are told
 * apart by shape, lane and colour (never colour alone); a higher percentile is a position, not a
 * verdict. Markers appear in place (no sliding through values they never had).
 */
export function PercentileStrips({
  categories,
  players,
  label,
}: {
  categories: readonly { key: string; label: string }[];
  players: readonly StripPlayer[];
  label: string;
}) {
  const [measure, width] = useChartWidth();
  const allowed = useMotionAllowed();
  const [seenRef, seen] = useSeen<HTMLDivElement>();
  const rowH = Math.max(34, players.length * LANE + 14);
  const height = categories.length * rowH + 28;
  const trackX = LABEL_W;
  const trackW = Math.max(60, width - LABEL_W - VALUE_W - 12);
  const xAt = (pct: number) =>
    trackX + (Math.max(0, Math.min(100, pct)) / 100) * trackW;

  return (
    <div className="pstrips" ref={measure}>
      <div ref={seenRef}>
        <svg width={width} height={height} role="img" aria-label={label}>
          {[0, 25, 50, 75, 100].map((tick) => (
            <g key={tick}>
              <line
                className={tick === 50 ? 'ch-zero' : 'ch-grid'}
                x1={xAt(tick)}
                x2={xAt(tick)}
                y1={6}
                y2={height - 22}
              />
              <text
                className="ch-axis"
                x={xAt(tick)}
                y={height - 6}
                textAnchor="middle"
              >
                {tick}
              </text>
            </g>
          ))}
          {categories.map((category, row) => {
            const top = row * rowH + 8;
            return (
              <g key={category.key}>
                <text
                  className="ch-label"
                  x={0}
                  y={top + rowH / 2}
                  dominantBaseline="middle"
                >
                  {category.label}
                </text>
                <rect
                  x={trackX}
                  y={top + 4}
                  width={trackW}
                  height={rowH - 8}
                  rx={2}
                  fill="rgba(255,255,255,0.03)"
                />
              </g>
            );
          })}
          {players.map((player, lane) => (
            <g key={player.id} data-profile={player.id}>
              <title>{player.name}</title>
              {categories.map((category, row) => {
                const value = player.values[category.key];
                if (value === null || value === undefined) return null;
                const cy = row * rowH + 8 + 10 + lane * LANE;
                const cx = xAt(value);
                return (
                  <motion.path
                    key={category.key}
                    d={markerPath(player.shape, cx, cy, 5)}
                    fill={player.color}
                    stroke="#111114"
                    strokeWidth={1.5}
                    style={{ transformBox: 'fill-box', originX: 0.5, originY: 0.5 }}
                    initial={allowed ? { scale: 0, opacity: 0 } : false}
                    animate={seen ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                    transition={{
                      duration: 0.45,
                      ease: easings.arena,
                      delay: row * 0.05 + lane * 0.08,
                    }}
                  />
                );
              })}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
