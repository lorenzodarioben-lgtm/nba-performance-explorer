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

// Season and team are contextual; points/rebounds/assists are the headline; the rest form a
// dense secondary grid. Every value still renders as a <dt>/<dd> pair inside the section, so
// the full statistic set stays available and scannable.
function buildContextRows(stats: PlayerSeasonStats): StatRow[] {
  return [
    { label: 'Season', value: stats.season },
    { label: 'Team', value: stats.team ? stats.team.abbreviation : 'Multiple teams' },
  ];
}

function buildHeadlineRows(stats: PlayerSeasonStats): StatRow[] {
  return [
    { label: 'Points per game', value: formatPerGame(stats.pointsPerGame) },
    { label: 'Rebounds per game', value: formatPerGame(stats.reboundsPerGame) },
    { label: 'Assists per game', value: formatPerGame(stats.assistsPerGame) },
  ];
}

function buildSecondaryRows(stats: PlayerSeasonStats): StatRow[] {
  return [
    { label: 'Games played', value: String(stats.gamesPlayed) },
    { label: 'Minutes per game', value: formatPerGame(stats.minutesPerGame) },
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
    <div className="mt-5">
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {buildContextRows(stats).map((row) => (
          <div key={row.label} className="flex gap-1.5">
            <dt className="text-ink-3">{row.label}</dt>
            <dd className="font-medium tabular-nums text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>

      <dl className="mt-4 grid grid-cols-3 divide-x divide-edge overflow-hidden rounded-md border border-edge bg-surface">
        {buildHeadlineRows(stats).map((row) => (
          <div key={row.label} className="px-4 py-4">
            <dt className="text-xs font-medium text-ink-2">{row.label}</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums text-ink">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
        {buildSecondaryRows(stats).map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-medium text-ink-3">{row.label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ink">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
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
      <p role="status" aria-live="polite" className="mt-5 text-sm text-ink-2">
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
        className="mt-5 rounded-sm border border-edge bg-accent-quiet px-3 py-2 text-sm text-danger"
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
      <p role="status" aria-live="polite" className="mt-5 text-sm text-ink-2">
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
    <section aria-labelledby={headingId} className="mt-10 border-t border-edge pt-8">
      <h2 id={headingId} className="text-2xl font-bold tracking-tight text-ink">
        Season statistics
      </h2>

      {seasonsQuery.isPending ? (
        <p role="status" aria-live="polite" className="mt-3 text-sm text-ink-2">
          Loading seasons...
        </p>
      ) : null}

      {seasonsQuery.isError ? (
        <p
          role="alert"
          className="mt-3 rounded-sm border border-edge bg-accent-quiet px-3 py-2 text-sm text-danger"
        >
          Season statistics are unavailable. Please try again.
        </p>
      ) : null}

      {seasonsQuery.isSuccess && seasons.length === 0 ? (
        <p role="status" aria-live="polite" className="mt-3 text-sm text-ink-2">
          No season statistics are available for this player.
        </p>
      ) : null}

      {seasonsQuery.isSuccess && seasons.length > 0 && effectiveSeason !== null ? (
        <div className="mt-5">
          <label htmlFor={selectId} className="block text-sm font-semibold text-ink">
            Season
          </label>
          <select
            id={selectId}
            value={effectiveSeason}
            onChange={(event) => {
              setChosenSeason(event.target.value);
            }}
            className="field mt-2 w-full max-w-xs sm:w-auto"
          >
            {seasons.map((entry) => (
              <option key={entry.season} value={entry.season}>
                {entry.season} ·{' '}
                {entry.team ? entry.team.abbreviation : 'Multiple teams'}
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
