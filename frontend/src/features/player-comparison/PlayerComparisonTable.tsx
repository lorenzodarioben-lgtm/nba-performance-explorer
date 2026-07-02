import type { PlayerSeasonStats } from '@nba-performance-explorer/contracts';

import { formatPercentage, formatPerGame } from '../players/format';

export interface ComparisonColumn {
  playerId: string;
  fullName: string;
  stats: PlayerSeasonStats;
}

interface StatDefinition {
  label: string;
  get: (stats: PlayerSeasonStats) => string;
}

// All eleven numeric fields already provided by `PlayerSeasonStats`, formatted with the
// existing helpers. Team abbreviation and the selected season live in each column header; the
// season also stays in the caption. They are not repeated as rows.
const statDefinitions: readonly StatDefinition[] = [
  { label: 'Games played', get: (stats) => String(stats.gamesPlayed) },
  { label: 'Minutes per game', get: (stats) => formatPerGame(stats.minutesPerGame) },
  { label: 'Points per game', get: (stats) => formatPerGame(stats.pointsPerGame) },
  { label: 'Rebounds per game', get: (stats) => formatPerGame(stats.reboundsPerGame) },
  { label: 'Assists per game', get: (stats) => formatPerGame(stats.assistsPerGame) },
  { label: 'Steals per game', get: (stats) => formatPerGame(stats.stealsPerGame) },
  { label: 'Blocks per game', get: (stats) => formatPerGame(stats.blocksPerGame) },
  {
    label: 'Turnovers per game',
    get: (stats) => formatPerGame(stats.turnoversPerGame),
  },
  {
    label: 'Field-goal percentage',
    get: (stats) => formatPercentage(stats.fieldGoalPercentage),
  },
  {
    label: 'Three-point percentage',
    get: (stats) => formatPercentage(stats.threePointPercentage),
  },
  {
    label: 'Free-throw percentage',
    get: (stats) => formatPercentage(stats.freeThrowPercentage),
  },
];

// Both columns share this heading exactly; `withDivider` only adds the neutral rule between the
// two player columns and never changes typography, colour, weight, or emphasis.
function ColumnHeading({
  column,
  season,
  withDivider,
}: {
  column: ComparisonColumn;
  season: string;
  withDivider: boolean;
}) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-4 py-3 text-right align-bottom ${
        withDivider ? 'border-l border-white/10' : ''
      }`}
    >
      <span className="display block text-lg font-bold uppercase text-chalk">
        {column.fullName}
      </span>
      <span className="eyebrow mt-1 block text-white/55">
        {column.stats.team ? column.stats.team.abbreviation : 'Multiple teams'} ·{' '}
        {season}
      </span>
    </th>
  );
}

// The authoritative, accessible comparison representation: a semantic table with the season in the
// caption, statistic names as row headers, and player identities (with their season team and the
// selected season) as column headers. No "better player" semantics or colour-coded verdict is
// applied; the two player columns are styled identically and read by numeric alignment alone, with
// only a thin neutral divider between them to aid scanning.
export function PlayerComparisonTable({
  season,
  playerA,
  playerB,
}: {
  season: string;
  playerA: ComparisonColumn;
  playerB: ComparisonColumn;
}) {
  return (
    <div
      role="group"
      aria-label={`Comparison statistics for the ${season} season`}
      tabIndex={0}
      className="scroll-x-dark mt-4 max-w-full overflow-x-auto rounded-md border border-white/10 bg-coal"
    >
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <caption className="px-4 pt-3 text-left text-sm text-white/70">
          Regular-season comparison for the {season} season.
        </caption>
        <thead>
          <tr className="border-b border-white/15 bg-white/5">
            <th
              scope="col"
              className="px-4 py-3 align-bottom font-semibold text-white/60"
            >
              Statistic
            </th>
            <ColumnHeading column={playerA} season={season} withDivider={false} />
            <ColumnHeading column={playerB} season={season} withDivider={true} />
          </tr>
        </thead>
        <tbody>
          {statDefinitions.map((definition) => (
            <tr
              key={definition.label}
              className="border-b border-white/10 last:border-b-0"
            >
              <th
                scope="row"
                className="whitespace-nowrap px-4 py-2 font-medium text-white/80"
              >
                {definition.label}
              </th>
              <td className="px-4 py-2 text-right tabular-nums text-chalk">
                {definition.get(playerA.stats)}
              </td>
              <td className="border-l border-white/10 px-4 py-2 text-right tabular-nums text-chalk">
                {definition.get(playerB.stats)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
