import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  AnalyticsMetricSchema,
  CohortResponseSchema,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import {
  ResearchShell,
  ResearchTable,
  SourceNote,
  QueryFeedback,
} from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { readDiscoveryState, nearestWithinCohort } from './discovery-core';
import styles from '../research/research.module.css';
export function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const state = readDiscoveryState(params);
  const query = useQuery({
    queryKey: ['research', 'discovery', state.api.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/analytics/cohort?${state.api}`,
        signal,
        CohortResponseSchema.parse,
      ),
    enabled: state.valid,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const data = state.valid ? query.data : undefined;
  const pool = data?.analysis.rows ?? [];
  const target = state.target ?? pool[0]?.playerId;
  const nearest = target ? nearestWithinCohort(pool, target) : [];
  const row = (id: string) => data?.rows.find((r) => r.playerId === id);
  const label = (id: string) =>
    `${row(id)?.player?.fullName ?? id} · ${row(id)?.season ?? 'unavailable season'}`;
  const updateTarget = (id: string) => {
    const copy = new URLSearchParams(params);
    copy.set('target', id);
    setParams(copy);
  };
  const base = new URLSearchParams();
  for (const key of ['players', 'seasons']) {
    const value = params.get(key);
    if (value) base.set(key, value);
  }
  const saved = new URLSearchParams(params);
  if (target) saved.set('target', target);
  return (
    <ResearchShell title="Selected-season discovery">
      <p>
        Compare statistical similarity within your selected 2–4 player-seasons. This
        pool is deliberately small; it cannot identify the closest NBA peer across the
        league or normalize different eras. All values are raw regular-season summaries.
      </p>
      <Link to={`/lab/compare${base.size ? `?${base}` : ''}`}>
        Choose or edit discovery pool
      </Link>{' '}
      <Link to={`/lab/analytics${state.valid ? `?${state.api}` : ''}`}>
        Inspect exact metric and standardization evidence
      </Link>
      {!state.valid && (
        <p role="status">
          Choose 2–4 distinct players with aligned seasons, two different metrics and a
          target within the pool. Unsupported, duplicate or invalid discovery state is
          not fetched.
        </p>
      )}
      <form
        key={params.toString()}
        className={styles.controls}
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const copy = new URLSearchParams(base);
          for (const key of ['x', 'y', 'minGames'])
            copy.set(key, String(form.get(key)));
          if (state.target) copy.set('target', state.target);
          setParams(copy);
        }}
      >
        {(['x', 'y'] as const).map((key) => (
          <label key={key}>
            {key === 'x' ? 'First similarity metric' : 'Second similarity metric'}
            <select
              name={key}
              defaultValue={
                params.get(key) ?? (key === 'x' ? 'pointsPerGame' : 'reboundsPerGame')
              }
            >
              {AnalyticsMetricSchema.options.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Minimum recorded games
          <input
            type="number"
            name="minGames"
            min={1}
            max={82}
            required
            defaultValue={params.get('minGames') ?? '10'}
          />
        </label>
        <button type="submit">Apply discovery filters</button>
      </form>
      {state.valid && (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <p>
            {pool.length} qualifying selected seasons; {data.analysis.excluded.length}{' '}
            excluded. Percentage inputs are ratios. Qualification uses recorded GP;
            missing raw inputs are excluded rather than imputed.
          </p>
          <p>
            Distance = √((z(X) − target z(X))² + (z(Y) − target z(Y))²). Each metric
            uses population standard deviation within this qualifying pool. Constant
            metrics have z=0; no information is added by that axis. Equal axis weights;
            six-decimal distances define tied competition ranks. Lower means closer for
            these two metrics only.
          </p>
          <label>
            Similarity target
            <select value={target ?? ''} onChange={(e) => updateTarget(e.target.value)}>
              <option value="" disabled>
                Choose a qualifying target
              </option>
              {pool.map((r) => (
                <option key={r.playerId} value={r.playerId}>
                  {label(r.playerId)}
                </option>
              ))}
              {state.target && !pool.some((r) => r.playerId === state.target) && (
                <option value={state.target}>{label(state.target)} (excluded)</option>
              )}
            </select>
          </label>
          <button
            disabled={!pool.length}
            onClick={() =>
              updateTarget(pool[Math.floor(Math.random() * pool.length)]!.playerId)
            }
          >
            Random qualifying target
          </button>
          <label>
            Shareable discovery URL
            <input readOnly value={`${window.location.origin}/discover?${saved}`} />
          </label>
          <SaveResearchButton
            kind="analysis"
            label="Selected-season statistical similarity"
            path={`/discover?${saved}`}
          />
          {nearest.length ? (
            <ResearchTable label="Selected-season similarity evidence">
              <table>
                <caption>
                  Closest matches in this selected pool; no official peer ranking
                </caption>
                <thead>
                  <tr>
                    {[
                      'Tied rank',
                      'Player / season',
                      'Distance',
                      'X',
                      'Y',
                      'Squared X contribution',
                      'Squared Y contribution',
                      'Season evidence',
                    ].map((s) => (
                      <th key={s} scope="col">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nearest.map((r) => (
                    <tr key={r.playerId}>
                      <td>{r.rank}</td>
                      <th scope="row">
                        <Link to={`/players/${r.playerId}`}>{label(r.playerId)}</Link>
                      </th>
                      <td>{r.distance.toFixed(6)}</td>
                      <td>{r.x}</td>
                      <td>{r.y}</td>
                      <td>{r.xSquared.toFixed(6)}</td>
                      <td>{r.ySquared.toFixed(6)}</td>
                      <td>
                        <Link
                          to={`/players/${r.playerId}/insights?season=${row(r.playerId)!.season}`}
                        >
                          Recorded-season evidence
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResearchTable>
          ) : (
            <p role="status">
              No qualifying peer for this target in the selected pool. Add qualifying
              seasons or lower the explicit sample threshold.
            </p>
          )}
          {data.analysis.excluded.length > 0 && (
            <ul>
              {data.analysis.excluded.map((r) => (
                <li key={r.playerId}>
                  {label(r.playerId)}: {r.reason}
                </li>
              ))}
            </ul>
          )}
          <p>
            League-wide unusual seasons, league trends, medical availability and
            era-adjusted similarity require additional verified datasets. Individual
            game thresholds and career milestones are available in the linked research
            tools.
          </p>
        </>
      )}
    </ResearchShell>
  );
}
