import { useId, useState } from 'react';

import type { PlayerSeasonStats } from '@nba-performance-explorer/contracts';

import { LineChart } from '../../charts/LineChart';
import { ChartLegend } from '../../charts/markers';
import { LoadingLine } from '../../ui/DataState';
import { fillSeasonGaps, shortSeason } from '../player-hub/seasons';
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
const SERIES_A = '#3b82f6';
const SERIES_B = '#bd8008';

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
    <p role="status" aria-live="polite" className="cmp-empty">
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
    <fieldset className="cmp-metrics">
      <legend className="field-label">Metric</legend>
      <div className="cmp-metrics__chips">
        {CAREER_METRICS.map((metric) => (
          <label key={metric.key} className="cmp-chip">
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
  // A calendar axis: seasons neither player reported become gaps, never bridged.
  const axis = fillSeasonGaps(rows.map((row) => row.season));
  const bySeason = new Map(rows.map((row) => [row.season, row]));
  const series = [
    {
      id: 'a',
      label: nameA,
      color: SERIES_A,
      shape: 'circle' as const,
      values: axis.map((season) => bySeason.get(season)?.a ?? null),
    },
    {
      id: 'b',
      label: nameB,
      color: SERIES_B,
      dash: '6 3',
      shape: 'square' as const,
      values: axis.map((season) => bySeason.get(season)?.b ?? null),
    },
  ];
  return (
    <>
      <ChartLegend items={series} />
      <LineChart
        label={`Career arc: ${metric.label} by season for ${nameA} and ${nameB}`}
        categories={axis}
        series={series}
        height={300}
        format={(value) =>
          metric.kind === 'percentage' ? `${value.toFixed(1)}%` : value.toFixed(1)
        }
        formatCategory={shortSeason}
      />
    </>
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
      return <LoadingLine>Loading career arc...</LoadingLine>;
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
        <div className="panel cmp-arc__chart" data-chart="career-arc">
          <p className="sr-only">{summary}</p>
          <div>
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
    <section aria-labelledby={headingId} className="cmp-mod">
      <h3 id={headingId} className="cmp-mod__title">
        Career arc
      </h3>
      <p className="cmp-mod__note">
        Season-by-season trajectory for one metric at a time. Career arc uses available
        season data. Missing seasons are omitted; the lines break across them.
      </p>
      {renderBody()}
    </section>
  );
}
