import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import type { PlayerSummary } from '@nba-performance-explorer/contracts';

import { usePlayerProfileQuery } from '../players/usePlayerProfileQuery';
import { usePlayerSeasonsQuery } from '../players/usePlayerSeasonsQuery';
import { usePlayerSeasonStatsQuery } from '../players/usePlayerSeasonStatsQuery';
import {
  buildComparisonParams,
  changeComparisonSeason,
  clearComparisonPlayer1,
  clearComparisonPlayer2,
  type ComparisonSelection,
  type ComparisonUrlState,
  intersectSeasonsNewestFirst,
  isCommonSeason,
  newestCommonSeason,
  readComparisonUrlState,
  selectComparisonPlayer1,
  selectComparisonPlayer2,
  selectionFromUrlState,
} from './comparison-state';
import { ComparisonPlayerSlot } from './ComparisonPlayerSlot';
import { ComparisonSeasonSelector } from './ComparisonSeasonSelector';
import { PlayerComparisonTable } from './PlayerComparisonTable';

type ActiveSlot = 'player1' | 'player2' | null;

function defaultActiveSlot(state: ComparisonUrlState): ActiveSlot {
  if (state.player1.status !== 'valid') {
    return 'player1';
  }
  if (state.player2.status !== 'valid' || state.duplicate) {
    return 'player2';
  }
  return null;
}

// After a selection or clear, point the active combobox at whichever slot still needs a
// player, so the next step is staged without showing two comboboxes at once.
function nextActiveSlot(selection: ComparisonSelection): ActiveSlot {
  if (!selection.player1) {
    return 'player1';
  }
  if (!selection.player2) {
    return 'player2';
  }
  return null;
}

function StatusMessage({ children }: { children: string }) {
  return (
    <p role="status" aria-live="polite" className="mt-6 text-sm text-zinc-700">
      {children}
    </p>
  );
}

function AlertMessage({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="mt-6 border-l-4 border-red-600 pl-3 text-sm text-red-800"
    >
      {children}
    </p>
  );
}

