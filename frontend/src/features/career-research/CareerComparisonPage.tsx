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
import { LineChart } from '../../charts/LineChart';
import { ChartLegend } from '../../charts/markers';
import { seasonFromStartYear, shortSeason } from '../player-hub/seasons';

function careerCurvePoints(
  data: CareerComparisonResponse,
  metric: CareerMetric,
  minGames: number,
  axis: 'calendar' | 'reported' | 'age',
) {
  return data.rows.map((r) => ({
    playerId: r.playerId,
    points: (r.data?.seasons ?? []).map((s, index) => ({
      season: s.totals.season,
      year: Number(s.totals.season.slice(0, 4)),
      x:
        axis === 'calendar'
          ? Number(s.totals.season.slice(0, 4))
          : axis === 'age'
            ? s.ageOnOctober1
            : index + 1,
      y: s.totals.gamesPlayed >= minGames ? careerMetricValue(s, metric) : null,
    })),
  }));
}
const CURVE_STYLE = [
  { color: '#3b82f6', dash: undefined, shape: 'circle' },
  { color: '#bd8008', dash: '6 3', shape: 'square' },
  { color: '#0ea594', dash: '2 4', shape: 'triangle' },
  { color: '#9b6be8', dash: '10 4 2 4', shape: 'diamond' },
] as const;

function Curves({
  data,
  metric,
  minGames,
  axis,
}: {
  data: CareerComparisonResponse;
  metric: CareerMetric;
  minGames: number;
  axis: 'calendar' | 'reported' | 'age';
}) {
  const curves = careerCurvePoints(data, metric, minGames, axis);
  const xs = curves
    .flatMap((c) => c.points.map((p) => p.x))
    .filter((x): x is number => x !== null);
  const hasValue = curves.some((c) =>
    c.points.some((p) => p.y !== null && p.x !== null),
  );
  if (!xs.length || !hasValue)
    return <p>No reported seasons qualify for the curves.</p>;
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  // A continuous axis (every year, age or reported number in range), so missing values are
  // visible gaps; consecutive slots only connect when the seasons are consecutive years.
  const categories = Array.from({ length: maxX - minX + 1 }, (_, i) => minX + i);
  const series = curves.map((curve, index) => {
    const byX = new Map(
      curve.points.filter((p) => p.x !== null).map((p) => [p.x as number, p]),
    );
    const name =
      data.rows[index]?.data?.player.fullName ?? `NBA player ${curve.playerId}`;
    const style = CURVE_STYLE[index % CURVE_STYLE.length]!;
    return {
      id: curve.playerId,
      label: `${index + 1}. ${name}`,
      ...style,
      values: categories.map((x) => byX.get(x)?.y ?? null),
      breakBefore: categories.map((x, i) => {
        const point = byX.get(x);
        const previous = i > 0 ? byX.get(categories[i - 1]!) : undefined;
        return Boolean(point && previous && point.year !== previous.year + 1);
      }),
    };
  });
  const percent = metric === 'trueShooting' || metric === 'effectiveFieldGoal';
  return (
    <div className="panel frchart" data-chart="career-curves">
      <ChartLegend items={series} />
      <LineChart
        label={`Career curves: ${CAREER_METRICS[metric]} by ${
          axis === 'calendar'
            ? 'season'
            : axis === 'age'
              ? 'age'
              : 'reported season number'
        }`}
        categories={categories.map(String)}
        series={series}
        height={320}
        format={(value) => (percent ? value.toFixed(3) : value.toFixed(1))}
        formatCategory={(value) =>
          axis === 'calendar'
            ? shortSeason(seasonFromStartYear(Number(value)))
            : axis === 'age'
              ? `Age ${value}`
              : `#${value}`
        }
        footnote={
          axis === 'calendar'
            ? 'NBA season start year. Lines break at missing seasons, unavailable inputs and unqualified samples.'
            : axis === 'age'
              ? 'Age on October 1 from a sourced birth date. Lines break where seasons are not consecutive.'
              : 'Reported season number (not verified experience). Lines break where reported seasons are years apart.'
        }
      />
    </div>
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
        !['players', 'metric', 'minGames', 'axis', 'scope'].includes(k),
    ) ||
    !['calendar', 'reported', 'age'].includes(axis) ||
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
        Compare 2–4 selected players using reported raw totals in the chosen season
        scope. Curves break at missing seasons, unavailable inputs and unqualified
        samples. Values remain raw across eras.
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
          Career season scope
          <select
            value={params.get('scope') ?? 'regular-season'}
            onChange={(e) => update('scope', e.target.value)}
          >
            <option value="regular-season">Regular season</option>
            <option value="playoffs">Playoffs</option>
          </select>
        </label>
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
            <option value="age">Age on October 1 (sourced birth date)</option>
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
            axis={axis as 'calendar' | 'reported' | 'age'}
          />
          <p>
            The numbered curves correspond to the players below; use the arrow keys on
            the chart to read every point. The table provides the same data for keyboard
            and screen reader access. Percentages are raw ratios in the curves.
          </p>
          {query.data.rows.map((row, index) => (
            <section key={row.playerId}>
              <h2>
                {index + 1}. {row.data?.player.fullName ?? `NBA player ${row.playerId}`}
              </h2>
              <Link
                to={`/players/${row.playerId}/career?metric=${metric}&minGames=${minGames}&scope=${parsed.success ? parsed.data.scope : 'regular-season'}`}
              >
                Career details and peak
              </Link>
              {!row.data ? (
                <p role="status">Unavailable ({row.status})</p>
              ) : (
                <>
                  <SourceNote provenance={row.data.provenance} />
                  <p>
                    Sourced birth date: {row.data.birthDate ?? 'Unavailable'}. Age
                    reference: {row.data.ageReference}. No draft-age estimate is used.
                  </p>
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
                          <th scope="col">Age on October 1</th>
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
                            <td>{s.ageOnOctober1 ?? 'Unavailable'}</td>
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
