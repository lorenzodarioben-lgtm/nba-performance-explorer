import { useId, useState } from 'react';
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

import { formatPercentage, formatPerGame } from '../players/format';
import { usePlayerSeasonTrendsQuery } from '../players/usePlayerSeasonTrendsQuery';

interface ArcPlayer {
  playerId: string;
  fullName: string;
}

type MetricKind = 'perGame' | 'percentage';

interface CareerMetric {
  key: string;
  label: string;
  kind: MetricKind;
  get: (stats: PlayerSeasonStats) => number;
}

const POINTS_METRIC: CareerMetric = {
  key: 'points',
  label: 'Points per game',
  kind: 'perGame',
  get: (s) => s.pointsPerGame,
};

// Seven per-season metrics, one shown at a time. Points per game is the default. These reuse the same
// contract fields and formatters as the table and the matchup graph, so the values are consistent.
const CAREER_METRICS: readonly CareerMetric[] = [
  POINTS_METRIC,
  {
    key: 'rebounds',
    label: 'Rebounds per game',
    kind: 'perGame',
    get: (s) => s.reboundsPerGame,
  },
  {
    key: 'assists',
    label: 'Assists per game',
    kind: 'perGame',
    get: (s) => s.assistsPerGame,
  },
  {
    key: 'blocks',
    label: 'Blocks per game',
    kind: 'perGame',
    get: (s) => s.blocksPerGame,
  },
  {
    key: 'fieldGoal',
    label: 'Field-goal percentage',
    kind: 'percentage',
    get: (s) => s.fieldGoalPercentage,
  },
  {
    key: 'threePoint',
    label: 'Three-point percentage',
    kind: 'percentage',
    get: (s) => s.threePointPercentage,
  },
  {
    key: 'freeThrow',
    label: 'Free-throw percentage',
    kind: 'percentage',
    get: (s) => s.freeThrowPercentage,
  },
];

// Player A is the light-blue series, Player B the amber series: the same neutral data-visualisation
// pair as the matchup graph, never a team colour and never the red UI accent. Beyond colour the two
// lines differ by dash pattern and legend marker shape, and both carry the same weight, so neither is
// presented as "better".
const SERIES_A = '#60a5fa';
const SERIES_B = '#fbbf24';

const AXIS_TICK = { fontSize: 12, fill: '#a1a1aa' } as const;
const GRID_STROKE = 'rgb(255 255 255 / 0.08)';
const AXIS_LINE_STROKE = 'rgb(255 255 255 / 0.15)';

interface ArcRow {
  season: string;
  a: number | null;
  b: number | null;
}

// Seasons arrive oldest-first from the provider, but we sort defensively so the x-axis is always
// chronological regardless of provider order. The first four characters are the season's start year.
function startYear(season: string): number {
  return Number.parseInt(season.slice(0, 4), 10);
}

function sortSeasons(seasons: PlayerSeasonStats[]): PlayerSeasonStats[] {
  return [...seasons].sort((a, b) => startYear(a.season) - startYear(b.season));
}

// Percentages plot as whole percentage points (0.448 -> 44.8) so a shared y-axis reads naturally;
// per-game values plot as-is. Formatting for humans always goes through the shared helpers.
function toPlot(metric: CareerMetric, stats: PlayerSeasonStats): number {
  const raw = metric.get(stats);
  return metric.kind === 'percentage' ? raw * 100 : raw;
}

function formatValue(metric: CareerMetric, stats: PlayerSeasonStats): string {
  return metric.kind === 'percentage'
    ? formatPercentage(metric.get(stats))
    : formatPerGame(metric.get(stats));
}

function buildRows(
  seasonsA: PlayerSeasonStats[],
  seasonsB: PlayerSeasonStats[],
  metric: CareerMetric,
): ArcRow[] {
  const byStartYear = [
    ...new Set([...seasonsA.map((s) => s.season), ...seasonsB.map((s) => s.season)]),
  ].sort((a, b) => startYear(a) - startYear(b));

  const mapA = new Map(seasonsA.map((s) => [s.season, toPlot(metric, s)]));
  const mapB = new Map(seasonsB.map((s) => [s.season, toPlot(metric, s)]));

  return byStartYear.map((season) => ({
    season,
    a: mapA.get(season) ?? null,
    b: mapB.get(season) ?? null,
  }));
}

// A compact accessible equivalent of the line chart: the chart itself is decorative (aria-hidden), so
// this sentence gives assistive-tech users the metric, the season span, and each player's opening and
// most-recent values. Sighted users read exact per-season values from the chart's tooltip.
function playerSummary(
  name: string,
  seasons: PlayerSeasonStats[],
  metric: CareerMetric,
): string {
  const first = seasons[0];
  if (!first) {
    return `${name} has no season data for this metric`;
  }
  const last = seasons[seasons.length - 1] ?? first;
  if (seasons.length === 1) {
    return `${name}: ${formatValue(metric, first)} in ${first.season}`;
  }
  return `${name}: ${formatValue(metric, first)} in ${first.season} to ${formatValue(metric, last)} in ${last.season}`;
}

