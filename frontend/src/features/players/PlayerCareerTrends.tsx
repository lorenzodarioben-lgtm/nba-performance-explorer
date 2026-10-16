import { useId, useMemo } from 'react';

import type { PlayerSeasonStats } from '@nba-performance-explorer/contracts';

import { LineChart } from '../../charts/LineChart';
import { ChartLegend } from '../../charts/markers';
import { LoadingLine, Notice } from '../../ui/DataState';
import { RowCollapse } from '../../ui/RowCollapse';
import { Slate } from '../../ui/Slate';
import { alignToSeasons, fillSeasonGaps, shortSeason } from '../player-hub/seasons';

import { formatPerGame } from './format';
import { usePlayerSeasonTrendsQuery } from './usePlayerSeasonTrendsQuery';

interface TrendRow {
  season: string;
  points: number;
  rebounds: number;
  assists: number;
}

// Series identity is encoded three ways so colour is never the only distinction: a line dash
// pattern, a marker shape and a colour. Chart colours are the system's categorical series
// (never the interface red) and are literal because SVG attributes do not resolve CSS var().
const SERIES = {
  points: { color: '#3b82f6', dash: undefined, shape: 'circle' },
  rebounds: { color: '#bd8008', dash: '6 3', shape: 'square' },
  assists: { color: '#0ea594', dash: '2 4', shape: 'triangle' },
} as const;

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

/** Seasons shown before the table is opened; the chart above always covers the whole career. */
const SEASON_PREVIEW = 5;

function TrendTable({ rows }: { rows: TrendRow[] }) {
  return (
    <RowCollapse total={rows.length} preview={SEASON_PREVIEW} noun="seasons">
      {(visibleRows) => <TrendRows rows={rows} visibleRows={visibleRows} />}
    </RowCollapse>
  );
}

function TrendRows({ rows, visibleRows }: { rows: TrendRow[]; visibleRows: number }) {
  return (
    <div
      role="group"
      aria-label="Career averages by season"
      tabIndex={0}
      className="scroll-region"
    >
      <table className="dtable">
        <caption>Points, rebounds, and assists per game by season.</caption>
        <thead>
          <tr>
            <th scope="col">Season</th>
            <th scope="col" className="r">
              Points per game
            </th>
            <th scope="col" className="r">
              Rebounds per game
            </th>
            <th scope="col" className="r">
              Assists per game
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.season} hidden={index >= visibleRows || undefined}>
              <th scope="row" className="num">
                {row.season}
              </th>
              <td className="num">{formatPerGame(row.points)}</td>
              <td className="num">{formatPerGame(row.rebounds)}</td>
              <td className="num">{formatPerGame(row.assists)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrendChart({ rows }: { rows: TrendRow[] }) {
  // A calendar axis: seasons the record skips become gaps, never bridged by a line.
  const axis = useMemo(() => fillSeasonGaps(rows.map((row) => row.season)), [rows]);
  const series = useMemo(
    () =>
      (
        [
          ['points', 'Points per game'],
          ['rebounds', 'Rebounds per game'],
          ['assists', 'Assists per game'],
        ] as const
      ).map(([key, label]) => ({
        id: key,
        label,
        ...SERIES[key],
        values: alignToSeasons(
          axis,
          rows,
          (row) => row.season,
          (row) => row[key],
        ),
      })),
    [axis, rows],
  );
  const gaps = axis.length - rows.length;
  return (
    <>
      <ChartLegend items={series} />
      <LineChart
        label="Career trends: points, rebounds and assists per game by season"
        categories={axis}
        series={series}
        height={300}
        format={formatPerGame}
        formatCategory={shortSeason}
        footnote={
          gaps > 0
            ? `${gaps} season${gaps === 1 ? '' : 's'} not reported; the lines break there.`
            : undefined
        }
      />
    </>
  );
}

export function PlayerCareerTrends({ playerId }: { playerId: string }) {
  const trendsQuery = usePlayerSeasonTrendsQuery(playerId);
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="pmod">
      <Slate
        title="Career trends"
        id={headingId}
        tapes={[{ code: 'NBA.com', source: 'Queried', variant: 'queried' }]}
        meta={['Per game', 'By season']}
      />

      {trendsQuery.isPending ? (
        <LoadingLine>Loading career trends...</LoadingLine>
      ) : trendsQuery.isError ? (
        <Notice tone="error" role="alert">
          Career trends are unavailable. Please try again.
        </Notice>
      ) : (
        <TrendsBody rows={buildTrendRows(trendsQuery.data)} />
      )}
    </section>
  );
}

function TrendsBody({ rows }: { rows: TrendRow[] }) {
  if (rows.length === 0) {
    return (
      <p role="status" aria-live="polite" className="pmod__empty">
        No season data is available to chart for this player.
      </p>
    );
  }

  if (rows.length === 1) {
    return (
      <>
        <p role="status" aria-live="polite" className="pmod__empty">
          At least two seasons are needed to show a career trend.
        </p>
        <TrendTable rows={rows} />
      </>
    );
  }

  return (
    <figure className="pmod__figure">
      <figcaption className="pmod__caption">
        Points, rebounds, and assists per game across seasons. The complete values are
        listed in the table below.
      </figcaption>
      <div className="panel pmod__chart" data-chart="career-trends">
        <TrendChart rows={rows} />
      </div>
      <TrendTable rows={rows} />
    </figure>
  );
}
