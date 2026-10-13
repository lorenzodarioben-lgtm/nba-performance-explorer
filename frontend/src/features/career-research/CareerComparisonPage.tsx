import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  CAREER_METRICS,
  CareerComparisonQuerySchema,
  CareerComparisonResponseSchema,
  careerMetricValue,
  type CareerComparisonResponse,
  type CareerMetric,
} from '@nba-performance-explorer/contracts';
import { PlayerCombobox } from '../player-search/PlayerCombobox';
import { fetchResearch } from '../research/api';
import {
  QueryFeedback,
  ResearchShell,
  ResearchTable,
  SourceNote,
} from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';

function careerCurvePoints(
  data: CareerComparisonResponse,
  metric: CareerMetric,
  minGames: number,
  axis: 'calendar' | 'reported',
) {
  return data.rows.map((r) => ({
    playerId: r.playerId,
    points: (r.data?.seasons ?? []).map((s, index) => ({
      season: s.totals.season,
      year: Number(s.totals.season.slice(0, 4)),
      x: axis === 'calendar' ? Number(s.totals.season.slice(0, 4)) : index + 1,
      y: s.totals.gamesPlayed >= minGames ? careerMetricValue(s, metric) : null,
    })),
  }));
}
function Curves({
  data,
  metric,
  minGames,
  axis,
}: {
  data: CareerComparisonResponse;
  metric: CareerMetric;
  minGames: number;
  axis: 'calendar' | 'reported';
}) {
  const series = careerCurvePoints(data, metric, minGames, axis);
  const points = series.flatMap((s) => s.points);
  const visible = points.filter((p) => p.y !== null);
  if (!visible.length) return <p>No reported seasons qualify for the curves.</p>;
  const minX = Math.min(...points.map((p) => p.x)),
    maxX = Math.max(...points.map((p) => p.x));
  const maxY = Math.max(...visible.map((p) => p.y!));
  const x = (v: number) =>
    60 + 460 * (maxX === minX ? 0.5 : (v - minX) / (maxX - minX));
  const y = (v: number) => 220 - 180 * (maxY === 0 ? 0 : v / maxY);
  return (
    <svg
      viewBox="0 0 600 290"
      aria-hidden="true"
      style={{ width: '100%', maxWidth: 800 }}
    >
      <path d="M 60 30 V 220 H 530" fill="none" stroke="#52525b" />
      <text x="60" y="245">
        {minX}
      </text>
      <text x="510" y="245">
        {maxX}
      </text>
      <text x="10" y="40">
        {maxY.toFixed(2)}
      </text>
      <text x="20" y="220">
        0
      </text>
      <text x="280" y="280" textAnchor="middle">
        {axis === 'calendar'
          ? 'NBA season start year'
          : 'Reported season number (not verified experience)'}
      </text>
      {series.map((s, i) => (
        <g key={s.playerId} fill={['#1d4ed8', '#92400e', '#047857', '#7e22ce'][i]}>
          {s.points.map((p, index) => {
            if (p.y === null) return null;
            const previous = s.points[index - 1];
            return (
              <g key={p.season}>
                {previous && previous.y !== null && p.year === previous.year + 1 && (
                  <path
                    d={`M ${x(previous.x)} ${y(previous.y)} L ${x(p.x)} ${y(p.y)}`}
                    stroke="currentColor"
                    style={{ color: ['#1d4ed8', '#92400e', '#047857', '#7e22ce'][i] }}
                    fill="none"
                    strokeWidth="2"
                  />
                )}
                <circle cx={x(p.x)} cy={y(p.y)} r="3" />
                <text x={x(p.x) + 5} y={y(p.y) - 5}>
                  {i + 1}
                </text>
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}
export function CareerComparisonPage() {
  const [params, setParams] = useSearchParams();
  const [message, setMessage] = useState('');
  const axis = params.get('axis') ?? 'calendar';
  const apiParams = new URLSearchParams(params);
  apiParams.delete('axis');
  const parsed = CareerComparisonQuerySchema.safeParse(Object.fromEntries(apiParams));
  const ids = params.get('players')?.split(',') ?? [];
  const invalid =
    [...params.keys()].some(
      (k) =>
        params.getAll(k).length > 1 ||
        !['players', 'metric', 'minGames', 'axis'].includes(k),
    ) ||
    !['calendar', 'reported'].includes(axis) ||
    ids.length > 4 ||
    new Set(ids).size !== ids.length;
  const ready = !invalid && parsed.success;
  const metric = parsed.success ? parsed.data.metric : 'pointsPerGame';
  const minGames = parsed.success ? parsed.data.minGames : 20;
  const query = useQuery({
    queryKey: ['research', 'career-comparison', apiParams.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/analytics/careers?${apiParams}`,
        signal,
        CareerComparisonResponseSchema.parse,
      ),
    enabled: ready,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const update = (key: string, value: string) => {
    const copy = new URLSearchParams(params);
    if (value) copy.set(key, value);
    else copy.delete(key);
    setParams(copy);
  };
  return (
    <ResearchShell title="Career comparison">
      <p>
        Compare 2–4 selected players using reported regular-season raw totals. Curves
        break at missing seasons, unavailable inputs and unqualified samples. Values
        remain raw across eras.
      </p>
      <PlayerCombobox
        label="Add player to career comparison"
        onSelect={(p) => {
          if (ids.length >= 4 || ids.includes(p.id)) {
            setMessage('Choose up to four distinct players.');
            return;
          }
          update('players', [...ids, p.id].join(','));
          setMessage('');
        }}
      />
      {message && <p role="status">{message}</p>}
      <ul>
        {ids.map((id) => (
          <li key={id}>
            NBA player {id}{' '}
            <button
              onClick={() => update('players', ids.filter((p) => p !== id).join(','))}
            >
              Remove NBA player {id}
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.controls}>
        <label>
          Career comparison metric
          <select
            value={params.get('metric') ?? 'pointsPerGame'}
            onChange={(e) => update('metric', e.target.value)}
          >
            {Object.entries(CAREER_METRICS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Career minimum games
          <select
            value={params.get('minGames') ?? '20'}
            onChange={(e) => update('minGames', e.target.value)}
          >
            {[1, 10, 20, 40, 60, 82].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Career axis
          <select value={axis} onChange={(e) => update('axis', e.target.value)}>
            <option value="calendar">Season calendar</option>
            <option value="reported">Reported season number</option>
          </select>
        </label>
      </div>
      {!ready ? (
        <p role={invalid || ids.length >= 2 ? 'alert' : 'status'}>
          Choose a valid metric, minimum games and 2–4 distinct NBA players.{' '}
          <button onClick={() => setParams({})}>Reset selection</button>
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {ready && query.data && (
        <>
          <SaveResearchButton
            kind="comparison"
            label="Career comparison"
            path={`/lab/careers?${params}`}
          />
          <label>
            Shareable career URL
            <input readOnly value={`${window.location.origin}/lab/careers?${params}`} />
          </label>
          <Curves
            data={query.data}
            metric={metric}
            minGames={minGames}
            axis={axis as 'calendar' | 'reported'}
          />
          <p>
            The numbered curves correspond to the players below. The table provides the
            same data for keyboard and screen reader access. Percentages are raw ratios
            in the curves.
          </p>
          {query.data.rows.map((row, index) => (
            <section key={row.playerId}>
              <h2>
                {index + 1}. {row.data?.player.fullName ?? `NBA player ${row.playerId}`}
              </h2>
              <Link
                to={`/players/${row.playerId}/career?metric=${metric}&minGames=${minGames}`}
              >
                Career details and peak
              </Link>
              {!row.data ? (
                <p role="status">Unavailable ({row.status})</p>
              ) : (
                <>
                  <SourceNote provenance={row.data.provenance} />
                  <p>
                    {row.status}; {row.data.seasons.length} reported seasons; qualified
                    peak: {row.data.peak.seasons.join(', ') || 'Unavailable'}.
                  </p>
                  <ResearchTable label={`Career series for NBA player ${row.playerId}`}>
                    <table>
                      <caption>
                        {row.data.player.fullName} · {CAREER_METRICS[metric]}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Season</th>
                          <th scope="col">Reported number</th>
                          <th scope="col">Games</th>
                          <th scope="col">Metric (raw ratio for %)</th>
                          <th scope="col">Qualified</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.data.seasons.map((s, i) => (
                          <tr key={s.totals.season}>
                            <th scope="row">{s.totals.season}</th>
                            <td>{i + 1}</td>
                            <td>{s.totals.gamesPlayed}</td>
                            <td>
                              {careerMetricValue(s, metric)?.toFixed(4) ??
                                'Unavailable'}
                            </td>
                            <td>
                              {s.totals.gamesPlayed >= minGames &&
                              careerMetricValue(s, metric) !== null
                                ? 'Yes'
                                : 'No'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ResearchTable>
                </>
              )}
            </section>
          ))}
        </>
      )}
    </ResearchShell>
  );
}
