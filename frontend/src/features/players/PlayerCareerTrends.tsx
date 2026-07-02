import { useId } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { PlayerSeasonStats } from '@nba-performance-explorer/contracts';

import { formatPerGame } from './format';
import { usePlayerSeasonTrendsQuery } from './usePlayerSeasonTrendsQuery';

interface TrendRow {
  season: string;
  points: number;
  rebounds: number;
  assists: number;
}

// Series identity is encoded three ways so colour is never the only distinction: a line dash
// pattern, a legend marker shape, and a colour. The colours are data-visualisation colours (not UI
// accents) chosen to read clearly on the near-black chart panel and to stay distinct from the grid,
// the blue focus ring, and the green live-status: points = bright red, rebounds = light blue,
// assists = warm amber. (SVG presentation attributes do not resolve CSS var(), so they are literal.)
const SERIES = {
  points: '#f87171', // bright red, solid line, circle marker
  rebounds: '#60a5fa', // light blue, dashed line (6 3), square marker
  assists: '#fbbf24', // warm amber, dotted line (2 4), triangle marker
} as const;

const AXIS_TICK = { fontSize: 12, fill: '#a1a1aa' } as const;
const GRID_STROKE = 'rgb(255 255 255 / 0.08)';
const AXIS_LINE_STROKE = 'rgb(255 255 255 / 0.15)';

// One transformation, consumed by both the chart and the table. Exact numeric values and the
// backend's oldest-first order are preserved; formatting happens only at render time.
function buildTrendRows(seasons: PlayerSeasonStats[]): TrendRow[] {
  return seasons.map((entry) => ({
    season: entry.season,
    points: entry.pointsPerGame,
    rebounds: entry.reboundsPerGame,
    assists: entry.assistsPerGame,
  }));
}

function TrendTable({ rows }: { rows: TrendRow[] }) {
  return (
    <div
      role="group"
      aria-label="Career averages by season"
      tabIndex={0}
      className="scroll-x-dark mt-5 max-w-full overflow-x-auto rounded-md border border-white/10 bg-coal"
    >
      <table className="w-full border-collapse text-left text-sm">
        <caption className="px-4 pt-3 text-left text-sm text-white/70">
          Points, rebounds, and assists per game by season.
        </caption>
        <thead>
          <tr className="border-b border-white/15 bg-white/5">
            <th scope="col" className="px-4 py-2 font-semibold text-white/60">
              Season
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-right font-semibold text-white/60"
            >
              Points per game
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-right font-semibold text-white/60"
            >
              Rebounds per game
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-right font-semibold text-white/60"
            >
              Assists per game
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.season} className="border-b border-white/10 last:border-b-0">
              <th scope="row" className="px-4 py-2 font-medium tabular-nums text-chalk">
                {row.season}
              </th>
              <td className="px-4 py-2 text-right tabular-nums text-chalk">
                {formatPerGame(row.points)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-chalk">
                {formatPerGame(row.rebounds)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-chalk">
                {formatPerGame(row.assists)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrendChart({ rows }: { rows: TrendRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
        <XAxis
          dataKey="season"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: AXIS_LINE_STROKE }}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis tick={AXIS_TICK} width={36} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(value) => formatPerGame(Number(value))}
          cursor={{ stroke: 'rgb(255 255 255 / 0.25)' }}
          contentStyle={{
            backgroundColor: '#0a0a0b',
            borderColor: 'rgb(255 255 255 / 0.15)',
            borderRadius: 4,
            fontSize: 13,
            color: '#f4f3f1',
          }}
          labelStyle={{ color: '#a1a1aa', fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Line
          type="linear"
          dataKey="points"
          name="Points per game"
          stroke={SERIES.points}
          strokeWidth={2.5}
          legendType="circle"
          dot={{ r: 3, fill: SERIES.points }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
          connectNulls={false}
        />
        <Line
          type="linear"
          dataKey="rebounds"
          name="Rebounds per game"
          stroke={SERIES.rebounds}
          strokeWidth={2.5}
          strokeDasharray="6 3"
          legendType="square"
          dot={{ r: 3, fill: SERIES.rebounds }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
          connectNulls={false}
        />
        <Line
          type="linear"
          dataKey="assists"
          name="Assists per game"
          stroke={SERIES.assists}
          strokeWidth={2.5}
          strokeDasharray="2 4"
          legendType="triangle"
          dot={{ r: 3, fill: SERIES.assists }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PlayerCareerTrends({ playerId }: { playerId: string }) {
  const trendsQuery = usePlayerSeasonTrendsQuery(playerId);
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="mt-12 border-t border-white/10 pt-10"
    >
      <h2
        id={headingId}
        className="display text-3xl font-extrabold uppercase text-chalk sm:text-4xl"
      >
        Career trends
      </h2>

      {trendsQuery.isPending ? (
        <p role="status" aria-live="polite" className="mt-3 text-sm text-white/70">
          Loading career trends...
        </p>
      ) : trendsQuery.isError ? (
        <p
          role="alert"
          className="mt-3 rounded-sm border border-white/10 bg-accent/15 px-3 py-2 text-sm text-red-100"
        >
          Career trends are unavailable. Please try again.
        </p>
      ) : (
        <TrendsBody rows={buildTrendRows(trendsQuery.data)} />
      )}
    </section>
  );
}

function TrendsBody({ rows }: { rows: TrendRow[] }) {
  if (rows.length === 0) {
    return (
      <p role="status" aria-live="polite" className="mt-3 text-sm text-white/70">
        No season data is available to chart for this player.
      </p>
    );
  }

  if (rows.length === 1) {
    return (
      <>
        <p role="status" aria-live="polite" className="mt-3 text-sm text-white/70">
          At least two seasons are needed to show a career trend.
        </p>
        <TrendTable rows={rows} />
      </>
    );
  }

  return (
    <figure className="mt-5">
      <figcaption className="max-w-prose text-sm text-white/70">
        Points, rebounds, and assists per game across seasons. The complete values are
        listed in the table below.
      </figcaption>
      <div className="mt-3 rounded-md border border-white/10 bg-coal p-4">
        <div aria-hidden="true">
          <TrendChart rows={rows} />
        </div>
      </div>
      <TrendTable rows={rows} />
    </figure>
  );
}
