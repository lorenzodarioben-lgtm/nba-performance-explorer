import { useId } from 'react';

import type { PlayerSeasonStats } from '@nba-performance-explorer/contracts';

import { formatPercentage, formatPerGame } from '../players/format';

interface GraphColumn {
  fullName: string;
  stats: PlayerSeasonStats;
}

interface Metric {
  label: string;
  // Raw numeric value, used only for the within-row bar proportion.
  value: (stats: PlayerSeasonStats) => number;
  // Display string, formatted with the same helpers the table uses so the printed values match.
  display: (stats: PlayerSeasonStats) => string;
}

interface MetricGroup {
  label: string;
  metrics: readonly Metric[];
}

const gamesPlayed: Metric = {
  label: 'Games played',
  value: (s) => s.gamesPlayed,
  display: (s) => String(s.gamesPlayed),
};
const minutesPerGame: Metric = {
  label: 'Minutes per game',
  value: (s) => s.minutesPerGame,
  display: (s) => formatPerGame(s.minutesPerGame),
};
const pointsPerGame: Metric = {
  label: 'Points per game',
  value: (s) => s.pointsPerGame,
  display: (s) => formatPerGame(s.pointsPerGame),
};
const fieldGoalPercentage: Metric = {
  label: 'Field-goal percentage',
  value: (s) => s.fieldGoalPercentage,
  display: (s) => formatPercentage(s.fieldGoalPercentage),
};
const threePointPercentage: Metric = {
  label: 'Three-point percentage',
  value: (s) => s.threePointPercentage,
  display: (s) => formatPercentage(s.threePointPercentage),
};
const freeThrowPercentage: Metric = {
  label: 'Free-throw percentage',
  value: (s) => s.freeThrowPercentage,
  display: (s) => formatPercentage(s.freeThrowPercentage),
};
const assistsPerGame: Metric = {
  label: 'Assists per game',
  value: (s) => s.assistsPerGame,
  display: (s) => formatPerGame(s.assistsPerGame),
};
const turnoversPerGame: Metric = {
  label: 'Turnovers per game',
  value: (s) => s.turnoversPerGame,
  display: (s) => formatPerGame(s.turnoversPerGame),
};
const reboundsPerGame: Metric = {
  label: 'Rebounds per game',
  value: (s) => s.reboundsPerGame,
  display: (s) => formatPerGame(s.reboundsPerGame),
};
const stealsPerGame: Metric = {
  label: 'Steals per game',
  value: (s) => s.stealsPerGame,
  display: (s) => formatPerGame(s.stealsPerGame),
};
const blocksPerGame: Metric = {
  label: 'Blocks per game',
  value: (s) => s.blocksPerGame,
  display: (s) => formatPerGame(s.blocksPerGame),
};

// The same eleven metrics the comparison table lists, formatted with the same helpers, now organised
// into four thematic groups so the rows are easier to scan. Grouping only reorders and labels the
// rows; it never changes a value, label, formatter, or statistical meaning. The numeric getters drive
// only the bar proportions; the display getters are what is shown, so the graph's printed values stay
// identical to the table's.
const METRIC_GROUPS: readonly MetricGroup[] = [
  { label: 'Availability', metrics: [gamesPlayed, minutesPerGame] },
  {
    label: 'Scoring',
    metrics: [
      pointsPerGame,
      fieldGoalPercentage,
      threePointPercentage,
      freeThrowPercentage,
    ],
  },
  { label: 'Playmaking', metrics: [assistsPerGame, turnoversPerGame] },
  { label: 'Defense', metrics: [reboundsPerGame, stealsPerGame, blocksPerGame] },
];

// Player A is the light-blue series, Player B the amber series. These are data-visualisation colours
// (the same family as the career chart), never the red interface accent and never team colours, and
// neither is treated as "better".
const SERIES_A = '#60a5fa';
const SERIES_B = '#fbbf24';

interface GraphRow {
  label: string;
  displayA: string;
  displayB: string;
  pctA: number;
  pctB: number;
  delay: number;
}

interface GraphGroup {
  label: string;
  rows: GraphRow[];
}

function buildGroups(a: PlayerSeasonStats, b: PlayerSeasonStats): GraphGroup[] {
  // One running index across every metric so the reveal cascades top to bottom.
  let index = 0;
  return METRIC_GROUPS.map((group) => ({
    label: group.label,
    rows: group.metrics.map((metric) => {
      const rawA = metric.value(a);
      const rawB = metric.value(b);
      const bothFinite = Number.isFinite(rawA) && Number.isFinite(rawB);
      // Independent per-row scale: the larger of the two values is the row maximum, so each bar is a
      // proportion of the pair, never of a shared cross-metric scale. Equal values give equal bars;
      // zero or unavailable values give an empty bar while the raw value is still printed.
      const rowMax = Math.max(rawA, rawB, 0);
      const scale = (value: number) =>
        bothFinite && rowMax > 0 ? Math.max(0, (value / rowMax) * 100) : 0;
      const row: GraphRow = {
        label: metric.label,
        displayA: metric.display(a),
        displayB: metric.display(b),
        pctA: scale(rawA),
        pctB: scale(rawB),
        delay: index * 40,
      };
      index += 1;
      return row;
    }),
  }));
}

