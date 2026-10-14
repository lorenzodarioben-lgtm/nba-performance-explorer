import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  RecordedTeamRankingsQuerySchema,
  RecordedTeamRankingsResponseSchema,
  TeamRankingMetricSchema,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import {
  ResearchShell,
  ResearchTable,
  SourceNote,
  QueryFeedback,
} from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { WikiAttribution } from '../wiki-archive/WikiAttribution';
import styles from '../research/research.module.css';
export function RecordedTeamRankingsPage() {
  const [params, setParams] = useSearchParams();
  const parsed = RecordedTeamRankingsQuerySchema.safeParse(Object.fromEntries(params)),
    valid =
      parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const query = useQuery({
    queryKey: ['research', 'recorded-team-rankings', params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/team-rankings?${params}`,
        signal,
        RecordedTeamRankingsResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined;
  const update = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p);
  };
  return (
    <ResearchShell title="Recorded team rankings and splits">
      <p>
        Historical 2023–24 regular-season rankings calculated from source-agreed final
        scores. Quarantined games can leave different samples across teams. This is an
        observed ranking, not official standings or possession-based ratings.
      </p>
      <Link to="/standings">Published complete-season standings and games behind</Link>
      {!valid ? (
        <p role="alert">
          Invalid team ranking filters. Choose the recorded season, supported metric and
          bounded minimum games.
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      <div className={styles.controls}>
        <label>
          Team ranking metric
          <select
            value={params.get('metric') ?? 'winPercentage'}
            onChange={(e) => update('metric', e.target.value)}
          >
            {TeamRankingMetricSchema.options.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Team ranking order
          <select
            value={params.get('order') ?? 'desc'}
            onChange={(e) => update('order', e.target.value)}
          >
            <option value="desc">Higher values first</option>
            <option value="asc">Lower values first</option>
          </select>
        </label>
        <label>
          Team ranking conference
          <select
            value={params.get('conference') ?? ''}
            onChange={(e) => update('conference', e.target.value)}
          >
            <option value="">Both conferences</option>
            <option>East</option>
            <option>West</option>
          </select>
        </label>
        <label>
          Team sample minimum games
          <input
            type="number"
            min={1}
            max={82}
            value={params.get('minGames') ?? '1'}
            onChange={(e) => update('minGames', e.target.value)}
          />
        </label>
        <label>
          Team source coverage
          <select
            value={params.get('completeOnly') ?? 'false'}
            onChange={(e) => update('completeOnly', e.target.value)}
          >
            <option value="false">All observed samples</option>
            <option value="true">All 82 source games agreed</option>
          </select>
        </label>
        <label>
          Search ranked team
          <input
            value={params.get('search') ?? ''}
            maxLength={100}
            onChange={(e) => update('search', e.target.value)}
          />
        </label>
      </div>
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <p>
            Ranking population: {data.rankingPopulation} teams; {data.rows.length}{' '}
            search matches. Excluded below GP minimum: {data.belowMinimumTeams};
            incomplete coverage: {data.incompleteExcludedTeams}; unavailable metric:{' '}
            {data.missingMetricTeams}. Globally {data.reconciledGames} agreed games;{' '}
            {data.quarantinedGameIds.length} quarantined IDs.
          </p>
          <label>
            Shareable team ranking URL
            <input
              readOnly
              value={`${window.location.origin}/standings/recorded?${params}`}
            />
          </label>
          <SaveResearchButton
            kind="analysis"
            label="Historical team rankings and splits"
            path={`/standings/recorded?${params}`}
          />
          {!data.rows.length ? (
            <p role="status">No qualified teams match these filters.</p>
          ) : (
            <ResearchTable label="Recorded team ranking exact values">
              <table>
                <caption>
                  2023–24 observed games; home/away and final-ten source schedule
                  coverage
                </caption>
                <thead>
                  <tr>
                    {[
                      'Rank',
                      'Team',
                      'Metric value',
                      'Observed GP',
                      'W-L',
                      'Win %',
                      'Home W-L (GP)',
                      'Away W-L (GP)',
                      'PTS/G',
                      'Opp PTS/G',
                      'Final margin/G',
                      'Last ten W-L',
                      'Last-ten observed/expected',
                      'Terminal streak',
                      'Missing games',
                    ].map((s) => (
                      <th key={s} scope="col">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.team.id}>
                      <td>{r.rank}</td>
                      <th scope="row">
                        <Link to={`/teams/${r.team.id}?details=2023-24`}>
                          {r.team.name}
                        </Link>
                      </th>
                      <td>{r.value.toFixed(4)}</td>
                      <td>
                        {r.observedGames}
                        {r.completeSeason ? ' (complete)' : ' (partial)'}
                      </td>
                      <td>
                        {r.wins}-{r.losses}
                      </td>
                      <td>
                        {r.winPercentage === null
                          ? 'Unavailable'
                          : (r.winPercentage * 100).toFixed(2) + '%'}
                      </td>
                      <td>
                        {r.home.wins}-{r.home.losses} ({r.home.games})
                      </td>
                      <td>
                        {r.away.wins}-{r.away.losses} ({r.away.games})
                      </td>
                      <td>{r.pointsPerGame?.toFixed(2) ?? 'Unavailable'}</td>
                      <td>{r.opponentPointsPerGame?.toFixed(2) ?? 'Unavailable'}</td>
                      <td>{r.finalMarginPerGame?.toFixed(2) ?? 'Unavailable'}</td>
                      <td>
                        {r.lastTen.complete
                          ? `${r.lastTen.wins}-${r.lastTen.losses}`
                          : 'Unavailable'}
                      </td>
                      <td>
                        {r.lastTen.observedGames}/{r.lastTen.expectedGames}
                        <div>
                          {r.lastTen.from} to {r.lastTen.to}
                        </div>
                      </td>
                      <td>
                        {r.streak.kind
                          ? `${r.streak.kind}${r.streak.length}`
                          : 'Unavailable'}
                        <div>Source through {r.streak.through ?? 'Unavailable'}</div>
                      </td>
                      <td>
                        {r.missingGameIds.length ? (
                          <details>
                            <summary>
                              {r.missingGameIds.length} missing source agreements
                            </summary>
                            <ul>
                              {r.missingGameIds.map((id) => (
                                <li key={id}>{id}</li>
                              ))}
                            </ul>
                          </details>
                        ) : (
                          'None'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResearchTable>
          )}
          <p>
            W-L counts use observed finals. Last ten refers to the full source
            schedule’s final ten games and is withheld if any are missing. Streaks
            require the verified final suffix and its stopping boundary. No medical or
            player availability inference is made from missing source games.
          </p>
          {data.attributions.map((a) => (
            <WikiAttribution key={a.revision} data={a} />
          ))}
          <WikiAttribution data={data.conferenceSource} />
        </>
      )}
    </ResearchShell>
  );
}
