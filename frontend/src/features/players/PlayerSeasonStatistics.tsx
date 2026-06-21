import { useId, useState } from 'react';

import type { PlayerSeasonStats } from '@nba-performance-explorer/contracts';

import { formatPercentage, formatPerGame } from './format';
import { PlayerGameLog } from './PlayerGameLog';
import { PlayerSeasonError } from './season-api';
import { usePlayerSeasonsQuery } from './usePlayerSeasonsQuery';
import { usePlayerSeasonStatsQuery } from './usePlayerSeasonStatsQuery';

interface StatRow {
  label: string;
  value: string;
}

function buildStatRows(stats: PlayerSeasonStats): StatRow[] {
  return [
    { label: 'Season', value: stats.season },
    { label: 'Team', value: stats.team.abbreviation },
    { label: 'Games played', value: String(stats.gamesPlayed) },
    { label: 'Minutes per game', value: formatPerGame(stats.minutesPerGame) },
    { label: 'Points per game', value: formatPerGame(stats.pointsPerGame) },
    { label: 'Rebounds per game', value: formatPerGame(stats.reboundsPerGame) },
    { label: 'Assists per game', value: formatPerGame(stats.assistsPerGame) },
    { label: 'Steals per game', value: formatPerGame(stats.stealsPerGame) },
    { label: 'Blocks per game', value: formatPerGame(stats.blocksPerGame) },
    { label: 'Turnovers per game', value: formatPerGame(stats.turnoversPerGame) },
    {
      label: 'Field-goal percentage',
      value: formatPercentage(stats.fieldGoalPercentage),
    },
    {
      label: 'Three-point percentage',
      value: formatPercentage(stats.threePointPercentage),
    },
    {
      label: 'Free-throw percentage',
      value: formatPercentage(stats.freeThrowPercentage),
    },
  ];
}

function StatList({ stats }: { stats: PlayerSeasonStats }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      {buildStatRows(stats).map((row) => (
        <div key={row.label} className="border-t border-zinc-200 pt-2">
          <dt className="text-sm text-zinc-600">{row.label}</dt>
          <dd className="mt-0.5 text-lg font-semibold text-zinc-950">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StatsRegion({
  statsQuery,
  selectedSeason,
}: {
  statsQuery: ReturnType<typeof usePlayerSeasonStatsQuery>;
  selectedSeason: string;
}) {
  if (statsQuery.isPending) {
    return (
      <p role="status" aria-live="polite" className="mt-4 text-sm text-zinc-700">
        Loading season statistics...
      </p>
    );
  }

  if (statsQuery.isError) {
    const kind =
      statsQuery.error instanceof PlayerSeasonError ? statsQuery.error.kind : 'error';

    return (
      <p
        role="alert"
        className="mt-4 border-l-4 border-red-600 pl-3 text-sm text-red-800"
      >
        {kind === 'season-not-found'
          ? 'That season is unavailable.'
          : 'Season statistics are unavailable. Please try again.'}
      </p>
    );
  }

  // Only render statistics that belong to the currently selected season; while a newly
  // selected season is loading the query is re-keyed, so this never shows stale numbers.
  if (statsQuery.data.season !== selectedSeason) {
    return (
      <p role="status" aria-live="polite" className="mt-4 text-sm text-zinc-700">
        Loading season statistics...
      </p>
    );
  }

  return <StatList stats={statsQuery.data} />;
}

export function PlayerSeasonStatistics({ playerId }: { playerId: string }) {
  const seasonsQuery = usePlayerSeasonsQuery(playerId);
  const [chosenSeason, setChosenSeason] = useState<string | null>(null);

  const seasons = seasonsQuery.data ?? [];
  const newestSeason = seasons[0]?.season ?? null;
  // Derive the effective selection from the user's choice and the current list: keep a valid
  // choice, otherwise fall back to the newest available season (or null when empty). This
  // needs no effect, so a seasons rerender never overwrites a still-valid user selection.
  const effectiveSeason =
    chosenSeason !== null && seasons.some((entry) => entry.season === chosenSeason)
      ? chosenSeason
      : newestSeason;

  const statsQuery = usePlayerSeasonStatsQuery(playerId, effectiveSeason);

  const headingId = useId();
  const selectId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="mt-10 border-t border-zinc-200 pt-6"
    >
      <h2 id={headingId} className="text-2xl font-bold text-zinc-950">
        Season statistics
      </h2>

      {seasonsQuery.isPending ? (
        <p role="status" aria-live="polite" className="mt-3 text-sm text-zinc-700">
          Loading seasons...
        </p>
      ) : null}

      {seasonsQuery.isError ? (
        <p
          role="alert"
          className="mt-3 border-l-4 border-red-600 pl-3 text-sm text-red-800"
        >
          Season statistics are unavailable. Please try again.
        </p>
      ) : null}

      {seasonsQuery.isSuccess && seasons.length === 0 ? (
        <p role="status" aria-live="polite" className="mt-3 text-sm text-zinc-700">
          No season statistics are available for this player.
        </p>
      ) : null}

      {seasonsQuery.isSuccess && seasons.length > 0 && effectiveSeason !== null ? (
        <div className="mt-4">
          <label
            htmlFor={selectId}
            className="block text-sm font-semibold text-zinc-900"
          >
            Season
          </label>
          <select
            id={selectId}
            value={effectiveSeason}
            onChange={(event) => {
              setChosenSeason(event.target.value);
            }}
            className="mt-2 w-full max-w-xs border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-950 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-300 sm:w-auto"
          >
            {seasons.map((entry) => (
              <option key={entry.season} value={entry.season}>
                {entry.season} · {entry.team.abbreviation}
              </option>
            ))}
          </select>

          <StatsRegion statsQuery={statsQuery} selectedSeason={effectiveSeason} />
          <PlayerGameLog playerId={playerId} season={effectiveSeason} />
        </div>
      ) : null}
    </section>
  );
}
