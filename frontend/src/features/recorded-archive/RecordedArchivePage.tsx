import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  ArchiveRankingQuerySchema,
  ArchiveRankingResponseSchema,
  ArchiveRankingMetricSchema,
  RecordedRecordsQuerySchema,
  RecordedRecordsResponseSchema,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import {
  ResearchShell,
  ResearchTable,
  SourceNote,
  QueryFeedback,
} from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { RankedBoard } from '../league/RankedBoard';
import { WikiAttribution } from '../wiki-archive/WikiAttribution';
import styles from '../research/research.module.css';
import { recordedRankingCsv } from './recorded-csv';
export function RecordedArchivePage({ mode }: { mode: 'leaders' | 'records' }) {
  const [params, setParams] = useSearchParams();
  const parsed = (
    mode === 'leaders' ? ArchiveRankingQuerySchema : RecordedRecordsQuerySchema
  ).safeParse(Object.fromEntries(params));
  const valid =
    parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const leaders = useQuery({
    queryKey: ['research', 'recorded-leaders', params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/leaders?${params}`,
        signal,
        ArchiveRankingResponseSchema.parse,
      ),
    enabled: valid && mode === 'leaders',
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const records = useQuery({
    queryKey: ['research', 'recorded-records', params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/records?${params}`,
        signal,
        RecordedRecordsResponseSchema.parse,
      ),
    enabled: valid && mode === 'records',
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const query = mode === 'leaders' ? leaders : records;
  const data = valid ? (mode === 'leaders' ? leaders.data : records.data) : undefined;
  const update = (key: string, value: string) => {
    const copy = new URLSearchParams(params);
    if (value) copy.set(key, value);
    else copy.delete(key);
    if (key !== 'page') copy.delete('page');
    setParams(copy);
  };
  const route = mode === 'leaders' ? '/leaders/recorded' : '/history/records';
  const share = new URLSearchParams(params);
  share.set('season', '2023-24');
  const teamOptions = [
    ...new Set(
      data?.attributions.map((a) =>
        a.title.replace(/^2023–24 /, '').replace(/ season$/, ''),
      ),
    ),
  ].sort();
  // Source-listed team IDs come from validated result/leader rows, not guessed from names.
  const availableTeams =
    mode === 'leaders'
      ? [
          ...new Map(
            leaders.data?.rows.flatMap((r) => r.teams.map((t) => [t.id, t] as const)),
          ).values(),
        ]
      : [
          ...new Map(
            records.data?.games.flatMap((g) => [
              [g.home.id, g.home] as const,
              [g.away.id, g.away] as const,
            ]),
          ).values(),
        ];
  return (
    <ResearchShell
      title={
        mode === 'leaders'
          ? 'Recorded historical cohort leaders'
          : 'Recorded season game extrema'
      }
    >
      <p>
        Genuine recorded 2023–24 Wikipedia data with source revisions and CC BY-SA4.0
        attribution. This historical dataset is fixed, independently licensed and
        explicitly separate from current/live NBA data. These are supported
        source-cohort results, not official NBA league qualifications or all-time
        records.
      </p>
      <Link to={mode === 'leaders' ? '/history/records' : '/leaders/recorded'}>
        {mode === 'leaders' ? 'Recorded game extrema' : 'Recorded cohort leaders'}
      </Link>{' '}
      <Link to="/leaders">Published category winners</Link>
      {!valid ? (
        <p role="alert">
          Invalid recorded archive filters.{' '}
          <button onClick={() => setParams({})}>Reset recorded filters</button>
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      <div className={styles.controls}>
        <label>
          Recorded metric
          <select
            value={
              params.get('metric') ??
              (mode === 'leaders' ? 'pointsPerGame' : 'teamPoints')
            }
            onChange={(e) => update('metric', e.target.value)}
          >
            {(mode === 'leaders'
              ? ArchiveRankingMetricSchema.options
              : ['teamPoints', 'finalMargin', 'combinedPoints']
            ).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Source team ID
          <input
            value={params.get('team') ?? ''}
            placeholder="nba:1610612747"
            onChange={(e) => update('team', e.target.value)}
          />
        </label>
        {mode === 'leaders' && (
          <>
            <label>
              Recorded scope
              <select
                value={params.get('scope') ?? 'regular-season'}
                onChange={(e) => {
                  const copy = new URLSearchParams(params);
                  copy.set('scope', e.target.value);
                  copy.set('minGames', e.target.value === 'playoffs' ? '5' : '20');
                  copy.delete('page');
                  setParams(copy);
                }}
              >
                <option value="regular-season">Regular season</option>
                <option value="playoffs">Playoffs</option>
              </select>
            </label>
            <label>
              Minimum recorded GP
              <input
                type="number"
                min={1}
                max={150}
                value={params.get('minGames') ?? '20'}
                onChange={(e) => update('minGames', e.target.value)}
              />
            </label>
            <label>
              Search recorded players
              <input
                value={params.get('search') ?? ''}
                maxLength={100}
                onChange={(e) => update('search', e.target.value)}
              />
            </label>
            <label>
              Listed position
              <select
                value={params.get('position') ?? ''}
                onChange={(e) => update('position', e.target.value)}
              >
                <option value="">All positions</option>
                <option value="G">Guards (G, G/F)</option>
                <option value="F">Forwards (F, G/F, F/C)</option>
                <option value="C">Centers (C, F/C)</option>
              </select>
            </label>
          </>
        )}
      </div>
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <p>
            Snapshot assembled {data.snapshotCreatedAt}; publication as-of time is
            unknown.
          </p>
          <label>
            Shareable recorded archive URL
            <input readOnly value={`${window.location.origin}${route}?${share}`} />
          </label>
          <SaveResearchButton
            kind="analysis"
            label={`2023-24 recorded ${mode}`}
            path={`${route}?${share}`}
          />
          <details>
            <summary>
              Known source team links ({teamOptions.length} source pages)
            </summary>
            <p>
              The directory supplies all namespaced IDs. Team filters match any sourced
              stint; ranking values include supported selected-scope stints and retain
              the original qualifying population.
            </p>
            <Link to="/teams">All current team identities</Link>
            <ul>
              {availableTeams.map((t) => (
                <li key={t.id}>
                  <button onClick={() => update('team', t.id)}>
                    {t.name} · {t.id}
                  </button>
                </li>
              ))}
            </ul>
          </details>
          {mode === 'leaders' && leaders.data && (
            <>
              <button
                onClick={() => {
                  const d = leaders.data!,
                    url = URL.createObjectURL(
                      new Blob([recordedRankingCsv(d)], {
                        type: 'text/csv;charset=utf-8',
                      }),
                    );
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `nba-recorded-2023-24-${d.query.metric}-${d.query.scope}-page${d.query.page}.csv`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export this ranking page CSV
              </button>
              <p>
                Sources fetched {leaders.data.sourceFetchedFrom} through{' '}
                {leaders.data.sourceFetchedTo}. {leaders.data.sourceRows} published
                scoped rows across {leaders.data.sourceTeams} teams;{' '}
                {leaders.data.qualifiedPopulation} qualifying supported player seasons.
                Exclusions: {leaders.data.missingIdentityRows} missing-ID rows,{' '}
                {leaders.data.belowMinimumPlayers} below-GP players,{' '}
                {leaders.data.missingMetricPlayers} missing/unsupported metric players;{' '}
                {leaders.data.unknownScopeRows} unspecified-scope rows withheld.
              </p>
              <p>
                Custom minimum GP defaults to 20 regular-season and 5 when switching to
                playoffs. Official attempt/league qualification is unavailable. Trade
                rows combine only from explicit raw counts; rounded averages are never
                multiplied into counts. Percentiles use 100 × (lower values + 0.5 ×
                equal values) / qualified cohort size. Tied ranks use competition
                ranking. Search, team and position filters keep that population fixed.
              </p>
              <p>
                Positions are those the player’s own 2023–24 team page roster lists (G,
                F, C, G/F, F/C); a hybrid label counts for both families it names. No
                position is inferred from role or play style.{' '}
                {leaders.data.positionUnlistedPlayers ?? 0} qualified players have no
                listed position (their team page roster does not list them) and appear
                only under All positions.
                {leaders.data.positionScope &&
                  ` Within this family: ${leaders.data.positionScope.belowMinimumPlayers} below-GP and ${leaders.data.positionScope.missingMetricPlayers} missing/unsupported metric players.`}
              </p>
              <RankedBoard
                rows={leaders.data.rows}
                showPodium={leaders.data.query.page === 1}
                metricLabel={leaders.data.query.metric}
                format={(value) =>
                  value < 1 && value > 0 ? value.toFixed(3) : value.toFixed(1)
                }
              />
              <ResearchTable label="Recorded qualified cohort ranking">
                <table>
                  <caption>
                    {leaders.data.total} matching supported players; percentage metrics
                    are ratios, count/per-game units follow metric
                  </caption>
                  <thead>
                    <tr>
                      {[
                        'Rank',
                        'Player',
                        'Listed position',
                        'Source teams',
                        'Recorded GP',
                        'Value',
                        'Cohort percentile',
                        'Source season evidence',
                      ].map((s) => (
                        <th key={s} scope="col">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaders.data.rows.map((r) => (
                      <tr key={r.playerId}>
                        <td>{r.rank}</td>
                        <th scope="row">
                          <Link to={`/players/${r.playerId}`}>{r.name}</Link>
                        </th>
                        <td>{r.positions?.length ? r.positions.join(', ') : '—'}</td>
                        <td>{r.teams.map((t) => t.abbreviation).join(', ')}</td>
                        <td>{r.gamesPlayed}</td>
                        <td>{r.value.toFixed(4)}</td>
                        <td>{r.percentile.toFixed(2)}</td>
                        <td>
                          {r.sources.map((s) => (
                            <a
                              key={s.revision}
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {s.title};{' '}
                            </a>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResearchTable>
              {!leaders.data.rows.length && (
                <p role="status">
                  No supported source rows match these filters. Unsupported metrics
                  remain unavailable.
                </p>
              )}
              <button
                disabled={leaders.data.query.page <= 1}
                onClick={() => update('page', String(leaders.data!.query.page - 1))}
              >
                Previous ranking page
              </button>{' '}
              <span>Page {leaders.data.query.page}</span>{' '}
              <button
                disabled={
                  leaders.data.query.page * leaders.data.query.pageSize >=
                  leaders.data.total
                }
                onClick={() => update('page', String(leaders.data!.query.page + 1))}
              >
                Next ranking page
              </button>
            </>
          )}
          {mode === 'records' && records.data && (
            <>
              <p>
                {records.data.reconciledGames} games agree across both team source
                pages. {records.data.conflictingGameIds.length} conflicting and{' '}
                {records.data.unpairedGameIds.length} unpaired IDs are quarantined.{' '}
                {records.data.matchingSourceGames} reconciled games match this team
                filter. Maximum {records.data.metric}:{' '}
                {records.data.value ?? 'Unavailable'}. All ties shown; final margin is
                not an in-game largest lead.
              </p>
              <ResearchTable label="Recorded source-agreed game extrema">
                <table>
                  <caption>
                    Recorded 2023–24 regular-season extrema only; no all-time record
                    claim
                  </caption>
                  <thead>
                    <tr>
                      {[
                        'Date',
                        'Away',
                        'Away score',
                        'Home',
                        'Home score',
                        'Source game',
                        'Paired source evidence',
                      ].map((s) => (
                        <th key={s} scope="col">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.data.games.map((g) => (
                      <tr key={g.id}>
                        <th scope="row">{g.date}</th>
                        <td>
                          <Link to={`/teams/${g.away.id}`}>{g.away.name}</Link>
                        </td>
                        <td>{g.awayScore}</td>
                        <td>
                          <Link to={`/teams/${g.home.id}`}>{g.home.name}</Link>
                        </td>
                        <td>{g.homeScore}</td>
                        <td>
                          <a href={g.recapUrl} target="_blank" rel="noreferrer">
                            {g.id}
                          </a>
                        </td>
                        <td>
                          {g.sources.map((s) => (
                            <a
                              key={s.revision}
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {s.title};{' '}
                            </a>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResearchTable>
              <details>
                <summary>Quarantined source game IDs</summary>
                <p>
                  Conflicting: {records.data.conflictingGameIds.join(', ') || 'None'}.
                  Unpaired: {records.data.unpairedGameIds.join(', ') || 'None'}. These
                  rows are not corrected, imputed or used in extrema.
                </p>
              </details>
            </>
          )}
          <details>
            <summary>All source revisions, contributors and licences</summary>
            {data.attributions.map((a) => (
              <WikiAttribution key={a.revision} data={a} />
            ))}
          </details>
        </>
      )}
    </ResearchShell>
  );
}
