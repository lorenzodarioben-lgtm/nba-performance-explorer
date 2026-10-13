import { SeasonTotalsResponseSchema } from '@nba-performance-explorer/contracts';
import { useQuery } from '@tanstack/react-query';
import { fetchResearch } from '../research/api';
import { QueryFeedback, ResearchTable, SourceNote } from '../research/ResearchShell';

export function SeasonTotalsPanel({
  playerId,
  season,
}: {
  playerId: string;
  season: string;
}) {
  const query = useQuery({
    queryKey: ['research', 'totals', playerId, season],
    queryFn: ({ signal }) =>
      fetchResearch(`/api/players/${playerId}/totals?season=${season}`, signal, (v) =>
        SeasonTotalsResponseSchema.parse(v),
      ),
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  return (
    <section aria-label="Raw totals and efficiency">
      <h2>Season totals and efficiency</h2>
      <QueryFeedback pending={query.isPending} failed={query.isError} />
      {query.data && (
        <>
          <SourceNote provenance={query.data.provenance} />
          {query.data.totals && query.data.metrics ? (
            <>
              <ResearchTable label="Raw season totals">
                <table>
                  <caption>
                    {season}: sourced aggregate totals; traded-team splits counted once
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Input</th>
                      <th scope="col">Recorded total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(query.data.totals)
                      .filter(([key]) => !['playerId', 'season', 'team'].includes(key))
                      .map(([key, n]) => (
                        <tr key={key}>
                          <th scope="row">{key}</th>
                          <td>{n === null ? 'Unavailable' : String(n)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </ResearchTable>
              <ResearchTable label="Derived shooting efficiency">
                <table>
                  <caption>
                    Derived from the displayed raw totals, with actual denominators
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Metric</th>
                      <th scope="col">Value</th>
                      <th scope="col">Formula</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        [
                          'trueShooting',
                          'TS% (estimate)',
                          'PTS / [2 × (FGA + 0.44 × FTA)]',
                          '%',
                        ],
                        ['effectiveFieldGoal', 'eFG%', '(FGM + 0.5 × 3PM) / FGA', '%'],
                        ['fieldGoalPercentage', 'FG%', 'FGM / FGA', '%'],
                        ['threePointPercentage', '3P%', '3PM / 3PA', '%'],
                        ['freeThrowPercentage', 'FT%', 'FTM / FTA', '%'],
                        ['assistTurnover', 'AST/TO', 'AST / TO', 'ratio'],
                        [
                          'pointsPer36',
                          'Points per 36 minutes',
                          '36 × PTS / MIN',
                          'points',
                        ],
                      ] as const
                    ).map(([key, label, formula, unit]) => {
                      const n = query.data!.metrics![key];
                      return (
                        <tr key={key}>
                          <th scope="row">{label}</th>
                          <td>
                            {n === null
                              ? 'Unavailable'
                              : unit === '%'
                                ? `${(n * 100).toFixed(1)}%`
                                : n.toFixed(2)}
                          </td>
                          <td>{formula}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ResearchTable>
              <p>
                Unavailable means a missing input or zero denominator. TS% uses an
                estimated free-throw possession weight; no usage, pace or lineup
                performance is inferred.
              </p>
            </>
          ) : (
            <p role="status">
              Raw totals unavailable ({query.data.status}). Per-game averages are never
              multiplied to invent totals.
            </p>
          )}
        </>
      )}
    </section>
  );
}