export function PlayerComparisonPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = readComparisonUrlState(searchParams);

  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const [activeSlot, setActiveSlot] = useState<ActiveSlot>(() =>
    defaultActiveSlot(state),
  );

  // Request ids: undefined disables a query. Player B is also disabled while it duplicates
  // Player A so no duplicate comparison request is made.
  const player1QueryId = state.player1.playerId ?? undefined;
  const player2QueryId = state.duplicate
    ? undefined
    : (state.player2.playerId ?? undefined);

  // Profiles and season lists run in parallel for each valid slot.
  const profile1 = usePlayerProfileQuery(player1QueryId);
  const profile2 = usePlayerProfileQuery(player2QueryId);
  const seasons1 = usePlayerSeasonsQuery(player1QueryId);
  const seasons2 = usePlayerSeasonsQuery(player2QueryId);

  const bothSelected = player1QueryId !== undefined && player2QueryId !== undefined;
  const bothKnown = profile1.isSuccess && profile2.isSuccess;
  const seasonsLoaded = seasons1.isSuccess && seasons2.isSuccess;

  const seasonIds1 = (seasons1.data ?? []).map((entry) => entry.season);
  const seasonIds2 = (seasons2.data ?? []).map((entry) => entry.season);
  const commonSeasons =
    bothSelected && bothKnown && seasonsLoaded
      ? intersectSeasonsNewestFirst(seasonIds1, seasonIds2)
      : [];

  // The effective season: an explicit valid common season, or — when the URL has no season —
  // the newest common season (which the effect below persists to the URL via replace).
  let effectiveSeason: string | null = null;
  if (bothSelected && bothKnown && seasonsLoaded) {
    if (
      state.season.status === 'valid' &&
      state.season.season !== null &&
      isCommonSeason(state.season.season, seasonIds1, seasonIds2)
    ) {
      effectiveSeason = state.season.season;
    } else if (state.season.status === 'empty') {
      effectiveSeason = newestCommonSeason(seasonIds1, seasonIds2);
    }
  }

  const seasonStatus = state.season.status;

  // Persist an auto-selected default season to the URL using history replacement (not a push),
  // only when the URL has no season. Once written the status is no longer 'empty', so this
  // cannot loop.
  useEffect(() => {
    if (
      player1QueryId !== undefined &&
      player2QueryId !== undefined &&
      bothKnown &&
      seasonsLoaded &&
      seasonStatus === 'empty' &&
      effectiveSeason !== null
    ) {
      setSearchParams(
        buildComparisonParams({
          player1: player1QueryId,
          player2: player2QueryId,
          season: effectiveSeason,
        }),
        { replace: true },
      );
    }
  }, [
    player1QueryId,
    player2QueryId,
    bothKnown,
    seasonsLoaded,
    seasonStatus,
    effectiveSeason,
    setSearchParams,
  ]);

  // Statistics run in parallel only when the comparison is ready (both players known and a
  // valid common season in effect); otherwise the season is null and both queries are disabled.
  const comparisonReady = bothSelected && bothKnown && effectiveSeason !== null;
  const statsSeason = comparisonReady ? effectiveSeason : null;
  const stats1 = usePlayerSeasonStatsQuery(player1QueryId, statsSeason);
  const stats2 = usePlayerSeasonStatsQuery(player2QueryId, statsSeason);

  const base = selectionFromUrlState(state);

  function applySelection(next: ComparisonSelection) {
    setActiveSlot(nextActiveSlot(next));
    setSearchParams(buildComparisonParams(next));
  }

  function handleSelectPlayer1(player: PlayerSummary) {
    if (player.id === base.player2) {
      return;
    }
    applySelection(selectComparisonPlayer1(base, player.id));
  }

  function handleSelectPlayer2(player: PlayerSummary) {
    if (player.id === base.player1) {
      return;
    }
    applySelection(selectComparisonPlayer2(base, player.id));
  }

  function handleClearPlayer1() {
    applySelection(clearComparisonPlayer1(base));
  }

  function handleClearPlayer2() {
    applySelection(clearComparisonPlayer2(base));
  }

  function handleSeasonChange(season: string) {
    setSearchParams(buildComparisonParams(changeComparisonSeason(base, season)));
  }

  function renderComparisonBody() {
    if (state.duplicate) {
      // Player B is treated as invalid for comparison; the slot offers replacement below.
      return (
        <AlertMessage>
          You selected the same player for both slots. Choose a different player for
          Player B.
        </AlertMessage>
      );
    }

    if (!bothSelected) {
      return (
        <StatusMessage>
          Select two distinct players to see their regular-season comparison.
        </StatusMessage>
      );
    }

    if (profile1.isPending || profile2.isPending) {
      return <StatusMessage>Loading players...</StatusMessage>;
    }

    if (!profile1.isSuccess || !profile2.isSuccess) {
      // The affected slot shows its own recovery state.
      return null;
    }

    if (seasons1.isPending || seasons2.isPending) {
      return <StatusMessage>Loading seasons...</StatusMessage>;
    }

    if (seasons1.isError || seasons2.isError) {
      return (
        <AlertMessage>We could not load season data. Please try again.</AlertMessage>
      );
    }

    const name1 = profile1.data.fullName;
    const name2 = profile2.data.fullName;
    const noSeasons1 = seasonIds1.length === 0;
    const noSeasons2 = seasonIds2.length === 0;

    if (noSeasons1 && noSeasons2) {
      return (
        <StatusMessage>
          {`Neither ${name1} nor ${name2} has regular-season data to compare.`}
        </StatusMessage>
      );
    }
    if (noSeasons1) {
      return (
        <StatusMessage>
          {`${name1} has no regular-season data, so there is nothing to compare.`}
        </StatusMessage>
      );
    }
    if (noSeasons2) {
      return (
        <StatusMessage>
          {`${name2} has no regular-season data, so there is nothing to compare.`}
        </StatusMessage>
      );
    }

    if (commonSeasons.length === 0) {
      return (
        <StatusMessage>
          {`${name1} and ${name2} have no regular-season in common, so their statistics cannot be compared.`}
        </StatusMessage>
      );
    }

    const seasonUnavailable =
      state.season.status === 'valid' &&
      state.season.season !== null &&
      !isCommonSeason(state.season.season, seasonIds1, seasonIds2);

    return (
      <div className="mt-6 border-t border-zinc-200 pt-6">
        {state.season.status === 'invalid' ? (
          <AlertMessage>
            That season link is not valid. Choose a comparison season below.
          </AlertMessage>
        ) : null}
        {seasonUnavailable ? (
          <AlertMessage>
            That season is not available for both players. Choose a comparison season
            below.
          </AlertMessage>
        ) : null}

        <ComparisonSeasonSelector
          seasons={commonSeasons}
          value={effectiveSeason}
          onSeasonChange={handleSeasonChange}
        />

        {renderStatistics(name1, name2)}
      </div>
    );
  }

  function renderStatistics(name1: string, name2: string) {
    if (effectiveSeason === null) {
      return null;
    }

    if (stats1.isError || stats2.isError) {
      return (
        <AlertMessage>
          We could not load the comparison statistics. Please try again.
        </AlertMessage>
      );
    }

    if (
      stats1.isSuccess &&
      stats2.isSuccess &&
      stats1.data.season === effectiveSeason &&
      stats2.data.season === effectiveSeason &&
      player1QueryId !== undefined &&
      player2QueryId !== undefined
    ) {
      return (
        <PlayerComparisonTable
          season={effectiveSeason}
          playerA={{ playerId: player1QueryId, fullName: name1, stats: stats1.data }}
          playerB={{ playerId: player2QueryId, fullName: name2, stats: stats2.data }}
        />
      );
    }

    return <StatusMessage>Loading comparison statistics...</StatusMessage>;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-semibold uppercase text-zinc-600">Compare</p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-4xl font-bold text-zinc-950 outline-none"
      >
        Compare players
      </h1>
      <p className="mt-3 max-w-2xl text-zinc-700">
        Choose two players to compare their regular-season statistics for a season they
        both played.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ComparisonPlayerSlot
          slotName="Player A"
          comboboxLabel="Search for Player A"
          slot={state.player1}
          isDuplicate={false}
          profileQuery={profile1}
          isActive={activeSlot === 'player1'}
          excludePlayerId={base.player2 ?? undefined}
          onActivate={() => {
            setActiveSlot('player1');
          }}
          onCancel={() => {
            setActiveSlot(null);
          }}
          onSelect={handleSelectPlayer1}
          onClear={handleClearPlayer1}
        />
        <ComparisonPlayerSlot
          slotName="Player B"
          comboboxLabel="Search for Player B"
          slot={state.player2}
          isDuplicate={state.duplicate}
          profileQuery={profile2}
          isActive={activeSlot === 'player2'}
          excludePlayerId={base.player1 ?? undefined}
          onActivate={() => {
            setActiveSlot('player2');
          }}
          onCancel={() => {
            setActiveSlot(null);
          }}
          onSelect={handleSelectPlayer2}
          onClear={handleClearPlayer2}
        />
      </div>

      {renderComparisonBody()}

      <Link
        to="/"
        className="mt-10 inline-block font-semibold text-red-700 underline underline-offset-4"
      >
        Back to search
      </Link>
    </main>
  );
}
