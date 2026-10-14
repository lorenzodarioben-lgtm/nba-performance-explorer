import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Link, useParams, useSearchParams } from 'react-router';
import { z } from 'zod';
import {
  RecordedPlayerSeasonResponseSchema,
  ResearchPlayerIdSchema,
  type ProfileMetric,
  type RecordedPlayerSeasonResponse,
} from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import { QueryFeedback, ResearchTable, SourceNote } from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { Stagger, StaggerItem, useSeen } from '../../motion/choreography';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { easings } from '../../motion/tokens';
import { NullValue, Notice } from '../../ui/DataState';
import { Segmented } from '../../ui/Segmented';
import { Slate } from '../../ui/Slate';

const LABELS: Record<ProfileMetric, { short: string; long: string }> = {
  pointsPerGame: { short: 'PTS', long: 'Points per game' },
  reboundsPerGame: { short: 'REB', long: 'Rebounds per game' },
  assistsPerGame: { short: 'AST', long: 'Assists per game' },
  stealsPerGame: { short: 'STL', long: 'Steals per game' },
  blocksPerGame: { short: 'BLK', long: 'Blocks per game' },
  minutesPerGame: { short: 'MIN', long: 'Minutes per game' },
};
const MIN_GAMES = ['10', '20', '40', '60'] as const;
const StateSchema = z.object({ minGames: z.enum(MIN_GAMES).optional() }).strict();
const TAPES = [
  { code: 'ARCHIVE', source: 'WIKIPEDIA · CC BY-SA', variant: 'archive' as const },
  { code: 'COHORT', variant: 'derived' as const },
];

