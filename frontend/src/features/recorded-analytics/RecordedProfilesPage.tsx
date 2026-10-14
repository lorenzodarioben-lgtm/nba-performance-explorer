import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  RecordedProfilesQuerySchema,
  RecordedProfilesResponseSchema,
  RecordedDirectorySchema,
  ProfileMetricSchema,
  type RecordedProfilesResponse,
  type ProfileMetric,
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
const labels: Record<ProfileMetric, string> = {
  pointsPerGame: 'PPG',
  reboundsPerGame: 'RPG',
  assistsPerGame: 'APG',
  stealsPerGame: 'SPG',
  blocksPerGame: 'BPG',
  minutesPerGame: 'MPG',
};
const colors = ['#1d4ed8', '#166534', '#9a3412', '#7e22ce'];
function ProfileRadar({ data }: { data: RecordedProfilesResponse }) {
  const point = (i: number, percentile: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / data.metrics.length;
    return [
      220 + (Math.cos(angle) * 140 * percentile) / 100,
      185 + (Math.sin(angle) * 140 * percentile) / 100,
    ];
  };
  return (
    <svg
      role="img"
      aria-label="Common-cohort percentile profiles; exact values in the table"
      viewBox="0 0 440 380"
      style={{ width: '100%', maxWidth: 640, height: 'auto' }}
    >
      {[25, 50, 75, 100].map((p) => (
        <polygon
          key={p}
          points={data.metrics.map((_, i) => point(i, p).join(',')).join(' ')}
          stroke="#a1a1aa"
          fill="none"
        />
      ))}
      {data.metrics.map((m, i) => {
        const p = point(i, 100),
          label = point(i, 116);
        return (
          <g key={m}>
            <line x1={220} y1={185} x2={p[0]} y2={p[1]} stroke="#a1a1aa" />
            <text x={label[0]} y={label[1]} textAnchor="middle">
              {labels[m]}
            </text>
          </g>
        );
      })}
      {data.profiles.map(
        (p, i) =>
          p.available && (
            <polygon
              data-profile={p.playerId}
              key={p.playerId}
              points={p.categories
                .map((c, n) => point(n, c.percentile).join(','))
                .join(' ')}
              fill={colors[i]}
              fillOpacity={0.06}
              stroke={colors[i]}
              strokeWidth={2}
            >
              <title>{p.name}</title>
            </polygon>
          ),
      )}
      <text x={10} y={370}>
        Rings: 25, 50, 75, 100 percentile
      </text>
    </svg>
  );
}
export function RecordedProfilesPage() {
  const [params, setParams] = useSearchParams();
  const parsed = RecordedProfilesQuerySchema.safeParse(Object.fromEntries(params));
  const valid =
    parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const selected = (params.get('players') ?? '201939').split(',');
  const metrics = (
    params.get('metrics') ??
    'pointsPerGame,reboundsPerGame,assistsPerGame,stealsPerGame,blocksPerGame'
  ).split(',');
  const update = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    p.set(k, v);
    setParams(p);
  };
  const query = useQuery({
    queryKey: ['research', 'recorded-profiles', params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/profiles?${params}`,
        signal,
        RecordedProfilesResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const directory = useQuery({
    queryKey: ['research', 'recorded-directory'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/recorded/directory', signal, RecordedDirectorySchema.parse),
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined;
  return (
    <ResearchShell title="Recorded percentile profiles">
      <p>
        Compare one to four historical players over three to six categories. Every
        category uses the same supported, identifiable GP-qualified population. The
        initial example selects Stephen Curry (201939); enter or choose other source
        identities.
      </p>
      <p>
        Percentiles describe numerical values in this incomplete 2023–24 source cohort.
        Higher does not mean better; radar area is not a quality score. Steals and
        blocks are event counts, not defensive quality.
      </p>
      {!valid ? (
        <p role="alert">
          Invalid profile filters. Choose unique player IDs, at least three unique
          categories and a supported scope.
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      <div className={styles.controls}>
        <label>
          Profile NBA player IDs
          <input
            maxLength={60}
            value={params.get('players') ?? '201939'}
            onChange={(e) => update('players', e.target.value)}
          />
        </label>
        <label>
          Add known historical player
          <select
            value=""
            onChange={(e) => {
              if (
                e.target.value &&
                selected.length < 4 &&
                !selected.includes(e.target.value)
              )
                update('players', [...selected, e.target.value].join(','));
            }}
          >
            <option value="">Choose source identity</option>
            {directory.data?.players.map((p) => (
              <option key={p.playerId} value={p.playerId}>
                {p.name} ({p.playerId})
              </option>
            ))}
          </select>
        </label>
        <label>
          Profile minimum games
          <input
            type="number"
            min={1}
            max={150}
            value={params.get('minGames') ?? '20'}
            onChange={(e) => update('minGames', e.target.value)}
          />
        </label>
        <label>
          Profile scope
          <select
            value={params.get('scope') ?? 'regular-season'}
            onChange={(e) => update('scope', e.target.value)}
          >
            <option value="regular-season">Regular season</option>
            <option value="playoffs">Playoffs (only explicitly scoped rows)</option>
          </select>
        </label>
      </div>
      <fieldset>
        <legend>Profile categories (three to six)</legend>
        {ProfileMetricSchema.options.map((m) => (
          <label key={m} style={{ display: 'block' }}>
            <input
              type="checkbox"
              checked={metrics.includes(m)}
              onChange={(e) =>
                update(
                  'metrics',
                  (e.target.checked
                    ? [...metrics, m]
                    : metrics.filter((v) => v !== m)
                  ).join(','),
                )
              }
            />{' '}
            {labels[m]} — {m}
          </label>
        ))}
      </fieldset>
      {directory.isError && (
        <p role="status">
          Source identity chooser unavailable. Explicit NBA IDs remain editable.
        </p>
      )}
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <p>
            Common cohort: {data.population} players; minimum {data.minGames} games;{' '}
            {data.scope}. Unknown-scope rows excluded: {data.unknownScopeRows}. Snapshot
            assembled {data.snapshotCreatedAt}.
          </p>
          <label>
            Shareable percentile URL
            <input
              readOnly
              value={`${window.location.origin}/lab/profiles?${params}`}
            />
          </label>
          <SaveResearchButton
            kind="comparison"
            label="Recorded percentile profiles"
            path={`/lab/profiles?${params}`}
          />
          {data.population > 0 ? (
            <ProfileRadar data={data} />
          ) : (
            <p role="status">No jointly qualified players. No radar is drawn.</p>
          )}
          <ul>
            {data.profiles.map((p, i) => (
              <li key={p.playerId}>
                <span style={{ color: colors[i] }}>Player {i + 1}: </span>
                <Link to={`/players/${p.playerId}`}>{p.name ?? p.playerId}</Link>
                {p.available
                  ? ` — ${p.gamesPlayed} reported games`
                  : ' — unavailable or excluded from the common cohort; no values or zero polygon imputed.'}
              </li>
            ))}
          </ul>
          <ResearchTable label="Percentile profile exact values">
            <table>
              <caption>Raw values and normalization in one common population</caption>
              <thead>
                <tr>
                  {[
                    'Player',
                    'Category',
                    'Raw value',
                    'Competition rank',
                    'Midrank percentile',
                    'Population z-score',
                  ].map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.profiles.flatMap((p) =>
                  p.categories.map((c) => (
                    <tr key={`${p.playerId}:${c.metric}`}>
                      <th scope="row">{p.name}</th>
                      <td>{labels[c.metric]}</td>
                      <td>{c.value.toFixed(4)}</td>
                      <td>{c.rank}</td>
                      <td>{c.percentile.toFixed(2)}</td>
                      <td>{c.zScore.toFixed(4)}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </ResearchTable>
          <ResearchTable label="Profile eligibility and distributions">
            <table>
              <caption>
                Single-category eligibility before intersection; mean/SD after
                intersection
              </caption>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col">Single-category qualified</th>
                  <th scope="col">Common mean</th>
                  <th scope="col">Common population SD</th>
                </tr>
              </thead>
              <tbody>
                {data.metricPopulations.map((m) => (
                  <tr key={m.metric}>
                    <th scope="row">{labels[m.metric]}</th>
                    <td>{m.qualified}</td>
                    <td>{m.mean?.toFixed(4) ?? 'Unavailable'}</td>
                    <td>{m.standardDeviation?.toFixed(4) ?? 'Unavailable'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          {data.attributions.map((a) => (
            <WikiAttribution key={a.revision} data={a} />
          ))}
        </>
      )}
    </ResearchShell>
  );
}
