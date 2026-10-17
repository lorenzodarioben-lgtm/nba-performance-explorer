import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { LeagueStatusResponseSchema } from '@nba-performance-explorer/contracts';
import { ResearchTable } from '../research/ResearchShell';
import { Slate } from '../../ui/Slate';
import {
  fetchLeague,
  newestFirst,
  seasonDisplay,
  useLeagueSeasons,
} from './league-api';
import { LeagueFeedback } from './LeagueSourceNote';

const STATE_TEXT = {
  archived: 'Archived with the app',
  current: 'Current',
  stale: 'Stale',
  unavailable: 'Unavailable',
  'not-contacted': 'Not contacted yet',
} as const;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

/** The data coverage page's live source status and the NBA.com archive season by season. */
export function LeagueCoverageSections() {
  const status = useQuery({
    queryKey: ['league', 'status'],
    queryFn: ({ signal }) =>
      fetchLeague('/api/league/status', signal, LeagueStatusResponseSchema.parse),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  const seasons = useLeagueSeasons();
  return (
    <>
      <section className="pmod" aria-labelledby="cov-status">
        <Slate
          id="cov-status"
          title="Source status now"
          meta={status.data ? [`Checked ${when(status.data.checkedAt)}`] : []}
        />
        <p>
          Each source’s state comes from what actually happened when this server asked
          it: current means it answered within its freshness limit, stale means its last
          answer is older than that, unavailable means the latest request failed.
          Opening this page asks NBA.com’s schedule and scoreboard once.
        </p>
        <LeagueFeedback pending={status.isPending} error={status.error} />
        {status.data ? (
          <ResearchTable label="Source status">
            <table>
              <caption>
                States, retrieval times and the time each source says it updated
              </caption>
              <thead>
                <tr>
                  {[
                    'Source',
                    'State',
                    'Last answer',
                    'Source updated',
                    'Last failure',
                    'Notes',
                  ].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {status.data.sources.map((s) => (
                  <tr key={s.id} data-state={s.state}>
                    <th scope="row">{s.name}</th>
                    <td>
                      <span className="cov-chip">{STATE_TEXT[s.state]}</span>
                    </td>
                    <td>{when(s.lastSuccessAt)}</td>
                    <td>{when(s.sourceUpdatedAt)}</td>
                    <td>
                      {s.lastFailureAt
                        ? `${when(s.lastFailureAt)}: ${s.lastFailure ?? ''}`
                        : '—'}
                    </td>
                    <td>{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
        ) : null}
      </section>
      <section className="pmod" aria-labelledby="cov-league">
        <Slate
          id="cov-league"
          title="NBA.com league archive by season"
          meta={seasons.data ? [`${seasons.data.seasons.length} seasons`] : []}
        />
        <p>
          Built from NBA.com team and player game logs with{' '}
          <code>backend/src/scripts/build-league-archive.ts</code>. A season supports
          player research only when at most 0.5% of its box scores fail to add up to the
          team totals; team results are available for every season. Partial means a
          check failed and is explained in the notes.
        </p>
        <LeagueFeedback pending={seasons.isPending} error={seasons.error} />
        {seasons.data ? (
          <ResearchTable label="League archive seasons">
            <table>
              <caption>
                Every archived season with its checks and what it can support
              </caption>
              <thead>
                <tr>
                  {[
                    'Season',
                    'Status',
                    'Games',
                    'Playoff games',
                    'Box scores not adding up',
                    'Player stats',
                    'Ratings',
                    'Per-100',
                    'Notes',
                  ].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {newestFirst(seasons.data.seasons).map((s) => (
                  <tr key={s.season}>
                    <th scope="row">
                      <Link to={`/standings?season=${s.season}`}>
                        {seasonDisplay(s.season)}
                      </Link>
                    </th>
                    <td>{s.status === 'complete' ? 'Complete' : 'Partial'}</td>
                    <td>{s.regularSeasonGames.toLocaleString('en-US')}</td>
                    <td>{s.playoffGames}</td>
                    <td>{s.incompleteBoxScores}</td>
                    <td>{s.capabilities.playerStats ? 'Yes' : 'No'}</td>
                    <td>{s.capabilities.teamRatings ? 'Yes' : 'No'}</td>
                    <td>{s.capabilities.playerPossessions ? 'Yes' : 'No'}</td>
                    <td>{s.notes.join(' ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
        ) : null}
      </section>
    </>
  );
}
