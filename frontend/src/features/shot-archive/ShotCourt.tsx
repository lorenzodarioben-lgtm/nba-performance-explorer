import type { ShotAttempt, ShotResponse } from '@nba-performance-explorer/contracts';
import type { Ref } from 'react';

import { BasketballCourt } from '../../charts/BasketballCourt';
import { COURT, zoneAreas, type SourceZone } from '../../charts/court';
import { EFFICIENCY_FULL_SCALE } from './shot-scales';

export type ShotView = 'dots' | 'density' | 'efficiency' | 'zones';
type Group = ShotResponse['groups'][number];

// The studio crops at half court. Recorded attempts beyond it (long heaves) are never moved or
// dropped: they stay in every table and are counted at the far edge of the court.
const CROP = COURT.halfCourt;
const MADE = '#f4f3f1';
const MISS = '#ef4444';
const HEAT = '251,191,36';

// Label anchors (court units) for the source zones, used only to place text in the zone view.
const ZONE_LABEL: Partial<Record<SourceZone, [number, number]>> = {
  'Restricted Area': [0, 18],
  'In The Paint (Non-RA)': [0, 96],
  'Mid-Range': [-150, 120],
  'Left Corner 3': [-235, 30],
  'Right Corner 3': [235, 30],
  'Above the Break 3': [0, 300],
};

const ratio = (n: number | null) => (n === null ? '—' : `${(n * 100).toFixed(0)}%`);

export function beyondCrop(shots: readonly ShotAttempt[]) {
  return shots.filter((shot) => shot.y !== null && shot.y > CROP).length;
}

