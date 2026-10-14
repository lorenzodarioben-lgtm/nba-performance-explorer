import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  ArchiveRankingMetricSchema,
  RecordedDiscoveryQuerySchema,
  RecordedDiscoveryResponseSchema,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import {
  ResearchShell,
  ResearchTable,
  SourceNote,
  QueryFeedback,
} from '../research/ResearchShell';
import { WikiAttribution } from '../wiki-archive/WikiAttribution';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';
export function RecordedDiscoveryPage() {
  const [params, setParams] = useSearchParams(),
    parsed = RecordedDiscoveryQuerySchema.safeParse(Object.fromEntries(params));
  const valid =
    parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const query = useQuery({
    queryKey: ['research', 'recorded-discovery', params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/discovery?${params}`,
        signal,
        RecordedDiscoveryResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined;
  const update = (k: string, v: string) => {
    const copy = new URLSearchParams(params);
    if (v) copy.set(k, v);
    else copy.delete(k);
    setParams(copy);
  };
  const share = new URLSearchParams(params);
  share.set('season', '2023-24');
  const evidence = (id: string) => {
    const q = new URLSearchParams({
      season: '2023-24',
      scope: data!.scope,
      minGames: String(data!.minGames),
      x: data!.x,
      y: data!.y,
      target: id,
    });
    return `/lab/recorded?${q}`;
  };
  return (
    <ResearchShell title="Recorded cohort discovery">
      <p>
        Find similar statistical profiles or run explicit category thresholds over the
        qualified2023–24 recorded source cohort. Every result retains exact metric/GP
        evidence. This incomplete historical cohort does not establish player quality,
        popularity, era equivalence or league-wide peers.
      </p>
      <Link to="/discover">Selected2–4 player-season discovery</Link>{' '}
      <Link to="/history/calendar">Recorded calendar games</Link>
      {!valid ? (
        <p role="alert">
          Invalid recorded discovery filters. Choose different axes, supported scope and
          bounded thresholds.
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      <div className={styles.controls}>
        <label>
          Recorded discovery mode
          <select
            value={params.get('mode') ?? 'neighbors'}
            onChange={(e) => update('mode', e.target.value)}
          >
            <option value="neighbors">Standardized similarity</option>
            <option value="thresholds">Raw category thresholds</option>
          </select>
        </label>
        {(['x', 'y'] as const).map((k) => (
          <label key={k}>
            {k === 'x' ? 'Discovery X metric' : 'Discovery Y metric'}
            <select
              value={params.get(k) ?? (k === 'x' ? 'pointsPerGame' : 'reboundsPerGame')}
              onChange={(e) => update(k, e.target.value)}
            >
              {ArchiveRankingMetricSchema.options.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Discovery source scope
          <select
            value={params.get('scope') ?? 'regular-season'}
            onChange={(e) => update('scope', e.target.value)}
          >
            <option value="regular-season">Regular season</option>
            <option value="playoffs">Playoffs</option>
          </select>
        </label>
        <label>
          Discovery minimum GP
          <input
            type="number"
            min={1}
            max={150}
            value={params.get('minGames') ?? '20'}
            onChange={(e) => update('minGames', e.target.value)}
          />
        </label>
        <label>
          Maximum X threshold
          <input
            type="number"
            min={0}
            max={10000000}
            step={0.001}
            value={params.get('maxX') ?? '15'}
            onChange={(e) => update('maxX', e.target.value)}
          />
        </label>
        <label>
          Minimum Y threshold
          <input
            type="number"
            min={0}
            max={10000000}
            step={0.001}
            value={params.get('minY') ?? '8'}
            onChange={(e) => update('minY', e.target.value)}
          />
        </label>
        <label>
          Discovery result limit
          <input
            type="number"
            min={1}
            max={50}
            value={params.get('limit') ?? '20'}
            onChange={(e) => update('limit', e.target.value)}
          />
        </label>
        <button
          onClick={() =>
            setParams({
              season: '2023-24',
              scope: 'regular-season',
              mode: 'thresholds',
              x: 'pointsPerGame',
              y: 'reboundsPerGame',
              minGames: '40',
              maxX: '15',
              minY: '8',
            })
          }
        >
          Query PTS≤15 and REB≥8 with GP≥40
        </button>
      </div>
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <p>
            Common qualified pool {data.eligiblePool.length}; {data.sourceRows} scoped
            source rows; {data.unknownScopeRows} unknown-scope rows withheld. Population
            normalization remains fixed before threshold/target selection. Snapshot
            {data.snapshotCreatedAt}.
          </p>
          <label>
            Recorded discovery target
            <select
              value={params.get('target') ?? ''}
              onChange={(e) => update('target', e.target.value)}
            >
              <option value="">Choose qualifying target</option>
              {data.target && !data.targetAvailable && (
                <option value={data.target}>Unavailable target {data.target}</option>
              )}
              {data.eligiblePool.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.name} · {p.playerId}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={!data.eligiblePool.length}
            onClick={() =>
              update(
                'target',
                data.eligiblePool[Math.floor(Math.random() * data.eligiblePool.length)]!
                  .playerId,
              )
            }
          >
            Random qualifying recorded target
          </button>
          {data.targetRow && (
            <p>
              Target {data.targetRow.name}, GP {data.targetRow.gamesPlayed}, X
              {data.targetRow.x}, Y {data.targetRow.y}.{' '}
              <Link to={evidence(data.targetRow.playerId)}>
                Inspect target evidence
              </Link>
            </p>
          )}
          {data.mode === 'neighbors' ? (
            <p>
              Distance=√((peer zX−target zX)²+(peer zY−target zY)²), population SD over
              the common pool; constant-axis z=0. Both axes equal weight. Six-decimal
              distances determine tied competition ranks. Missing/unqualified target
              yields no peers or imputed values.
            </p>
          ) : (
            <p>
              Category query: {data.x}≤{data.maxX} and {data.y}≥{data.minY}, GP≥
              {data.minGames}. These raw thresholds are selection criteria, not a claim
              that players are overlooked. Sort Y descending, X ascending; equal X/Y
              pairs retain tied ranks.
            </p>
          )}
          <label>
            Shareable recorded discovery URL
            <input
              readOnly
              value={`${window.location.origin}/discover/recorded?${share}`}
            />
          </label>
          <SaveResearchButton
            kind="analysis"
            label="Recorded cohort discovery query"
            path={`/discover/recorded?${share}`}
          />
          <p>
            {data.totalMatches} matching candidates; showing at most {data.limit}.
            Target excluded from similarity peers.
          </p>
          {!data.rows.length ? (
            <p role="status">
              No matching candidates. Choose a qualified target for similarity or adjust
              thresholds.
            </p>
          ) : (
            <ResearchTable label="Recorded discovery evidence">
              <table>
                <caption>
                  Exact raw values, standardized coordinates and distance contributions
                </caption>
                <thead>
                  <tr>
                    {[
                      'Rank',
                      'Player',
                      'GP',
                      'X',
                      'Y',
                      'zX',
                      'zY',
                      'Distance',
                      'ΔzX²',
                      'ΔzY²',
                      'Evidence',
                    ].map((s) => (
                      <th scope="col" key={s}>
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.playerId}>
                      <td>{r.rank}</td>
                      <th scope="row">
                        <Link to={`/players/${r.playerId}`}>{r.name}</Link>
                      </th>
                      <td>{r.gamesPlayed}</td>
                      <td>{r.x}</td>
                      <td>{r.y}</td>
                      <td>{r.zX.toFixed(4)}</td>
                      <td>{r.zY.toFixed(4)}</td>
                      <td>{r.distance?.toFixed(6) ?? 'Threshold query'}</td>
                      <td>{r.xSquaredDifference?.toFixed(6) ?? '—'}</td>
                      <td>{r.ySquaredDifference?.toFixed(6) ?? '—'}</td>
                      <td>
                        <Link to={evidence(r.playerId)}>Exact cohort evidence</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResearchTable>
          )}
          <details>
            <summary>Recorded source revisions and licences</summary>
            {data.attributions.map((a) => (
              <WikiAttribution key={a.revision} data={a} />
            ))}
          </details>
        </>
      )}
    </ResearchShell>
  );
}
