import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  TeamArchiveResponseSchema,
  type DirectoryTeam,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import { QueryFeedback, ResearchTable, SourceNote } from '../research/ResearchShell';
import { WikiAttribution } from './WikiAttribution';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { readTeamArchiveState } from './team-archive-state';
import styles from '../research/research.module.css';
const metrics = [
  'pointsPerGame',
  'reboundsPerGame',
  'assistsPerGame',
  'stealsPerGame',
  'blocksPerGame',
  'gamesPlayed',
  'minutesPerGame',
  'fieldGoalPercentage',
  'threePointPercentage',
  'freeThrowPercentage',
] as const;
const labels = {
  pointsPerGame: 'PTS/game',
  reboundsPerGame: 'REB/game',
  assistsPerGame: 'AST/game',
  stealsPerGame: 'STL/game',
  blocksPerGame: 'BLK/game',
  gamesPlayed: 'GP',
  minutesPerGame: 'MIN/game',
  fieldGoalPercentage: 'FG%',
  threePointPercentage: '3P%',
  freeThrowPercentage: 'FT%',
};
export function TeamSeasonArchivePanel({ team }: { team: DirectoryTeam }) {
  const [params, setParams] = useSearchParams();
  const { parsed, valid } = readTeamArchiveState(params);
  const enabled = valid && parsed.data?.details === '2023-24';
  const query = useQuery({
    queryKey: ['research', 'team-season-archive', team.id],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/teams/${team.id}/archive?season=2023-24`,
        signal,
        TeamArchiveResponseSchema.parse,
      ),
    enabled,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = enabled ? query.data : undefined,
    q = parsed.success ? parsed.data : undefined;
  const update = (key: string, value: string) => {
    const copy = new URLSearchParams(params);
    if (value) copy.set(key, value);
    else copy.delete(key);
    setParams(copy);
  };
  const matches = (name: string) =>
    !q?.search || name.toLowerCase().includes(q.search.toLowerCase());
  const metric = q?.metric ?? 'pointsPerGame';
  const participants =
    data?.statistics[q?.participants ?? 'regular-season']
      .filter(
        (p) =>
          p.gamesPlayed > 0 && p.gamesPlayed >= (q?.minGames ?? 10) && matches(p.name),
      )
      .sort((a, b) => {
        const av = a[metric],
          bv = b[metric];
        if (av === null) return bv === null ? a.name.localeCompare(b.name) : 1;
        if (bv === null) return -1;
        return bv - av || a.name.localeCompare(b.name);
      }) ?? [];
  const roster = data?.roster.filter((p) => matches(p.name)) ?? [];
  const results = data?.results.filter((g) => !q?.side || g.location === q.side) ?? [];
  const wins = results.filter((g) => g.result === 'W').length;
  const average = (key: 'teamScore' | 'opponentScore') =>
    results.length
      ? (results.reduce((sum, g) => sum + g[key], 0) / results.length).toFixed(2)
      : 'Unavailable';
  const ages =
    data?.roster.flatMap((p) => (p.ageOnOctober1 === null ? [] : [p.ageOnOctober1])) ??
    [];
  const positions = [...new Set(data?.roster.map((p) => p.position))].sort();
  const display = (value: number | null, key: string) =>
    value === null
      ? 'Unavailable'
      : key.endsWith('Percentage')
        ? `${(value * 100).toFixed(1)}%`
        : value;
  const leaders = (key: 'pointsPerGame' | 'reboundsPerGame' | 'assistsPerGame') => {
    const values = participants.filter((p) => p[key] !== null);
    if (!values.length) return 'Unavailable';
    const peak = Math.max(...values.map((p) => p[key]!));
    return values
      .filter((p) => p[key] === peak)
      .map((p) => `${p.name} (${peak})`)
      .join('; ');
  };
  return (
    <section aria-label="Historical roster and regular results">
      <h2>Historical roster and regular-season results</h2>
      <p>
        Optional 2023–24 team-page snapshot with source-listed roster, reconciled
        regular-season finals and separately scoped participant summaries. This is not a
        current roster or a complete transaction archive.
      </p>
      {!valid ? (
        <p role="alert">Invalid team-season filters.</p>
      ) : !enabled ? (
        <button onClick={() => update('details', '2023-24')}>
          Load roster and regular-season results
        </button>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <WikiAttribution data={data.attribution} />
          <p>
            Player identity enrichment: {data.identityStatus};{' '}
            {data.roster.filter((p) => p.nbaPlayerId !== null).length} of{' '}
            {data.roster.length} roster entries have explicit NBA identifiers. Missing
            mappings retain external source links. Identifier facts from{' '}
            <a
              href="https://www.wikidata.org/wiki/Property:P3647"
              target="_blank"
              rel="noreferrer"
            >
              Wikidata P3647
            </a>
            ,{' '}
            <a
              href="https://www.wikidata.org/wiki/Wikidata:Copyright"
              target="_blank"
              rel="noreferrer"
            >
              CC0
            </a>
            ; identity fetch {data.identityRetrievedAt ?? 'unavailable'}.
          </p>
          <SaveResearchButton
            kind="analysis"
            label={`${team.name} historical season`}
            path={`/teams/${team.id}?${params}`}
          />
          <label>
            Shareable team-season URL
            <input
              readOnly
              value={`${window.location.origin}/teams/${team.id}?${params}`}
            />
          </label>
          <div className={styles.controls}>
            <label>
              Participant search
              <input
                value={q?.search ?? ''}
                maxLength={100}
                onChange={(e) => update('search', e.target.value)}
              />
            </label>
            <label>
              Participant scope
              <select
                value={q?.participants ?? 'regular-season'}
                onChange={(e) => update('participants', e.target.value)}
              >
                <option value="regular-season">Regular season</option>
                <option value="playoffs">Playoffs</option>
                {data.statistics['source-unspecified'].length > 0 && (
                  <option value="source-unspecified">Source scope unspecified</option>
                )}
              </select>
            </label>
            <label>
              Minimum participant GP
              <input
                type="number"
                min={0}
                max={82}
                value={q?.minGames ?? 10}
                onChange={(e) => update('minGames', e.target.value)}
              />
            </label>
            <label>
              Participant sort metric
              <select value={metric} onChange={(e) => update('metric', e.target.value)}>
                {metrics.map((m) => (
                  <option key={m} value={m}>
                    {labels[m]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <h3>Source-listed season roster</h3>
          <p>
            Age reference: October 1, 2023. {ages.length} known DOBs among{' '}
            {data.roster.length} source-listed entries; mean age{' '}
            {ages.length
              ? (ages.reduce((s, a) => s + a, 0) / ages.length).toFixed(1)
              : 'Unavailable'}
            . Position labels are grouped as supplied, including hybrid positions; no
            draft experience or injury diagnosis inferred.
          </p>
          <ul>
            {positions.map((pos) => (
              <li key={pos}>
                {pos}: {data.roster.filter((p) => p.position === pos).length}{' '}
                source-listed players
              </li>
            ))}
          </ul>
          <ResearchTable label="Historical source-listed roster">
            <table>
              <caption>
                {roster.length} matching source-listed players, not all season
                participants
              </caption>
              <thead>
                <tr>
                  {[
                    'Player',
                    'Position',
                    'Number',
                    'DOB',
                    'Age at reference',
                    'Identity source',
                  ].map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roster.map((p) => (
                  <tr key={p.articleUrl ?? p.name}>
                    <th scope="row">
                      {p.nbaPlayerId ? (
                        <Link to={`/players/${p.nbaPlayerId}`}>{p.name}</Link>
                      ) : p.articleUrl ? (
                        <a href={p.articleUrl} target="_blank" rel="noreferrer">
                          {p.name}
                        </a>
                      ) : (
                        p.name
                      )}
                    </th>
                    <td>{p.position}</td>
                    <td>{p.number ?? 'Unavailable'}</td>
                    <td>{p.birthDate ?? 'Unavailable'}</td>
                    <td>{p.ageOnOctober1 ?? 'Unavailable'}</td>
                    <td>
                      {p.identityUrl ? (
                        <a href={p.identityUrl} target="_blank" rel="noreferrer">
                          External-ID evidence
                        </a>
                      ) : (
                        'NBA identity unavailable'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <h3>
            Reported participant summaries · {q?.participants ?? 'regular-season'}
          </h3>
          <p>
            {participants.length} qualifying published rows after search/GP filters.
            Source per-game summaries and rounded percentages; attempt denominators
            unavailable. Raw totals are shown only when published; derived per-game
            values identify their basis. No weighted team shooting inferred.
            Source-listed roster and statistical participants may differ after trades.
          </p>
          <p>
            PTS/game leaders: {leaders('pointsPerGame')}; REB/game leaders:{' '}
            {leaders('reboundsPerGame')}; AST/game leaders: {leaders('assistsPerGame')}.
            Ties retained within these qualifying rows, not an official award.
          </p>
          {!participants.length && (
            <p role="status">
              No published participants meet these filters. Lower the explicit GP
              threshold or change scope; unavailable summaries stay unavailable.
            </p>
          )}
          <ResearchTable label="Historical participant summaries">
            <table>
              <caption>
                Rounded source values; regular and playoff records never mixed
              </caption>
              <thead>
                <tr>
                  <th scope="col">Player</th>
                  {metrics.map((m) => (
                    <th key={m} scope="col">
                      {labels[m]}
                    </th>
                  ))}
                  <th scope="col">Source identity</th>
                  <th scope="col">Value basis / raw totals</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.articleUrl ?? p.name}>
                    <th scope="row">
                      {p.nbaPlayerId ? (
                        <Link to={`/players/${p.nbaPlayerId}/insights?season=2023-24`}>
                          {p.name}
                        </Link>
                      ) : (
                        p.name
                      )}
                    </th>
                    {metrics.map((m) => (
                      <td key={m}>{display(p[m], m)}</td>
                    ))}
                    <td>
                      {p.articleUrl ? (
                        <a href={p.articleUrl} target="_blank" rel="noreferrer">
                          Wikipedia player
                        </a>
                      ) : (
                        'Unavailable'
                      )}
                    </td>
                    <td>
                      {p.valueBasis};{' '}
                      {p.rawTotals
                        ? `Published totals: MIN ${p.rawTotals.minutes}, PTS ${p.rawTotals.points}, REB ${p.rawTotals.rebounds}, AST ${p.rawTotals.assists}, STL ${p.rawTotals.steals}, BLK ${p.rawTotals.blocks}`
                        : 'Raw totals unavailable'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <h3>Recorded regular-season finals</h3>
          <label>
            Regular result venue filter
            <select
              value={q?.side ?? ''}
              onChange={(e) => update('side', e.target.value)}
            >
              <option value="">All designations</option>
              <option value="home">Home</option>
              <option value="away">Away</option>
            </select>
          </label>
          <p>
            {wins} wins, {results.length - wins} losses in {results.length} matching
            regular-season finals; win percentage{' '}
            {results.length
              ? `${((wins / results.length) * 100).toFixed(2)}%`
              : 'Unavailable'}
            . Last up to 10 matching results:{' '}
            {results
              .slice(-10)
              .map((g) => g.result)
              .join(' ') || 'Unavailable'}
            . Points/game {average('teamScore')}; opponent points/game{' '}
            {average('opponentScore')}. These are scoring summaries, not possession
            ratings.
          </p>
          <ResearchTable label="Historical regular-season results">
            <table>
              <caption>
                82 source finals before filters; source game links and cumulative
                records reconciled. Home/away is source designation, including neutral
                sites.
              </caption>
              <thead>
                <tr>
                  {[
                    'Date',
                    'Designation',
                    'Opponent',
                    'Team score',
                    'Opponent score',
                    'Result',
                    'Overtime',
                    'Source game',
                  ].map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((g) => (
                  <tr key={g.sourceId}>
                    <th scope="row">{g.date}</th>
                    <td>{g.location}</td>
                    <td>
                      <Link to={`/teams/${g.opponent.id}`}>{g.opponent.name}</Link>
                    </td>
                    <td>{g.teamScore}</td>
                    <td>{g.opponentScore}</td>
                    <td>{g.result}</td>
                    <td>{g.overtime}</td>
                    <td>
                      <a href={g.recapUrl} target="_blank" rel="noreferrer">
                        {g.sourceId}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <p>
            Quarter scoring and full shooting box scores are absent from this
            regular-season table. Playoff quarter scores are available in{' '}
            <Link to="/games">Recorded playoff games</Link>.
          </p>
        </>
      )}
    </section>
  );
}
