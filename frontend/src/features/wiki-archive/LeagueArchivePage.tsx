import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { z } from 'zod';
import {
  ArchiveLeagueResponseSchema,
  ArchiveSeasonSchema,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import {
  QueryFeedback,
  ResearchShell,
  ResearchTable,
  SourceNote,
} from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { WikiAttribution } from './WikiAttribution';
import styles from '../research/research.module.css';
import { ConferenceLadders } from '../league/ConferenceLadder';
import { LeaderBoard } from '../league/LeaderBoard';
const querySchema = z
  .object({
    season: ArchiveSeasonSchema.default('2023-24'),
    conference: z.enum(['East', 'West']).optional(),
    search: z.string().max(100).optional(),
    sort: z.enum(['rank', 'wins', 'losses', 'winPercentage']).default('rank'),
    scope: z.enum(['player', 'team']).default('player'),
    category: z.string().max(100).optional(),
  })
  .strict();
export function LeagueArchivePage({ mode }: { mode: 'standings' | 'leaders' }) {
  const [params, setParams] = useSearchParams();
  const parsed = querySchema.safeParse(Object.fromEntries(params));
  const valid =
    parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const query = useQuery({
    queryKey: ['research', 'league-archive'],
    queryFn: ({ signal }) =>
      fetchResearch(
        '/api/standings?season=2023-24',
        signal,
        ArchiveLeagueResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined;
  const update = (key: string, value: string) => {
    const copy = new URLSearchParams(params);
    if (value) copy.set(key, value);
    else copy.delete(key);
    setParams(copy);
  };
  const q = parsed.success ? parsed.data : querySchema.parse({});
  const standings =
    data?.standings
      .filter(
        (r) =>
          (!q.conference || r.conference === q.conference) &&
          (!q.search ||
            `${r.team.name} ${r.team.abbreviation}`
              .toLowerCase()
              .includes(q.search.toLowerCase())),
      )
      .sort(
        (a, b) =>
          (q.sort === 'rank' ? a.rank - b.rank : b[q.sort] - a[q.sort]) ||
          a.team.name.localeCompare(b.team.name),
      ) ?? [];
  const leaders =
    data?.leaders.filter(
      (r) =>
        r.scope === q.scope &&
        (!q.category || r.category === q.category) &&
        (!q.search ||
          `${r.name} ${r.teamLabel ?? ''}`
            .toLowerCase()
            .includes(q.search.toLowerCase())),
    ) ?? [];
  const categories = [
    ...new Set(data?.leaders.filter((r) => r.scope === q.scope).map((r) => r.category)),
  ];
  return (
    <ResearchShell
      title={
        mode === 'standings' ? 'Historical standings' : 'Published category leaders'
      }
    >
      <p>
        Recorded 2023–24 regular-season snapshot. Current standings, live updates, full
        league player rankings and custom leader qualification are unavailable in this
        source.
      </p>
      <Link to={mode === 'standings' ? '/leaders/wikipedia' : '/standings/wikipedia'}>
        {mode === 'standings' ? 'Published category leaders' : 'Historical standings'}
      </Link>{' '}
      <Link to="/games">Recorded playoff games</Link>{' '}
      <Link to={`/${mode}`}>Every season from NBA.com</Link>
      {!valid ? (
        <p role="alert">
          Invalid historical league URL.{' '}
          <button onClick={() => setParams({})}>Reset filters</button>
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <WikiAttribution data={data.attribution} />
          <SaveResearchButton
            kind="analysis"
            label={`2023-24 ${mode}`}
            path={`/${mode}/wikipedia?${params}`}
          />
          <label>
            Shareable league URL
            <input
              readOnly
              value={`${window.location.origin}/${mode}/wikipedia?${params}`}
            />
          </label>
          <div className={styles.controls}>
            <label>
              Recorded season
              <select value="2023-24" disabled>
                <option>2023-24</option>
              </select>
            </label>
            <label>
              Search snapshot
              <input
                value={params.get('search') ?? ''}
                maxLength={100}
                onChange={(e) => update('search', e.target.value)}
              />
            </label>
            {mode === 'standings' ? (
              <>
                <label>
                  Conference
                  <select
                    value={params.get('conference') ?? ''}
                    onChange={(e) => update('conference', e.target.value)}
                  >
                    <option value="">Both</option>
                    <option>East</option>
                    <option>West</option>
                  </select>
                </label>
                <label>
                  Standing metric
                  <select
                    value={q.sort}
                    onChange={(e) => update('sort', e.target.value)}
                  >
                    <option value="rank">Source conference rank</option>
                    <option value="wins">Wins</option>
                    <option value="losses">Losses</option>
                    <option value="winPercentage">Win percentage</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <label>
                  Leader type
                  <select
                    value={q.scope}
                    onChange={(e) => {
                      const copy = new URLSearchParams(params);
                      copy.set('scope', e.target.value);
                      copy.delete('category');
                      setParams(copy);
                    }}
                  >
                    <option value="player">Player</option>
                    <option value="team">Team</option>
                  </select>
                </label>
                <label>
                  Leader category
                  <select
                    value={q.category ?? ''}
                    onChange={(e) => update('category', e.target.value)}
                  >
                    <option value="">All published categories</option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
          {mode === 'standings' && standings.length ? (
            <ConferenceLadders
              standings={standings}
              sort={q.sort}
              conference={q.conference}
            />
          ) : null}
          {mode === 'leaders' && leaders.length ? (
            <LeaderBoard leaders={leaders} />
          ) : null}
          {mode === 'standings' ? (
            <ResearchTable label="Historical conference standings">
              <table>
                <caption>
                  {standings.length} teams; conference ranks are sourced, win percentage
                  calculated from recorded W–L
                </caption>
                <thead>
                  <tr>
                    {[
                      'Conference',
                      'Source rank',
                      'Team',
                      'W',
                      'L',
                      'GP',
                      'Win%',
                      'GB',
                    ].map((s) => (
                      <th key={s} scope="col">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((r) => (
                    <tr key={r.team.id}>
                      <td>{r.conference}</td>
                      <td>{r.rank}</td>
                      <th scope="row">
                        <Link to={`/teams/${r.team.id}`}>{r.team.name}</Link>
                      </th>
                      <td>{r.wins}</td>
                      <td>{r.losses}</td>
                      <td>{r.gamesPlayed}</td>
                      <td>{(r.winPercentage * 100).toFixed(2)}%</td>
                      <td>{r.gamesBehind ?? 'Unavailable'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResearchTable>
          ) : (
            <>
              <p>
                These are the category winners published in the source, including any
                published ties, rather than a sortable population of all players.
                Percent values keep the source's units. Efficiency definitions and
                qualification denominators are not supplied; no era adjustment or
                recomputation is claimed.
              </p>
              <ResearchTable label="Published category winners">
                <table>
                  <caption>
                    {leaders.length} published {q.scope} rows
                  </caption>
                  <thead>
                    <tr>
                      {[
                        'Category',
                        'Name',
                        'Source team label',
                        'Value',
                        'Unit',
                        'Source identity',
                      ].map((s) => (
                        <th key={s} scope="col">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaders.map((r) => (
                      <tr key={`${r.scope}:${r.category}:${r.name}`}>
                        <th scope="row">{r.category}</th>
                        <td>{r.name}</td>
                        <td>{r.teamLabel ?? 'Not applicable'}</td>
                        <td>{r.value}</td>
                        <td>{r.unit}</td>
                        <td>
                          {r.articleUrl ? (
                            <a href={r.articleUrl} target="_blank" rel="noreferrer">
                              Wikipedia identity
                            </a>
                          ) : (
                            'Not supplied'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResearchTable>
            </>
          )}
          {!(mode === 'standings' ? standings.length : leaders.length) && (
            <p role="status">No source records match the filters.</p>
          )}
          <p>
            Home/away records, last 10 and streaks are not included in this standings
            snapshot. No current roster or injury information is inferred.
          </p>
        </>
      )}
    </ResearchShell>
  );
}
