import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  PlayoffSeriesFilmRoomResponseSchema,
  RecordedPlayerComparisonResponseSchema,
  RecordedSimilarityResponseSchema,
  RecordedTeamSeasonResponseSchema,
  ShotResponseSchema,
  WorkbenchResponseSchema,
  type DataProvenance,
} from '@nba-performance-explorer/contracts';
import type { ReactNode } from 'react';

import { fetchResearch } from '../research/api';
import { GapBoard } from '../comparison-studio/GapBoard';
import { formatValue } from '../workbench/workbench-config';
import { SIM_LABEL } from '../similarity/similarity-config';
import { embedPlan } from './embed-plan';
import { describeRegion } from '../shot-archive/shot-region';
import { Tape } from '../../ui/Tape';

const PARSE = {
  series: PlayoffSeriesFilmRoomResponseSchema.parse,
  comparison: RecordedPlayerComparisonResponseSchema.parse,
  similarity: RecordedSimilarityResponseSchema.parse,
  workbench: WorkbenchResponseSchema.parse,
  shots: ShotResponseSchema.parse,
  'team-season': RecordedTeamSeasonResponseSchema.parse,
};

/**
 * A linked analysis inside a story: re-read from the same API as its tool, summarised, and
 * linked back to the full interactive view. When the source cannot answer, the story says so
 * and keeps the link; nothing is drawn from stored or invented numbers.
 */