function ArcEmpty() {
  return (
    <p role="status" aria-live="polite" className="mt-4 text-sm text-white/70">
      Career arc is unavailable for this matchup with the current data source.
    </p>
  );
}

function MetricSelector({
  groupName,
  selectedKey,
  onSelect,
}: {
  groupName: string;
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
        Metric
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {CAREER_METRICS.map((metric) => (
          <label
            key={metric.key}
            className="cursor-pointer select-none rounded-sm border border-white/10 px-3 py-1.5 text-xs font-medium text-white/60 transition-colors hover:border-white/25 has-[:checked]:border-white/40 has-[:checked]:bg-white/10 has-[:checked]:text-chalk has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--color-focus)]"
          >
            <input
              type="radio"
              name={groupName}
              value={metric.key}
              checked={selectedKey === metric.key}
              onChange={() => {
                onSelect(metric.key);
              }}
              className="sr-only"
            />
            {metric.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ArcChart({
  rows,
  metric,
  nameA,
  nameB,
}: {
  rows: ArcRow[];
  metric: CareerMetric;
  nameA: string;
  nameB: string;
}) {
  const format = (value: number | string) => {
    const numeric = Number(value);
    return metric.kind === 'percentage' ? `${numeric.toFixed(1)}%` : numeric.toFixed(1);
  };

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
        <YAxis tick={AXIS_TICK} width={40} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(value) => format(value as number)}
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
          dataKey="a"
          name={nameA}
          stroke={SERIES_A}
          strokeWidth={2.5}
          legendType="circle"
          dot={{ r: 3, fill: SERIES_A }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
          connectNulls={false}
        />
        <Line
          type="linear"
          dataKey="b"
          name={nameB}
          stroke={SERIES_B}
          strokeWidth={2.5}
          strokeDasharray="6 3"
          legendType="square"
          dot={{ r: 3, fill: SERIES_B }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// A season-by-season trend that answers a different question from the selected-season Statistical
// matchup: how each player changed over their available seasons for one chosen metric. It reuses the
// existing career-trends query for both players (no new endpoint or contract), draws two equal-weight
// data-visualisation lines, omits seasons a player has no data for (never bridging a gap), and shows
// no winner, ranking, or aggregate score. The chart is decorative; an accessible summary and the
// metric name carry the meaning for assistive tech.
export function ComparisonCareerArc({
  playerA,
  playerB,
}: {
  playerA: ArcPlayer;
  playerB: ArcPlayer;
}) {
  const headingId = useId();
  const groupName = useId();
  const [selectedKey, setSelectedKey] = useState(POINTS_METRIC.key);
  const metric = CAREER_METRICS.find((m) => m.key === selectedKey) ?? POINTS_METRIC;

  const trendsA = usePlayerSeasonTrendsQuery(playerA.playerId);
  const trendsB = usePlayerSeasonTrendsQuery(playerB.playerId);

  function renderBody() {
    if (trendsA.isPending || trendsB.isPending) {
      return (
        <p role="status" aria-live="polite" className="mt-4 text-sm text-white/70">
          Loading career arc...
        </p>
      );
    }

    if (trendsA.isError || trendsB.isError) {
      return <ArcEmpty />;
    }

    const seasonsA = sortSeasons(trendsA.data);
    const seasonsB = sortSeasons(trendsB.data);
    // A meaningful trend needs both players present and at least one drawable line (two seasons).
    const enoughData =
      seasonsA.length >= 1 &&
      seasonsB.length >= 1 &&
      Math.max(seasonsA.length, seasonsB.length) >= 2;

    if (!enoughData) {
      return <ArcEmpty />;
    }

    const rows = buildRows(seasonsA, seasonsB, metric);
    const summary = `${metric.label} by season. ${playerSummary(
      playerA.fullName,
      seasonsA,
      metric,
    )}. ${playerSummary(playerB.fullName, seasonsB, metric)}. Seasons where a player has no data are omitted.`;

    return (
      <>
        <MetricSelector
          groupName={groupName}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
        />
        <div className="mt-4 rounded-md border border-white/10 bg-coal p-4">
          <p className="sr-only">{summary}</p>
          <div aria-hidden="true">
            <ArcChart
              rows={rows}
              metric={metric}
              nameA={playerA.fullName}
              nameB={playerB.fullName}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      className="mt-12 border-t border-white/10 pt-8"
    >
      <h3
        id={headingId}
        className="display text-2xl font-extrabold uppercase text-chalk sm:text-3xl"
      >
        Career arc
      </h3>
      <p className="mt-2 max-w-prose text-sm text-white/60">
        Season-by-season trajectory for one metric at a time. Career arc uses available
        season data. Missing seasons are omitted.
      </p>
      {renderBody()}
    </section>
  );
}
