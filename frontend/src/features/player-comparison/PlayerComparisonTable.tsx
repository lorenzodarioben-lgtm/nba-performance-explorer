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
// existing helpers. Team abbreviation lives in the column header (season-specific) and the
// season lives in the caption, so they are not repeated as rows.
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

function ColumnHeading({ column }: { column: ComparisonColumn }) {
  return (
    <th
      scope="col"
      className="whitespace-nowrap px-4 py-2 text-right align-bottom font-semibold text-ink"
    >
      <span className="block">{column.fullName}</span>
      <span className="block text-sm font-normal text-ink-2">
        {column.stats.team ? column.stats.team.abbreviation : 'Multiple teams'}
      </span>
    </th>
  );
}

// The authoritative, accessible comparison representation: a semantic table with the season in
// the caption, statistic names as row headers, and player identities (with their season team)
// as column headers. No "better player" semantics or colour-coded verdict is applied; the two
// player columns are styled identically and read by numeric alignment alone.
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
      className="mt-4 max-w-full overflow-x-auto scroll-x rounded-md border border-edge"
    >
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <caption className="px-4 pt-3 text-left text-sm text-ink-2">
          Regular-season comparison for the {season} season.
        </caption>
        <thead>
          <tr className="border-b border-edge-strong bg-surface-sunken">
            <th scope="col" className="px-4 py-2 font-semibold text-ink-2">
              Statistic
            </th>
            <ColumnHeading column={playerA} />
            <ColumnHeading column={playerB} />
          </tr>
        </thead>
        <tbody>
          {statDefinitions.map((definition) => (
            <tr key={definition.label} className="border-b border-edge last:border-b-0">
              <th
                scope="row"
                className="whitespace-nowrap px-4 py-2 font-medium text-ink"
              >
                {definition.label}
              </th>
              <td className="px-4 py-2 text-right tabular-nums text-ink">
                {definition.get(playerA.stats)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-ink">
                {definition.get(playerB.stats)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
