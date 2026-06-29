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

// Series identity is encoded three ways so colour is never the only distinction: a brand-aligned
// colour, a line dash pattern, and a legend marker shape. (SVG presentation attributes do not
// resolve CSS var(), so the colours are literal here but mirror the Stage 1 token palette.)
const SERIES = {
  points: '#b91c1c', // brand red, solid line, circle marker
  rebounds: '#1d4ed8', // blue, dashed line (6 3), square marker
  assists: '#15803d', // green, dotted line (2 4), triangle marker
} as const;

const AXIS_TICK = { fontSize: 12, fill: '#52525b' } as const;

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
    <div className="mt-5 overflow-x-auto scroll-x rounded-md border border-edge bg-surface">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="px-4 pt-3 text-left text-sm text-ink-2">
          Points, rebounds, and assists per game by season.
        </caption>
        <thead>
          <tr className="border-b border-edge-strong bg-surface-sunken">
            <th scope="col" className="px-4 py-2 font-semibold text-ink-2">
              Season
            </th>
            <th scope="col" className="px-4 py-2 text-right font-semibold text-ink-2">
              Points per game
            </th>
            <th scope="col" className="px-4 py-2 text-right font-semibold text-ink-2">
              Rebounds per game
            </th>
            <th scope="col" className="px-4 py-2 text-right font-semibold text-ink-2">
              Assists per game
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.season} className="border-b border-edge last:border-b-0">
              <th scope="row" className="px-4 py-2 font-medium tabular-nums text-ink">
                {row.season}
              </th>
              <td className="px-4 py-2 text-right tabular-nums text-ink">
                {formatPerGame(row.points)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-ink">
                {formatPerGame(row.rebounds)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-ink">
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
        <CartesianGrid vertical={false} stroke="#e4e4e7" strokeDasharray="3 3" />
        <XAxis
          dataKey="season"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: '#d4d4d8' }}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis tick={AXIS_TICK} width={36} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(value) => formatPerGame(Number(value))}
          contentStyle={{
            borderColor: '#e4e4e7',
            borderRadius: 4,
            fontSize: 13,
            color: '#18181b',
          }}
          labelStyle={{ color: '#52525b', fontWeight: 600 }}
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
    <section aria-labelledby={headingId} className="mt-10 border-t border-edge pt-8">
      <h2 id={headingId} className="text-2xl font-bold tracking-tight text-ink">
        Career trends
      </h2>

      {trendsQuery.isPending ? (
        <p role="status" aria-live="polite" className="mt-3 text-sm text-ink-2">
          Loading career trends...
        </p>
      ) : trendsQuery.isError ? (
        <p
          role="alert"
          className="mt-3 rounded-sm border border-edge bg-accent-quiet px-3 py-2 text-sm text-danger"
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
      <p role="status" aria-live="polite" className="mt-3 text-sm text-ink-2">
        No season data is available to chart for this player.
      </p>
    );
  }

  if (rows.length === 1) {
    return (
      <>
        <p role="status" aria-live="polite" className="mt-3 text-sm text-ink-2">
          At least two seasons are needed to show a career trend.
        </p>
        <TrendTable rows={rows} />
      </>
    );
  }

  return (
    <figure className="mt-5">
      <figcaption className="max-w-prose text-sm text-ink-2">
        Points, rebounds, and assists per game across seasons. The complete values are
        listed in the table below.
      </figcaption>
      <div className="mt-3 rounded-md border border-edge bg-surface p-4">
        <div aria-hidden="true">
          <TrendChart rows={rows} />
        </div>
      </div>
      <TrendTable rows={rows} />
    </figure>
  );
}
