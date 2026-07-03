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

// The same eleven metrics as the comparison table, in the same order, formatted with the same
// helpers. The numeric getters drive only the bar proportions; the display getters are what is shown,
// so the graph's printed values are identical to the table's.
const METRICS: readonly Metric[] = [
  {
    label: 'Games played',
    value: (s) => s.gamesPlayed,
    display: (s) => String(s.gamesPlayed),
  },
  {
    label: 'Minutes per game',
    value: (s) => s.minutesPerGame,
    display: (s) => formatPerGame(s.minutesPerGame),
  },
  {
    label: 'Points per game',
    value: (s) => s.pointsPerGame,
    display: (s) => formatPerGame(s.pointsPerGame),
  },
  {
    label: 'Rebounds per game',
    value: (s) => s.reboundsPerGame,
    display: (s) => formatPerGame(s.reboundsPerGame),
  },
  {
    label: 'Assists per game',
    value: (s) => s.assistsPerGame,
    display: (s) => formatPerGame(s.assistsPerGame),
  },
  {
    label: 'Steals per game',
    value: (s) => s.stealsPerGame,
    display: (s) => formatPerGame(s.stealsPerGame),
  },
  {
    label: 'Blocks per game',
    value: (s) => s.blocksPerGame,
    display: (s) => formatPerGame(s.blocksPerGame),
  },
  {
    label: 'Turnovers per game',
    value: (s) => s.turnoversPerGame,
    display: (s) => formatPerGame(s.turnoversPerGame),
  },
  {
    label: 'Field-goal percentage',
    value: (s) => s.fieldGoalPercentage,
    display: (s) => formatPercentage(s.fieldGoalPercentage),
  },
  {
    label: 'Three-point percentage',
    value: (s) => s.threePointPercentage,
    display: (s) => formatPercentage(s.threePointPercentage),
  },
  {
    label: 'Free-throw percentage',
    value: (s) => s.freeThrowPercentage,
    display: (s) => formatPercentage(s.freeThrowPercentage),
  },
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

function buildRows(a: PlayerSeasonStats, b: PlayerSeasonStats): GraphRow[] {
  return METRICS.map((metric, index) => {
    const rawA = metric.value(a);
    const rawB = metric.value(b);
    const bothFinite = Number.isFinite(rawA) && Number.isFinite(rawB);
    // Independent per-row scale: the larger of the two values is the row maximum, so each bar is a
    // proportion of the pair, never of a shared cross-metric scale. Equal values give equal bars;
    // zero or unavailable values give an empty bar while the raw value is still printed.
    const rowMax = Math.max(rawA, rawB, 0);
    const scale = (value: number) =>
      bothFinite && rowMax > 0 ? Math.max(0, (value / rowMax) * 100) : 0;
    return {
      label: metric.label,
      displayA: metric.display(a),
      displayB: metric.display(b),
      pctA: scale(rawA),
      pctB: scale(rawB),
      delay: index * 40,
    };
  });
}

// A supplementary broadcast "tale of the tape": one row per metric, each player's bar growing out
// from a central axis with the raw value always printed. It is decorative (aria-hidden) because the
// comparison table below is the authoritative, screen-reader-accessible representation; the heading
// and the scale note stay outside the aria-hidden graphic. No winner colouring, arrows, or ranking is
// applied, and the two series are distinguished by colour, side, a hatch, and persistent labels.
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
  const rows = buildRows(playerA.stats, playerB.stats);

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
        The exact values are listed in the comparison table below.
      </p>

      <div
        aria-hidden="true"
        className="mt-5 rounded-md border border-white/10 bg-coal p-4 sm:p-6"
      >
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

        <div className="mt-4 flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.label}>
              <p className="mb-1.5 text-center font-mono text-[0.625rem] uppercase tracking-[0.1em] text-white/55 sm:hidden">
                {row.label}
              </p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                <div className="flex items-center justify-end gap-2">
                  <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-chalk sm:w-14">
                    {row.displayA}
                  </span>
                  <div className="flex h-3 flex-1 justify-end">
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

                <div className="flex h-6 w-4 items-center justify-center border-x border-white/10 sm:h-8 sm:w-40 sm:px-2">
                  <span className="hidden text-center font-mono text-[0.625rem] uppercase leading-tight tracking-[0.08em] text-white/55 sm:inline">
                    {row.label}
                  </span>
                </div>

                <div className="flex items-center justify-start gap-2">
                  <div className="flex h-3 flex-1 justify-start">
                    <div
                      className="stat-bar-in stat-bar-hatch h-full origin-left rounded-r-[2px]"
                      style={{
                        width: `${row.pctB}%`,
                        backgroundColor: SERIES_B,
                        animationDelay: `${row.delay}ms`,
                      }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-left text-sm font-semibold tabular-nums text-chalk sm:w-14">
                    {row.displayB}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