// A faint half-court motif behind the central axis: a division line, the centre circle, and two side
// arcs, all at very low contrast. It is purely decorative broadcast texture (drawn behind the bars,
// pointer-events-none, static, so it needs no reduced-motion handling) and never reduces the
// readability of the bars or the values.
function CourtMotif() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 60"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="rgb(255 255 255 / 0.05)"
      strokeWidth="0.4"
    >
      <line x1="50" y1="0" x2="50" y2="60" />
      <circle cx="50" cy="30" r="9" />
      <circle cx="50" cy="30" r="0.8" fill="rgb(255 255 255 / 0.05)" stroke="none" />
      <path d="M 22 0 A 30 30 0 0 0 22 60" />
      <path d="M 78 0 A 30 30 0 0 1 78 60" />
    </svg>
  );
}

function StatRow({ row }: { row: GraphRow }) {
  return (
    <div>
      <p className="mb-1.5 text-center font-mono text-[0.625rem] uppercase tracking-[0.1em] text-white/60 sm:hidden">
        {row.label}
      </p>
      {/* minmax(0,1fr) columns and min-w-0 wrappers let the bars shrink so the always-shown value
          spans never overflow the panel (which is clipped for the court motif) on narrow screens. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="w-11 shrink-0 text-right text-sm font-semibold tabular-nums text-chalk sm:w-14">
            {row.displayA}
          </span>
          <div className="flex h-3.5 min-w-0 flex-1 justify-end">
            <div
              className="stat-bar-in h-full origin-right rounded-l-[2px]"
              style={{
                width: `${row.pctA}%`,
                backgroundColor: SERIES_A,
                animationDelay: `${row.delay}ms`,
              }}
            />
          </div>
        </div>

        <div className="flex h-7 w-3 items-center justify-center border-x border-white/10 sm:h-9 sm:w-44 sm:px-2">
          <span className="hidden text-center font-mono text-[0.6875rem] uppercase leading-tight tracking-[0.08em] text-white/65 sm:inline">
            {row.label}
          </span>
        </div>

        <div className="flex min-w-0 items-center justify-start gap-2">
          <div className="flex h-3.5 min-w-0 flex-1 justify-start">
            <div
              className="stat-bar-in stat-bar-hatch h-full origin-left rounded-r-[2px]"
              style={{
                width: `${row.pctB}%`,
                backgroundColor: SERIES_B,
                animationDelay: `${row.delay}ms`,
              }}
            />
          </div>
          <span className="w-11 shrink-0 text-left text-sm font-semibold tabular-nums text-chalk sm:w-14">
            {row.displayB}
          </span>
        </div>
      </div>
    </div>
  );
}

// A supplementary broadcast "tale of the tape": one row per metric, grouped by theme, each player's
// bar growing out from a central axis with the raw value always printed. It is decorative
// (aria-hidden) because the detailed comparison table (available through the disclosure below) is the
// authoritative, screen-reader-accessible representation; the heading and the scale note stay outside
// the aria-hidden graphic. No winner colouring, arrows, or ranking is applied, and the two series are
// distinguished by colour, side, a hatch, and persistent labels.
export function ComparisonStatGraph({
  season,
  playerA,
  playerB,
}: {
  season: string;
  playerA: GraphColumn;
  playerB: GraphColumn;
}) {
  const headingId = useId();
  const groups = buildGroups(playerA.stats, playerB.stats);

  return (
    <section aria-labelledby={headingId} className="mt-10">
      <h3
        id={headingId}
        className="display text-2xl font-extrabold uppercase text-chalk sm:text-3xl"
      >
        Statistical matchup
      </h3>
      <p className="mt-2 max-w-prose text-sm text-white/60">
        Each metric uses its own scale. Compare players within a row, not across rows.
        The exact values are listed in the detailed statistics table below.
      </p>

      <div
        aria-hidden="true"
        className="relative mt-5 overflow-hidden rounded-md border border-white/10 bg-coal p-4 sm:p-6"
      >
        <CourtMotif />

        <div className="relative">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[1px]"
                style={{ backgroundColor: SERIES_A }}
              />
              <span className="display truncate text-sm font-bold uppercase text-chalk">
                {playerA.fullName}
              </span>
            </span>
            <span className="eyebrow shrink-0 text-white/45">{season}</span>
            <span className="flex min-w-0 items-center justify-end gap-2">
              <span className="display truncate text-sm font-bold uppercase text-chalk">
                {playerB.fullName}
              </span>
              <span
                className="stat-bar-hatch h-2.5 w-2.5 shrink-0 rounded-[1px]"
                style={{ backgroundColor: SERIES_B }}
              />
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-6">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-3.5">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="eyebrow text-white/40">{group.label}</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>
                {group.rows.map((row) => (
                  <StatRow key={row.label} row={row} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
