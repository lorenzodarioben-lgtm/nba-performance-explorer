import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  ArchiveRankingResponseSchema,
  PlayoffBracketResponseSchema,
  RecordedRecordsResponseSchema,
  RecordedTeamRankingsResponseSchema,
} from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import { calendarLabel } from '../league/Scoreboard';
import { playoffRecord } from '../playoffs/bracket-layout';
import { Stagger, StaggerItem } from '../../motion/choreography';
import { Slate } from '../../ui/Slate';

const options = {
  retry: false,
  staleTime: 60 * 60_000,
  refetchOnWindowFocus: false,
} as const;

const TOOLS: readonly { to: string; label: string; blurb: string }[] = [
  {
    to: '/standings/race',
    label: 'Standings race',
    blurb: 'Replay the ladder date by date',
  },
  {
    to: '/standings/recorded',
    label: 'Team rankings',
    blurb: 'Records, splits, streaks',
  },
  {
    to: '/games/bracket',
    label: 'Playoff bracket',
    blurb: 'All 15 series, game by game',
  },
  {
    to: '/leaders/recorded',
    label: 'Recorded leaders',
    blurb: 'Every per-game category',
  },
  {
    to: '/history/records',
    label: 'Single-game records',
    blurb: 'Highest and lowest finals',
  },
  {
    to: '/history/progression',
    label: 'Record progression',
    blurb: 'How records moved',
  },
  {
    to: '/lab/profiles',
    label: 'Percentile profiles',
    blurb: 'Players within a cohort',
  },
  { to: '/lab/teams', label: 'Team vs team', blurb: 'Two seasons and their meetings' },
];

/**
 * The 2023–24 research hub on the season page: four research paths whose opening facts are read
 * live from the archive endpoints (each card loads and fails on its own), and every season tool.
 */
