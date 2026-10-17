import { useId, useState } from 'react';

import type { PlayerSeasonStats } from '@nba-performance-explorer/contracts';

import { motion } from 'motion/react';

import { FlipValue, Reveal, Stagger, StaggerItem } from '../../motion/choreography';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { springs } from '../../motion/tokens';
import { LoadingLine, Notice } from '../../ui/DataState';
import { Slate } from '../../ui/Slate';
import type { TapeSpec } from '../../ui/Tape';
import { formatSeason } from '../player-hub/seasons';
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

const QUERIED: TapeSpec = { code: 'NBA.com', source: 'Queried', variant: 'queried' };

// Percentages carry a quiet meter (0–100%) under the figure; the figure stays the reading.
const PERCENT_LABELS = new Set([
  'Field-goal percentage',
  'Three-point percentage',
  'Free-throw percentage',
]);

function StatList({ stats }: { stats: PlayerSeasonStats }) {
  const ratios: Record<string, number> = {
    'Field-goal percentage': stats.fieldGoalPercentage,
    'Three-point percentage': stats.threePointPercentage,
    'Free-throw percentage': stats.freeThrowPercentage,
  };
  return (
    <div className="statsheet">
      <dl className="statsheet__context">
        {buildContextRows(stats).map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>

      {/* Headline scoreboard: points, rebounds and assists as oversized figures. A change
          between two loaded seasons flips the figure; no intermediate number is drawn. */}
      <Stagger as="dl" className="scoreboard" gap={0.08}>
        {buildHeadlineRows(stats).map((row) => (
          <StaggerItem key={row.label} className="scoreboard__cell" variant="rise">
            <dt>{row.label}</dt>
            <dd>
              <FlipValue value={row.value} />
            </dd>
          </StaggerItem>
        ))}
      </Stagger>

      {/* Supporting statistics: a calm stat sheet with hairline separators, not cards. */}
      <Reveal delay={0.1}>
        <dl className="statgrid">
          {buildSecondaryRows(stats).map((row) => (
            <div key={row.label} className="statgrid__cell">
              <dt>{row.label}</dt>
              <dd>
                <FlipValue value={row.value} />
              </dd>
              {PERCENT_LABELS.has(row.label) ? (
                <span className="meter" aria-hidden="true">
                  <MeterFill ratio={ratios[row.label] ?? 0} />
                </span>
              ) : null}
            </div>
          ))}
        </dl>
      </Reveal>
    </div>
  );
}

function MeterFill({ ratio }: { ratio: number }) {
  const allowed = useMotionAllowed();
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <motion.i
      style={{ originX: 0 }}
      initial={allowed ? { scaleX: 0 } : false}
      animate={{ scaleX: clamped }}
      transition={{ ...springs.data, delay: allowed ? 0.25 : 0 }}
    />
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
    return <LoadingLine>Loading season statistics...</LoadingLine>;
  }

  if (statsQuery.isError) {
    const kind =
      statsQuery.error instanceof PlayerSeasonError ? statsQuery.error.kind : 'error';

    return (
      <Notice tone="error" role="alert">
        {kind === 'season-not-found'
          ? 'That season is unavailable.'
          : 'Season statistics are unavailable. Please try again.'}
      </Notice>
    );
  }

  // Only render statistics that belong to the currently selected season; while a newly
  // selected season is loading the query is re-keyed, so this never shows stale numbers.
  if (statsQuery.data.season !== selectedSeason) {
    return <LoadingLine>Loading season statistics...</LoadingLine>;
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
    <section aria-labelledby={headingId} className="pmod">
      <Slate
        title="Season statistics"
        id={headingId}
        tapes={[QUERIED]}
        meta={effectiveSeason ? [formatSeason(effectiveSeason), 'Per game'] : []}
      />

      {seasonsQuery.isPending ? <LoadingLine>Loading seasons...</LoadingLine> : null}

      {seasonsQuery.isError ? (
        <Notice tone="error" role="alert">
          Season statistics are unavailable. Please try again.
        </Notice>
      ) : null}

      {seasonsQuery.isSuccess && seasons.length === 0 ? (
        <p role="status" aria-live="polite" className="pmod__empty">
          No season statistics are available for this player.
        </p>
      ) : null}

      {seasonsQuery.isSuccess && seasons.length > 0 && effectiveSeason !== null ? (
        <div>
          <div className="pmod__controls">
            <label htmlFor={selectId} className="field-label">
              Season
            </label>
            <select
              id={selectId}
              value={effectiveSeason}
              onChange={(event) => {
                setChosenSeason(event.target.value);
              }}
              className="select"
            >
              {seasons.map((entry) => (
                <option key={entry.season} value={entry.season}>
                  {entry.season} ·{' '}
                  {entry.team ? entry.team.abbreviation : 'Multiple teams'}
                </option>
              ))}
            </select>
          </div>

          <StatsRegion statsQuery={statsQuery} selectedSeason={effectiveSeason} />

          <PlayerGameLog playerId={playerId} season={effectiveSeason} />
        </div>
      ) : null}
    </section>
  );
}
