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
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="mb-2 text-left text-sm text-zinc-600">
          Points, rebounds, and assists per game by season.
        </caption>
        <thead>
          <tr className="border-b border-zinc-300">
            <th scope="col" className="py-2 pr-4 font-semibold text-zinc-700">
              Season
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold text-zinc-700">
              Points per game
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold text-zinc-700">
              Rebounds per game
            </th>
            <th scope="col" className="py-2 font-semibold text-zinc-700">
              Assists per game
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.season} className="border-b border-zinc-200">
              <th scope="row" className="py-2 pr-4 font-medium text-zinc-950">
                {row.season}
              </th>
              <td className="py-2 pr-4 text-zinc-800">{formatPerGame(row.points)}</td>
              <td className="py-2 pr-4 text-zinc-800">{formatPerGame(row.rebounds)}</td>
              <td className="py-2 text-zinc-800">{formatPerGame(row.assists)}</td>
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
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis dataKey="season" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} width={36} />
        <Tooltip formatter={(value) => formatPerGame(Number(value))} />
        <Legend />
        <Line
          type="linear"
          dataKey="points"
          name="Points per game"
          stroke="#1d4ed8"
          legendType="circle"
          dot={{ r: 3 }}
          isAnimationActive={false}
          connectNulls={false}
        />
        <Line
          type="linear"
          dataKey="rebounds"
          name="Rebounds per game"
          stroke="#b45309"
          strokeDasharray="6 3"
          legendType="square"
          dot={{ r: 3 }}
          isAnimationActive={false}
          connectNulls={false}
        />
        <Line
          type="linear"
          dataKey="assists"
          name="Assists per game"
          stroke="#15803d"
          strokeDasharray="2 4"
          legendType="triangle"
          dot={{ r: 3 }}
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
      className="mt-10 border-t border-zinc-200 pt-6"
    >
      <h2 id={headingId} className="text-2xl font-bold text-zinc-950">
        Career trends
      </h2>

      {trendsQuery.isPending ? (
        <p role="status" aria-live="polite" className="mt-3 text-sm text-zinc-700">
          Loading career trends...
        </p>
      ) : trendsQuery.isError ? (
        <p
          role="alert"
          className="mt-3 border-l-4 border-red-600 pl-3 text-sm text-red-800"
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
      <p role="status" aria-live="polite" className="mt-3 text-sm text-zinc-700">
        No season data is available to chart for this player.
      </p>
    );
  }

  if (rows.length === 1) {
    return (
      <>
        <p role="status" aria-live="polite" className="mt-3 text-sm text-zinc-700">
          At least two seasons are needed to show a career trend.
        </p>
        <TrendTable rows={rows} />
      </>
    );
  }

  return (
    <figure className="mt-4">
      <figcaption className="text-sm text-zinc-600">
        Points, rebounds, and assists per game across seasons. The complete values are
        listed in the table below.
      </figcaption>
      <div aria-hidden="true" className="mt-3">
        <TrendChart rows={rows} />
      </div>
      <TrendTable rows={rows} />
    </figure>
  );
}