export function StoryEmbed({ path }: { path: string }) {
  const plan = embedPlan(path);
  const query = useQuery({
    queryKey: ['research', 'story-embed', plan.api],
    queryFn: ({ signal }) =>
      fetchResearch(
        plan.api!,
        signal,
        PARSE[plan.kind as keyof typeof PARSE] as (v: unknown) => unknown,
      ),
    enabled: plan.api !== null,
    // A story opens several analyses at once; the API bounds concurrent source work, so a
    // refused request is retried briefly before the story reports the source unavailable.
    retry: 2,
    retryDelay: (attempt) => 500 * (attempt + 1),
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const open = (
    <Link className="story-embed__open" to={path}>
      Open in the {plan.tool.toLowerCase()} →
    </Link>
  );
  if (plan.kind === 'link')
    return (
      <div className="story-embed story-embed--link">
        <p>
          This analysis is shown in its own tool; stories summarise film-room series,
          comparisons, similarity, workbench, Shot Studio and team-season views.
        </p>
        {open}
      </div>
    );
  if (query.isPending)
    return (
      <div className="story-embed" aria-busy="true">
        <p className="story-embed__state">Reading the {plan.tool.toLowerCase()}…</p>
        {open}
      </div>
    );
  if (query.isError || !query.data)
    return (
      <div className="story-embed story-embed--missing" role="note">
        <p className="story-embed__state">
          The source for this analysis is unavailable right now, so nothing is shown in
          its place. The link still opens the original tool.
        </p>
        {open}
      </div>
    );
  const data = query.data as never;
  return (
    <figure className="story-embed">
      {plan.kind === 'series' ? <SeriesSummary data={data} /> : null}
      {plan.kind === 'comparison' ? <ComparisonSummary data={data} /> : null}
      {plan.kind === 'similarity' ? <SimilaritySummary data={data} /> : null}
      {plan.kind === 'workbench' ? <WorkbenchSummary data={data} /> : null}
      {plan.kind === 'shots' ? <ShotSummary data={data} /> : null}
      {plan.kind === 'team-season' ? <TeamSeasonSummary data={data} /> : null}
      <figcaption className="story-embed__cap">
        <Tape code="LIVE FROM THE TOOL" variant="derived" />
        <SourceLine provenance={(data as { provenance: DataProvenance }).provenance} />
        {open}
      </figcaption>
    </figure>
  );
}

function SourceLine({ provenance }: { provenance: DataProvenance }) {
  return (
    <span className="story-embed__src">
      {provenance.source === 'fixture' ? 'Demo fixtures, not NBA results · ' : ''}
      {provenance.coverage}
    </span>
  );
}

function Grid({ cells }: { cells: [string, ReactNode][] }) {
  return (
    <dl className="statgrid story-embed__grid">
      {cells.map(([k, v]) => (
        <div className="statgrid__cell" key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function SeriesSummary({ data }: { data: ReturnType<typeof PARSE.series> }) {
  const { series, analysis } = data;
  const [a, b] = series.teams;
  const max = Math.max(...analysis.games.map((g) => Math.abs(g.margin)), 1);
  return (
    <>
      <p className="story-embed__head">
        {a.abbreviation} {series.wins[0]}–{series.wins[1]} {b.abbreviation} ·{' '}
        {series.winner
          ? `${series.winner.name} won in ${series.games.length}`
          : 'undecided in the record'}
      </p>
      <ol
        className="story-embed__margins"
        aria-label={`Final margin by game, ${a.abbreviation} side`}
      >
        {analysis.games.map((g) => (
          <li key={g.gameId}>
            <span>G{g.number}</span>
            <span className="story-embed__track" aria-hidden="true">
              <i
                className={g.margin > 0 ? 'is-a' : 'is-b'}
                style={{
                  width: `${(50 * Math.abs(g.margin)) / max}%`,
                  [g.margin > 0 ? 'left' : 'right']: '50%',
                }}
              />
            </span>
            <b className="num">
              {g.margin > 0 ? '+' : '−'}
              {Math.abs(g.margin)}
            </b>
          </li>
        ))}
      </ol>
      <Grid
        cells={[
          [
            'Points per game',
            `${analysis.pointsPerGame[0].toFixed(1)}–${analysis.pointsPerGame[1].toFixed(1)}`,
          ],
          ['Closest game', `${analysis.closest.margin} pts`],
          ['Largest margin', `${analysis.largest.margin} pts`],
          ['Won after trailing at Q3', String(analysis.comebacksAfterThree)],
        ]}
      />
    </>
  );
}

function ComparisonSummary({ data }: { data: ReturnType<typeof PARSE.comparison> }) {
  return (
    <>
      <p className="story-embed__head">
        {data.players.map((p) => p.name).join(' · ')} · {data.minGames}+ games
      </p>
      <GapBoard data={data} scale="z" />
      <ul className="story-embed__list">
        {data.statements.slice(0, 4).map((s) => (
          <li key={s.text}>{s.text}</li>
        ))}
      </ul>
    </>
  );
}

function SimilaritySummary({ data }: { data: ReturnType<typeof PARSE.similarity> }) {
  return (
    <>
      <p className="story-embed__head">
        Seasons like {data.targetName} on{' '}
        {data.metrics.map((m) => SIM_LABEL[m]).join(', ')} · cohort {data.cohort}
      </p>
      {data.neighbours.length ? (
        <ol className="story-embed__list story-embed__list--ranked">
          {data.neighbours.slice(0, 5).map((n) => (
            <li key={n.playerId}>
              <b>{n.name}</b>{' '}
              <span className="num">distance {n.distance.toFixed(2)}</span>{' '}
              <small>
                closest on {SIM_LABEL[n.closest]}, furthest on {SIM_LABEL[n.furthest]}
              </small>
            </li>
          ))}
        </ol>
      ) : (
        <p className="story-embed__state">
          {data.targetName} is outside this cohort (
          {data.targetStatus.replace('-', ' ')}).
        </p>
      )}
    </>
  );
}

function WorkbenchSummary({ data }: { data: ReturnType<typeof PARSE.workbench> }) {
  const fmt = (v: number | null) => formatValue(data.metric, v);
  return (
    <>
      <p className="story-embed__head">
        {data.y ? `${data.metric.label} against ${data.y.label}` : data.metric.label} ·{' '}
        {data.cohort}
      </p>
      <Grid
        cells={[
          ['Cohort', String(data.summary.n)],
          ['Median', fmt(data.summary.median)],
          ['Range', `${fmt(data.summary.min)} – ${fmt(data.summary.max)}`],
          data.relationship
            ? ['Correlation (r)', data.relationship.pearson?.toFixed(2) ?? '—']
            : ['Mean', fmt(data.summary.mean)],
        ]}
      />
      <ol className="story-embed__list story-embed__list--ranked">
        {data.rows.slice(0, 5).map((r) => (
          <li key={r.id}>
            <b>{r.label}</b> <span className="num">{fmt(r.x)}</span>{' '}
            <small>{r.teams.join('/')}</small>
          </li>
        ))}
      </ol>
    </>
  );
}

function ShotSummary({ data }: { data: ReturnType<typeof PARSE.shots> }) {
  const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`);
  return (
    <>
      <p className="story-embed__head">
        {data.filteredAttempts} recorded attempts · partial 2018 playoffs
        {data.region ? ` · region ${describeRegion(data.region)}` : ''}
      </p>
      {data.groups.map((g) => (
        <div key={g.playerId ?? 'all'}>
          <h4 className="story-embed__sub">{g.label}</h4>
          <Grid
            cells={[
              ['Attempts', String(g.attempts)],
              ['FG', pct(g.fgPercentage)],
              ['eFG', pct(g.efgPercentage)],
              ['Points / attempt', g.pointsPerAttempt?.toFixed(3) ?? '—'],
            ]}
          />
        </div>
      ))}
    </>
  );
}

function TeamSeasonSummary({
  data,
}: {
  data: ReturnType<(typeof PARSE)['team-season']>;
}) {
  const overall = data.splits.find((s) => s.group === 'overall');
  return (
    <>
      <p className="story-embed__head">
        {data.team.name} · 2023–24 regular season ({data.verifiedGames} of 82 games
        verified)
      </p>
      <Grid
        cells={[
          ['Observed record', overall ? `${overall.wins}–${overall.losses}` : '—'],
          [
            'Longest win streak',
            data.longestWinStreak ? String(data.longestWinStreak.length) : '—',
          ],
          ['Conference', data.conference],
          ['Points for / game', overall?.pointsFor?.toFixed(1) ?? '—'],
        ]}
      />
    </>
  );
}
