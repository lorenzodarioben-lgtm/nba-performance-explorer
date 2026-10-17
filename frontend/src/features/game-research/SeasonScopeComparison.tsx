import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { SeasonScopeComparisonResponseSchema } from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import { QueryFeedback, ResearchTable, SourceNote } from '../research/ResearchShell';

export function SeasonScopeComparison({
  playerId,
  season,
}: {
  playerId: string;
  season: string;
}) {
  const query = useQuery({
    queryKey: ['research', 'season-scopes', playerId, season],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/players/${playerId}/season-scopes?season=${season}`,
        signal,
        SeasonScopeComparisonResponseSchema.parse,
      ),
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  return (
    <section>
      <h2>Regular season and playoffs</h2>
      <QueryFeedback pending={query.isPending} failed={query.isError} />
      {query.data && (
        <>
          <ResearchTable label="Season scope comparison">
            <table>
              <caption>
                Equal season; totals and per-game values kept separate by scope
              </caption>
              <thead>
                <tr>
                  {[
                    'Scope',
                    'Status',
                    'GP',
                    'PTS total',
                    'PTS/G',
                    'REB/G',
                    'AST/G',
                    'TS%',
                    'eFG%',
                  ].map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.rows.map((r) => {
                  const perGame = (n: number | null | undefined) =>
                    n != null && r.totals && r.totals.gamesPlayed > 0
                      ? (n / r.totals.gamesPlayed).toFixed(2)
                      : 'Unavailable';
                  const ratio = (n: number | null | undefined) =>
                    n == null ? 'Unavailable' : `${(n * 100).toFixed(2)}%`;
                  return (
                    <tr key={r.scope}>
                      <th scope="row">
                        <Link
                          to={`/players/${playerId}/games?season=${season}&scope=${r.scope}`}
                        >
                          {r.scope}
                        </Link>
                      </th>
                      <td>{r.status}</td>
                      <td>{r.totals?.gamesPlayed ?? 'Unavailable'}</td>
                      <td>{r.totals?.points ?? 'Unavailable'}</td>
                      <td>{perGame(r.totals?.points)}</td>
                      <td>{perGame(r.totals?.rebounds)}</td>
                      <td>{perGame(r.totals?.assists)}</td>
                      <td>{ratio(r.metrics?.trueShooting)}</td>
                      <td>{ratio(r.metrics?.effectiveFieldGoal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ResearchTable>
          {query.data.rows.map((r) => (
            <SourceNote key={r.scope} provenance={r.provenance} />
          ))}
        </>
      )}
    </section>
  );
}