export function ShotCourt({
  view,
  shots,
  group,
  maxDensity,
  activeShot,
  onActiveShot,
  svgRef,
  title,
  selectedZone = null,
  onZone,
}: {
  view: ShotView;
  shots: readonly ShotAttempt[];
  group: Group;
  /** Shared across every panel so equal shading means equal counts. */
  maxDensity: number;
  activeShot: string | null;
  onActiveShot: (id: string | null) => void;
  svgRef: Ref<SVGSVGElement>;
  title: string;
  /** The zone filter in force, outlined on the zone view. */
  selectedZone?: string | null;
  /** Pointer shortcut for the zone filter; the page offers the same choice as buttons. */
  onZone?: (zone: string) => void;
}) {
  const located = shots.filter((shot) => shot.x !== null && shot.y !== null);
  const zoneTotal = group.zones.reduce((sum, zone) => sum + zone.attempts, 0);
  return (
    <BasketballCourt
      side="bottom"
      depth={CROP}
      svgRef={svgRef}
      aria-hidden="true"
      className="shotcourt"
      data-view={view}
      data-title={title}
    >
      {(projection) => {
        const P = projection.point;
        if (view === 'density') {
          return (
            <g className="shotcourt__density">
              {group.cells.map((cell) => {
                const [x, yTop] = P(cell.x * 10, cell.y * 10 + 50);
                const opacity = 0.12 + (0.78 * cell.attempts) / Math.max(1, maxDensity);
                return (
                  <rect
                    key={`${cell.x}:${cell.y}`}
                    data-cell={`${cell.x}:${cell.y}`}
                    data-attempts={cell.attempts}
                    x={x}
                    y={yTop}
                    width={50}
                    height={50}
                    fill={`rgba(${HEAT},${opacity.toFixed(3)})`}
                  >
                    <title>
                      {cell.x} to {cell.x + 5} ft across, {cell.y} to {cell.y + 5} ft
                      out: {cell.attempts} attempts, {cell.makes} makes
                    </title>
                  </rect>
                );
              })}
            </g>
          );
        }
        if (view === 'efficiency') {
          // Only cells that meet the minimum-attempts rule are coloured, by points per attempt
          // relative to the panel's own (red above, blue below, full strength at 0.6 points).
          // Points per attempt, not FG%, so threes and twos are measured on one scale. Thinner
          // cells keep a faint dashed outline: located attempts are never hidden.
          const base = group.pointsPerAttempt;
          return (
            <g className="shotcourt__efficiency">
              {group.cells.map((cell) => {
                const [x, yTop] = P(cell.x * 10, cell.y * 10 + 50);
                const key = `${cell.x}:${cell.y}`;
                const where = `${cell.x} to ${cell.x + 5} ft across, ${cell.y} to ${cell.y + 5} ft out`;
                if (cell.pointsPerAttempt === null || base === null)
                  return (
                    <rect
                      key={key}
                      data-cell={key}
                      data-qualified="false"
                      x={x + 4}
                      y={yTop + 4}
                      width={42}
                      height={42}
                      fill="none"
                      stroke="rgba(244,243,241,0.22)"
                      strokeDasharray="4 4"
                    >
                      <title>
                        {where}: {cell.attempts} attempts, too few for a rate
                      </title>
                    </rect>
                  );
                const diff = cell.pointsPerAttempt - base;
                const strength = Math.min(1, Math.abs(diff) / EFFICIENCY_FULL_SCALE);
                return (
                  <rect
                    key={key}
                    data-cell={key}
                    data-qualified="true"
                    data-ppa={cell.pointsPerAttempt}
                    x={x}
                    y={yTop}
                    width={50}
                    height={50}
                    fill={
                      diff >= 0
                        ? `rgba(239,68,68,${(0.18 + 0.72 * strength).toFixed(3)})`
                        : `rgba(59,130,246,${(0.18 + 0.72 * strength).toFixed(3)})`
                    }
                    stroke="rgba(10,10,11,0.9)"
                    strokeWidth={1.5}
                  >
                    <title>
                      {where}: {cell.makes}/{cell.attempts},{' '}
                      {cell.pointsPerAttempt.toFixed(2)} points per attempt vs panel{' '}
                      {base.toFixed(2)}
                    </title>
                  </rect>
                );
              })}
            </g>
          );
        }
        if (view === 'zones') {
          const areas = zoneAreas(projection);
          return (
            <g className="shotcourt__zones">
              {group.zones.map((zone) => {
                const d = areas[zone.zone as SourceZone];
                if (!d) return null;
                const share = zoneTotal ? zone.attempts / zoneTotal : 0;
                return (
                  <path
                    key={zone.zone}
                    d={d}
                    data-zone={zone.zone}
                    data-attempts={zone.attempts}
                    fill={`rgba(${HEAT},${(0.06 + share * 0.7).toFixed(3)})`}
                    fillRule="evenodd"
                    stroke={
                      selectedZone === zone.zone
                        ? 'var(--red-hi)'
                        : 'rgba(10,10,11,0.85)'
                    }
                    strokeWidth={selectedZone === zone.zone ? 3 : 1.5}
                    className={onZone ? 'shotcourt__zone' : undefined}
                    onClick={onZone ? () => onZone(zone.zone) : undefined}
                  >
                    <title>
                      {zone.zone}: {zone.attempts} attempts, {zone.makes} makes
                    </title>
                  </path>
                );
              })}
              {group.zones.map((zone) => {
                const anchor = ZONE_LABEL[zone.zone as SourceZone];
                if (!anchor) return null;
                const [x, y] = P(anchor[0], anchor[1]);
                return (
                  <g key={`label-${zone.zone}`} className="shotcourt__zlabel">
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      fill="#f4f3f1"
                      fontSize={17}
                      fontWeight={700}
                    >
                      {zone.attempts ? ratio(zone.fgPercentage) : '—'}
                    </text>
                    <text
                      x={x}
                      y={y + 15}
                      textAnchor="middle"
                      fill="rgba(244,243,241,0.7)"
                      fontSize={11}
                    >
                      {zone.attempts} att
                    </text>
                  </g>
                );
              })}
            </g>
          );
        }
        const drawn = located.filter((shot) => (shot.y as number) <= CROP);
        const beyond = located.length - drawn.length;
        return (
          <g className="shotcourt__marks">
            {beyond > 0 ? (
              <text
                x={projection.width / 2}
                y={16}
                textAnchor="middle"
                fill="rgba(244,243,241,0.75)"
                fontSize={12}
                className="shotcourt__edge"
              >
                +{beyond} beyond half court (in the table, not drawn)
              </text>
            ) : null}
            {drawn.map((shot, index) => {
              const [x, y] = P(shot.x as number, shot.y as number);
              const on = activeShot === shot.id;
              const common = {
                'data-shot': shot.id,
                'data-result': shot.made ? 'made' : 'missed',
                'data-raw-x': shot.x as number,
                'data-raw-y': shot.y as number,
                className: `shot-mark ${on ? 'is-on' : ''}`,
                style: { ['--i' as string]: Math.min(index, 60) },
                onPointerEnter: () => onActiveShot(shot.id),
                onPointerLeave: () => onActiveShot(null),
              };
              return shot.made ? (
                <circle
                  key={shot.id}
                  {...common}
                  cx={x}
                  cy={y}
                  r={on ? 8 : 5.5}
                  fill={MADE}
                  stroke="#0a0a0b"
                  strokeWidth={1.5}
                >
                  <title>{shot.id}: made</title>
                </circle>
              ) : (
                <path
                  key={shot.id}
                  {...common}
                  d={`M${x - 5} ${y - 5}L${x + 5} ${y + 5}M${x - 5} ${y + 5}L${x + 5} ${y - 5}`}
                  stroke={MISS}
                  strokeWidth={on ? 3.4 : 2.4}
                  strokeLinecap="round"
                >
                  <title>{shot.id}: missed</title>
                </path>
              );
            })}
          </g>
        );
      }}
    </BasketballCourt>
  );
}