export function SeasonResearchHub() {
  const best = useQuery({
    queryKey: ['research', 'hub', 'best-record'],
    queryFn: ({ signal }) =>
      fetchResearch(
        '/api/recorded/team-rankings?metric=winPercentage',
        signal,
        RecordedTeamRankingsResponseSchema.parse,
      ),
    ...options,
  });
  const bracket = useQuery({
    queryKey: ['research', 'playoff-bracket'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/games/bracket', signal, PlayoffBracketResponseSchema.parse),
    ...options,
  });
  const scorer = useQuery({
    queryKey: ['research', 'hub', 'scoring-leader'],
    queryFn: ({ signal }) =>
      fetchResearch(
        '/api/recorded/leaders?metric=pointsPerGame&pageSize=1',
        signal,
        ArchiveRankingResponseSchema.parse,
      ),
    ...options,
  });
  const shootout = useQuery({
    queryKey: ['research', 'hub', 'combined-points'],
    queryFn: ({ signal }) =>
      fetchResearch(
        '/api/recorded/records?metric=combinedPoints',
        signal,
        RecordedRecordsResponseSchema.parse,
      ),
    ...options,
  });

  const top = best.data?.rows[0];
  const champion = bracket.data?.champion;
  const finals = bracket.data?.series.find((s) => s.round === 4);
  const leader = scorer.data?.rows[0];
  const game = shootout.data?.games[0];

  return (
    <section className="pmod seasonhub" aria-labelledby="season-hub">
      <Slate
        id="season-hub"
        title="Research the 2023–24 season"
        tapes={[
          { code: 'ARCHIVE', source: 'WIKIPEDIA · CC BY-SA', variant: 'archive' },
          { code: 'LIVE QUERIES', variant: 'derived' },
        ]}
        meta={['Four research paths', 'Every recorded tool for the season']}
      />
      <Stagger as="ol" className="paths" gap={0.06}>
        <Path
          n={1}
          title="The best regular season"
          state={best}
          fact={
            top ? (
              <>
                <b>{top.team.name}</b> finished {top.wins}–{top.losses} in{' '}
                {top.observedGames} source-agreed games, the best observed win rate.
              </>
            ) : null
          }
          steps={
            top
              ? [
                  {
                    to: `/teams/${top.team.id}/season`,
                    label: 'Their season, game by game',
                  },
                  {
                    to: `/standings/race?conference=${top.conference}&team=${top.team.id}`,
                    label: 'Their place in the race',
                  },
                  { to: '/standings/recorded', label: 'Every team ranked' },
                ]
              : []
          }
        />
        <Path
          n={2}
          title="The champion's run"
          state={bracket}
          fact={
            champion && finals && bracket.data ? (
              <>
                <b>{champion.name}</b> went{' '}
                {playoffRecord(bracket.data.series, champion.id).wins}–
                {playoffRecord(bracket.data.series, champion.id).losses} through four
                rounds and won the Finals {Math.max(...finals.wins)}–
                {Math.min(...finals.wins)}.
              </>
            ) : bracket.data ? (
              <>The recorded playoff games do not form a complete bracket.</>
            ) : null
          }
          steps={
            finals && champion
              ? [
                  {
                    to: `/games/bracket?series=${finals.id}`,
                    label: 'The Finals, game by game',
                  },
                  { to: '/games/bracket', label: 'The whole bracket' },
                  { to: `/teams/${champion.id}/season`, label: 'Their regular season' },
                ]
              : [{ to: '/games', label: 'Recorded playoff games' }]
          }
        />
        <Path
          n={3}
          title="The top scorer in the record"
          state={scorer}
          fact={
            leader && scorer.data ? (
              <>
                <b>{leader.name}</b> averaged {leader.value.toFixed(1)} points in{' '}
                {leader.gamesPlayed} games, highest among{' '}
                {scorer.data.qualifiedPopulation} players with{' '}
                {scorer.data.query.minGames}+ recorded games. The official scoring title
                used a stricter games rule.
              </>
            ) : null
          }
          steps={
            leader
              ? [
                  {
                    to: `/players/${leader.playerId}/archive`,
                    label: 'The recorded season and its closest matches',
                  },
                  {
                    to: `/lab/profiles?players=${leader.playerId}`,
                    label: 'The percentile profile',
                  },
                  { to: '/leaders/recorded', label: 'The full leaderboard' },
                ]
              : []
          }
        />
        <Path
          n={4}
          title="The highest-scoring game"
          state={shootout}
          fact={
            game && shootout.data ? (
              <>
                <b>
                  {game.away.abbreviation} {game.awayScore} at {game.home.abbreviation}{' '}
                  {game.homeScore}
                </b>{' '}
                on {calendarLabel(game.date)}: {shootout.data.value} combined points,
                the most in any source-agreed regular-season game.
              </>
            ) : null
          }
          steps={
            game
              ? [
                  {
                    to: `/teams/${game.away.id}/season`,
                    label: `${game.away.abbreviation} season`,
                  },
                  {
                    to: `/teams/${game.home.id}/season`,
                    label: `${game.home.abbreviation} season`,
                  },
                  {
                    to: '/history/records?metric=combinedPoints',
                    label: 'Every single-game record',
                  },
                ]
              : []
          }
        />
      </Stagger>
      <h3 className="seasonhub__toolhead">Every 2023–24 tool</h3>
      <ul className="seasontools">
        {TOOLS.map((tool) => (
          <li key={tool.to}>
            <Link to={tool.to} className="seasontool">
              <b>{tool.label}</b>
              <span>{tool.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Path({
  n,
  title,
  state,
  fact,
  steps,
}: {
  n: number;
  title: string;
  state: { isPending: boolean; isError: boolean };
  fact: ReactNode;
  steps: readonly { to: string; label: string }[];
}) {
  return (
    <StaggerItem as="li" className="path">
      <span className="path__n" aria-hidden="true">
        {String(n).padStart(2, '0')}
      </span>
      <h3 className="path__title">{title}</h3>
      <p className="path__fact">
        {state.isPending
          ? 'Reading the archive…'
          : state.isError || !fact
            ? 'This source is unavailable right now; no substitute is shown.'
            : fact}
      </p>
      {steps.length ? (
        <ol className="path__steps">
          {steps.map((step) => (
            <li key={step.to}>
              <Link to={step.to}>{step.label}</Link>
            </li>
          ))}
        </ol>
      ) : null}
    </StaggerItem>
  );
}
