import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  HistoryQuerySchema,
  HistoryResponseSchema,
  SeasonIdSchema,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import { ResearchShell, ResearchTable, SourceNote } from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';
import { SeasonHero, SeasonTimeline } from './SeasonTimeline';
import { SeasonResearchHub } from './SeasonResearchHub';

export function HistoryPage() {
  const { season } = useParams();
  const [params, setParams] = useSearchParams();
  const valid =
    HistoryQuerySchema.safeParse(Object.fromEntries(params)).success &&
    (!season || SeasonIdSchema.safeParse(season).success) &&
    [...params.keys()].every((key) => params.getAll(key).length === 1);
  const path = `/history${season ? `/${season}` : ''}${params.size ? `?${params}` : ''}`;
  const query = useQuery({
    queryKey: ['research', 'history', season, params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/history/seasons${season ? `/${season}` : ''}?${params}`,
        signal,
        HistoryResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined;
  return (
    <ResearchShell
      title={season ? `${season} · historical facts` : 'Historical season navigator'}
    >
      <p>
        Season and champion statements from Wikidata's community-maintained CC0
        structured facts. Missing champions remain unavailable. Entity labels may use
        modern franchise names; historical aliases and NBA team IDs are not inferred.
      </p>
      <Link to="/history">All recorded historical seasons</Link>
      {(!season || season === '2023-24') && (
        <p>
          Separate licensed 2023–24 tables: <Link to="/standings">Standings</Link>{' '}
          <Link to="/leaders">Published leaders</Link>{' '}
          <Link to="/games">Recorded 2024 playoff games</Link>.
        </p>
      )}
      {season === '2023-24' ? <SeasonResearchHub /> : null}
      {!valid && (
        <p role="alert">
          Invalid historical selection.{' '}
          <button onClick={() => setParams({})}>Clear filters</button>
        </p>
      )}
      {valid && query.isPending && (
        <p role="status" className="loading-line">
          <i aria-hidden="true" />
          Loading historical facts…
        </p>
      )}
      {query.isError && (
        <p role="alert">
          The historical facts source or this season is unavailable. No substitute facts
          are shown. <Link to="/history">Return to season navigator</Link>
        </p>
      )}
      <form
        key={params.toString()}
        className={styles.controls}
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const copy = new URLSearchParams();
          for (const key of ['from', 'to', 'champion']) {
            const v = String(form.get(key) ?? '').trim();
            if (v) copy.set(key, v);
          }
          setParams(copy);
        }}
      >
        <label>
          First season start year
          <input
            name="from"
            type="number"
            min={1946}
            max={2100}
            defaultValue={params.get('from') ?? ''}
          />
        </label>
        <label>
          Last season start year
          <input
            name="to"
            type="number"
            min={1946}
            max={2100}
            defaultValue={params.get('to') ?? ''}
          />
        </label>
        <label>
          Champion source entity
          <input
            name="champion"
            pattern="wd:Q[1-9][0-9]{0,11}"
            placeholder="wd:Q121783"
            defaultValue={params.get('champion') ?? ''}
          />
        </label>
        <button>Apply historical filters</button>
      </form>
      {data && (
        <>
          <SaveResearchButton
            kind="analysis"
            label={
              season ? `${season} historical facts` : 'Historical season navigator'
            }
            path={path}
          />
          <label>
            Shareable history URL
            <input readOnly value={`${window.location.origin}${path}`} />
          </label>
          {season && data.seasons.find((s) => s.season === season) ? (
            <SeasonHero season={data.seasons.find((s) => s.season === season)!} />
          ) : null}
          {!season && data.seasons.length > 1 ? (
            <SeasonTimeline seasons={data.seasons} />
          ) : null}
          <SourceNote provenance={data.provenance} />
          <p>
            {data.seasons.length} matching seasons of {data.sourceSeasons} source season
            entities. {data.coverage.excludedRows} noncanonical rows excluded;{' '}
            {data.coverage.missingWinners} source seasons lack champion statements.
            Source status: {data.status}.
          </p>
          <div className="seasonnav">
            {data.navigation.previous && (
              <Link
                to={`/history/${data.navigation.previous}${params.size ? `?${params}` : ''}`}
              >
                Previous recorded season: {data.navigation.previous}
              </Link>
            )}
            {data.navigation.next && (
              <Link
                to={`/history/${data.navigation.next}${params.size ? `?${params}` : ''}`}
              >
                Next recorded season: {data.navigation.next}
              </Link>
            )}
          </div>
          {!data.seasons.length && (
            <p role="status">No recorded historical facts match this selection.</p>
          )}
          <ResearchTable label="Historical season facts">
            <table>
              <caption>
                Recorded season/champion statements; source entity labels retained
              </caption>
              <thead>
                <tr>
                  {[
                    'Season',
                    'Source season label',
                    'Champion statements',
                    'Check source / report issue',
                  ].map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.seasons.map((s) => (
                  <tr key={s.id}>
                    <th scope="row">
                      <Link to={`/history/${s.season}`}>{s.season}</Link>
                    </th>
                    <td>{s.sourceLabel}</td>
                    <td>
                      {s.winners.length ? (
                        <ul>
                          {s.winners.map((w) => (
                            <li key={w.id}>
                              <a href={w.sourceUrl} target="_blank" rel="noreferrer">
                                {w.label ?? w.id}
                              </a>{' '}
                              <Link to={`/history?champion=${w.id}`}>
                                All source seasons for {w.label ?? w.id}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        'Champion unavailable in source'
                      )}
                    </td>
                    <td>
                      <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                        Wikidata {s.id}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <p>
            Season leaderboards, awards, draft classes, complete box scores and official
            championship totals are unavailable in this source slice.
          </p>
        </>
      )}
    </ResearchShell>
  );
}
