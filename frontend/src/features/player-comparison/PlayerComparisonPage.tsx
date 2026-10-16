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
import { ComparisonCareerArc } from './ComparisonCareerArc';
import { ComparisonPlayerSlot } from './ComparisonPlayerSlot';
import { ComparisonSeasonSelector } from './ComparisonSeasonSelector';
import { ComparisonStatGraph } from './ComparisonStatGraph';
import { ComparisonTableDisclosure } from './ComparisonTableDisclosure';
import { KineticHeadline, Reveal } from '../../motion/choreography';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { getSceneImage } from '../../ui/sceneImages';
import { easings } from '../../motion/tokens';
import { Notice } from '../../ui/DataState';
import { Icon } from '../../ui/Icon';
import { motion } from 'motion/react';

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
    <p role="status" aria-live="polite" className="cmp-status">
      {children}
    </p>
  );
}

function AlertMessage({ children }: { children: string }) {
  return (
    <Notice tone="error" role="alert">
      {children}
    </Notice>
  );
}

/** The VS mark: it lands once when the matchup is set, then stays still. */
function VersusMark() {
  const allowed = useMotionAllowed();
  return (
    <motion.span
      className="cmp-vs__mark"
      aria-hidden="true"
      initial={allowed ? { scale: 1.6, opacity: 0, rotate: -8 } : false}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ duration: 0.7, ease: easings.arena, delay: 0.25 }}
    >
      VS
    </motion.span>
  );
}

const MATCHUP = getSceneImage('kyrie-matchup');

/** The page's header photograph: an editorial matchup, with provenance kept in the registry. */
function CompareBackdrop() {
  if (!MATCHUP) return null;
  return (
    <figure className="cmpshot" aria-hidden="true">
      <img
        src={MATCHUP.src}
        srcSet={MATCHUP.srcSet}
        sizes="(max-width: 767px) 100vw, min(64vw, 860px)"
        width={MATCHUP.width}
        height={MATCHUP.height}
        alt={MATCHUP.alt}
        fetchPriority="high"
        decoding="async"
        style={{ objectPosition: MATCHUP.objectPosition }}
      />
    </figure>
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
      <div className="cmp-body">
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
        <>
          <ComparisonStatGraph
            season={effectiveSeason}
            playerA={{ fullName: name1, stats: stats1.data }}
            playerB={{ fullName: name2, stats: stats2.data }}
          />
          <ComparisonCareerArc
            playerA={{ playerId: player1QueryId, fullName: name1 }}
            playerB={{ playerId: player2QueryId, fullName: name2 }}
          />
          <ComparisonTableDisclosure
            season={effectiveSeason}
            playerA={{ playerId: player1QueryId, fullName: name1, stats: stats1.data }}
            playerB={{ playerId: player2QueryId, fullName: name2, stats: stats2.data }}
          />
        </>
      );
    }

    return <StatusMessage>Loading comparison statistics...</StatusMessage>;
  }

  return (
    <main className="cmp">
      <div className="wrap cmp__inner">
        <div className="cmp__head">
          <CompareBackdrop />
          <p className="t-eyebrow is-red">Head to head</p>
          <KineticHeadline
            lines={['Compare', 'players']}
            headingRef={headingRef}
            tabIndex={-1}
            className="cmp__title"
          />
          <Reveal delay={0.3} variant="fade">
            <p className="cmp__lede">
              Choose two players to compare their regular-season statistics for a season
              they both played.
            </p>
          </Reveal>
        </div>

        {/* Player-versus-player hero: two equally prominent identity panels flanking the VS. */}
        <div className="cmp-vs">
          <ComparisonPlayerSlot
            slotName="Player A"
            comboboxLabel="Search for Player A"
            slot={state.player1}
            isDuplicate={false}
            profileQuery={profile1}
            isActive={activeSlot === 'player1'}
            excludePlayerId={base.player2 ?? undefined}
            season={effectiveSeason}
            onActivate={() => {
              setActiveSlot('player1');
            }}
            onCancel={() => {
              setActiveSlot(null);
            }}
            onSelect={handleSelectPlayer1}
            onClear={handleClearPlayer1}
          />

          <div className="cmp-vs__divider">
            <VersusMark />
          </div>

          <ComparisonPlayerSlot
            slotName="Player B"
            comboboxLabel="Search for Player B"
            slot={state.player2}
            isDuplicate={state.duplicate}
            profileQuery={profile2}
            isActive={activeSlot === 'player2'}
            excludePlayerId={base.player1 ?? undefined}
            season={effectiveSeason}
            revealDelayMs={120}
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

        <div className="cmp__foot">
          <Link to="/" className="link-arrow">
            <Icon name="arrowLeft" size={15} />
            Back to search
          </Link>
          <Link to="/lab/compare" className="link-arrow">
            Compare up to four player-seasons
            <Icon name="arrowRight" size={15} />
          </Link>
        </div>
      </div>
    </main>
  );
}