/** The player hub's recorded 2023–24 room: genuine archive data even when NBA.com is offline. */
export function RecordedSeasonRoom() {
  const { playerId } = useParams();
  const [params, setParams] = useSearchParams();
  const validId = ResearchPlayerIdSchema.safeParse(playerId).success;
  const state = StateSchema.safeParse(Object.fromEntries(params));
  const minGames = (state.success && state.data.minGames) || '20';
  const query = useQuery({
    queryKey: ['research', 'recorded-player-season', playerId, minGames],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/player-season?player=${encodeURIComponent(playerId ?? '')}&minGames=${minGames}`,
        signal,
        RecordedPlayerSeasonResponseSchema.parse,
      ),
    enabled: validId && state.success,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = query.data;
  return (
    <section className="wrap fr pseason" aria-labelledby="pseason-title">
      <div className="pmod">
        <Slate
          as="h2"
          id="pseason-title"
          title="2023–24 recorded season"
          tapes={TAPES}
          meta={[
            'Regular season',
            `Cohort: ${minGames}+ games`,
            data ? `${data.population} players` : 'Recorded team pages',
          ]}
        />
        <p className="pseason__lede">
          The player&apos;s 2023–24 regular season as published on the team pages of the
          archive, placed within a games-qualified group of recorded players. This
          archive works without NBA.com, and it is historical, not a current or official
          league table.
        </p>
        <div className="pmod__controls">
          <Segmented
            label="Cohort minimum games"
            options={MIN_GAMES.map((g) => ({ value: g, label: `${g}+ GP` }))}
            value={minGames}
            onChange={(value) =>
              setParams(value === '20' ? {} : { minGames: value }, { replace: true })
            }
          />
        </div>
        {!validId || !state.success ? (
          <p role="alert">Invalid player or cohort setting.</p>
        ) : (
          <QueryFeedback pending={query.isPending} failed={query.isError} />
        )}
      </div>
      {data ? <SeasonBody data={data} minGames={minGames} /> : null}
    </section>
  );
}

function SeasonBody({
  data,
  minGames,
}: {
  data: RecordedPlayerSeasonResponse;
  minGames: string;
}) {
  if (!data.stints.length)
    return (
      <Notice title="Not in the recorded archive">
        {data.exclusion} The archive lists players by their team pages and explicit NBA
        identifiers only; nothing is matched by name. Browse{' '}
        <Link to="/leaders/recorded">recorded leaders</Link> or{' '}
        <Link to="/discover/recorded">group discovery</Link> to find recorded players.
      </Notice>
    );
  const games = data.stints.reduce((s, x) => s + x.row.gamesPlayed, 0);
  const byMetric = new Map(data.categories.map((c) => [c.metric, c]));
  const headline = (
    ['pointsPerGame', 'reboundsPerGame', 'assistsPerGame'] as const
  ).map((metric) => ({
    metric,
    value:
      byMetric.get(metric)?.value ??
      (data.stints.length === 1 ? data.stints[0]!.row[metric] : null),
  }));
  return (
    <>
      <dl className="scoreboard pseason__board">
        {headline.map(({ metric, value }) => (
          <div key={metric} className="scoreboard__cell">
            <dt>{LABELS[metric].long}</dt>
            <dd className="num">{value === null ? '—' : value.toFixed(1)}</dd>
            <p className="intel-board__note">
              {byMetric.get(metric)
                ? `${ordinal(Math.round(byMetric.get(metric)!.percentile))} percentile · rank ${byMetric.get(metric)!.rank} of ${data.population}`
                : 'Outside the cohort'}
            </p>
          </div>
        ))}
      </dl>

      <section className="pmod" aria-labelledby="pseason-cohort">
        <Slate
          id="pseason-cohort"
          title="Where the season sits"
          tapes={TAPES}
          meta={[`${games} games`, `${data.population} qualified players`]}
        />
        {data.qualified ? (
          <PercentileBoard data={data} />
        ) : (
          <Notice tone="warn" title="Outside this cohort">
            {data.exclusion} Lower the games minimum or read the published team rows
            below.
          </Notice>
        )}
      </section>

      <section className="pmod" aria-labelledby="pseason-stints">
        <Slate
          id="pseason-stints"
          title="Team rows as published"
          tapes={[TAPES[0]!]}
          meta={[
            `${data.stints.length} team page${data.stints.length === 1 ? '' : 's'}`,
          ]}
        />
        <ResearchTable label="Published 2023-24 team rows">
          <table>
            <caption>
              Per-game values exactly as each team page publishes them; a traded player
              has one row per team.
            </caption>
            <thead>
              <tr>
                {[
                  'Team',
                  'GP',
                  'GS',
                  'MIN',
                  'PTS',
                  'REB',
                  'AST',
                  'STL',
                  'BLK',
                  'FG%',
                  '3P%',
                  'FT%',
                ].map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.stints.map(({ team, row }) => (
                <tr key={team.id}>
                  <th scope="row">
                    <Link to={`/teams/${team.id}/season`}>{team.name}</Link>
                  </th>
                  <td>{row.gamesPlayed}</td>
                  <td>{row.gamesStarted ?? <NullValue />}</td>
                  {(
                    [
                      'minutesPerGame',
                      'pointsPerGame',
                      'reboundsPerGame',
                      'assistsPerGame',
                      'stealsPerGame',
                      'blocksPerGame',
                    ] as const
                  ).map((k) => (
                    <td key={k}>{row[k] ?? <NullValue />}</td>
                  ))}
                  {(
                    [
                      'fieldGoalPercentage',
                      'threePointPercentage',
                      'freeThrowPercentage',
                    ] as const
                  ).map((k) => (
                    <td key={k}>
                      {row[k] === null ? (
                        <NullValue />
                      ) : (
                        `${(row[k]! * 100).toFixed(1)}%`
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ResearchTable>
      </section>

      {data.similar.length ? <SimilarSeasons data={data} /> : null}

      <SaveResearchButton
        kind="player"
        label={`${data.name ?? data.playerId} 2023-24 recorded season`}
        path={`/players/${data.playerId}/archive${minGames === '20' ? '' : `?minGames=${minGames}`}`}
      />
      <SourceNote provenance={data.provenance} />
      <p className="pseason__credits">
        Team rows adapted from{' '}
        {data.stints.map((s, i) => (
          <span key={s.team.id}>
            {i ? ', ' : ''}
            <a href={s.source.url} target="_blank" rel="noreferrer">
              {s.source.title} (revision {s.source.revision})
            </a>
          </span>
        ))}{' '}
        by Wikipedia contributors, CC BY-SA 4.0.
      </p>
    </>
  );
}

function PercentileBoard({ data }: { data: RecordedPlayerSeasonResponse }) {
  const allowed = useMotionAllowed();
  const [ref, seen] = useSeen<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="pctboard"
      role="list"
      aria-label="Cohort percentiles by category"
    >
      {data.categories.map((c, i) => {
        const population = data.metricPopulations.find((m) => m.metric === c.metric);
        return (
          <div key={c.metric} className="pctboard__row" role="listitem">
            <span className="pctboard__label" title={LABELS[c.metric].long}>
              {LABELS[c.metric].short}
            </span>
            <span className="pctboard__value num">{c.value.toFixed(1)}</span>
            <span className="pctboard__track" aria-hidden="true">
              <span className="pctboard__mid" />
              {allowed ? (
                <motion.i
                  style={{ originX: 0 }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: seen ? c.percentile / 100 : 0 }}
                  transition={{ duration: 0.8, ease: easings.arena, delay: i * 0.06 }}
                />
              ) : (
                <i style={{ transform: `scaleX(${c.percentile / 100})` }} />
              )}
            </span>
            <span className="pctboard__pct num">
              {ordinal(Math.round(c.percentile))}
              <span className="sr-only"> percentile</span>
            </span>
            <span className="pctboard__meta">
              rank {c.rank} · cohort mean {population?.mean?.toFixed(1) ?? '—'}
            </span>
          </div>
        );
      })}
      <p className="lchart__note">
        Percentile = share of the cohort below the value (ties count half). The tick
        marks the 50th percentile. Higher is numerically higher, not better: minutes and
        blocks describe a role as much as a level.
      </p>
    </div>
  );
}

function SimilarSeasons({ data }: { data: RecordedPlayerSeasonResponse }) {
  return (
    <section className="pmod" aria-labelledby="pseason-similar">
      <Slate
        id="pseason-similar"
        title="Closest recorded seasons"
        tapes={[{ code: 'Z-SCORE DISTANCE', variant: 'derived' }]}
        meta={['Six per-game categories, equal weight', 'Same cohort']}
      />
      <Stagger as="ol" className="simgrid" gap={0.04}>
        {data.similar.map((s) => (
          <StaggerItem as="li" key={s.playerId}>
            <div className="simcard">
              <div className="simcard__head">
                <Link to={`/players/${s.playerId}/archive`} className="simcard__name">
                  {s.name}
                </Link>
                <span
                  className="simcard__dist num"
                  title="Euclidean distance between z-scores"
                >
                  {s.distance.toFixed(2)}
                </span>
              </div>
              <span className="simcard__teams">
                {s.teams.map((t) => t.abbreviation).join(' / ')} · {s.gamesPlayed} GP
              </span>
              <span
                className="simcard__diffs"
                aria-label="Their z-score minus this player's, by category"
              >
                {data.metrics.map((metric, i) => {
                  const d = s.zDifferences[i]!;
                  return (
                    <span
                      key={metric}
                      className="simcard__diff"
                      title={`${LABELS[metric].long}: ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(2)} SD`}
                    >
                      <b>{LABELS[metric].short}</b>
                      <i
                        className={d >= 0 ? 'is-up' : 'is-down'}
                        style={{ height: `${Math.min(50, Math.abs(d) * 25)}%` }}
                      />
                      <span className="sr-only">
                        {d >= 0 ? 'plus' : 'minus'} {Math.abs(d).toFixed(2)}
                      </span>
                    </span>
                  );
                })}
              </span>
              <Link
                className="simcard__go"
                to={`/lab/profiles?players=${data.playerId},${s.playerId}`}
              >
                Compare profiles
              </Link>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
      <p className="lchart__note">
        Distance is the square root of the summed squared z-score differences across the
        six categories; smaller is closer. Bars show where the other season sits above
        (red, up) or below (grey, down) this one, up to two standard deviations. A
        resemblance in box-score volume, not a judgement of role or quality.
      </p>
    </section>
  );
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
