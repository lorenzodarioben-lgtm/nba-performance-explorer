import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  AnalyticsMetricSchema,
  COMPARISON_METRICS,
  CohortQuerySchema,
  CohortResponseSchema,
  type CohortResponse,
} from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import {
  QueryFeedback,
  ResearchShell,
  ResearchTable,
  SourceNote,
} from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';

const metrics = [
  ...COMPARISON_METRICS.map((m) => ({ ...m, unit: m.unit === '%' ? 'ratio' : m.unit })),
  { key: 'trueShooting', label: 'TS% estimate', unit: 'ratio' },
  { key: 'effectiveFieldGoal', label: 'eFG%', unit: 'ratio' },
  { key: 'assistTurnover', label: 'AST/TO', unit: 'ratio' },
  { key: 'pointsPer36', label: 'Points per 36', unit: 'points/36 min' },
] as const;

function Scatter({ data }: { data: CohortResponse }) {
  const rows = data.analysis.rows;
  if (rows.length === 0) return null;
  const minX = Math.min(...rows.map((r) => r.x)),
    maxX = Math.max(...rows.map((r) => r.x));
  const minY = Math.min(...rows.map((r) => r.y)),
    maxY = Math.max(...rows.map((r) => r.y));
  const scale = (value: number, min: number, max: number) =>
    max === min ? 0.5 : (value - min) / (max - min);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 500 300"
      style={{ width: '100%', maxWidth: 640, height: 'auto' }}
    >
      <path d="M 70 30 V 230 H 450" stroke="#52525b" fill="none" />
      <text x="250" y="290" textAnchor="middle">
        X: {data.analysis.x}
      </text>
      <text x="15" y="130" transform="rotate(-90 15 130)" textAnchor="middle">
        Y: {data.analysis.y}
      </text>
      <text x="70" y="255">
        {minX.toPrecision(3)}
      </text>
      <text x="405" y="255">
        {maxX.toPrecision(3)}
      </text>
      <text x="22" y="35">
        {maxY.toPrecision(3)}
      </text>
      <text x="22" y="230">
        {minY.toPrecision(3)}
      </text>
      {rows.map((row, index) => (
        <g key={row.playerId}>
          <circle
            cx={70 + 360 * scale(row.x, minX, maxX)}
            cy={230 - 190 * scale(row.y, minY, maxY)}
            r="5"
            fill="#1d4ed8"
          />
          <text
            x={80 + 360 * scale(row.x, minX, maxX)}
            y={225 - 190 * scale(row.y, minY, maxY)}
          >
            {index + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function AnalyticsLabPage() {
  const [params, setParams] = useSearchParams();
  const repeated = [...params.keys()].some((k) => params.getAll(k).length > 1);
  const parsed = CohortQuerySchema.safeParse(Object.fromEntries(params));
  const valid = parsed.success && !repeated;
  const query = useQuery({
    queryKey: ['research', 'cohort', params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(`/api/analytics/cohort?${params}`, signal, (v) =>
        CohortResponseSchema.parse(v),
      ),
    enabled: valid,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const base = new URLSearchParams();
  for (const key of ['players', 'seasons']) {
    const v = params.get(key);
    if (v) base.set(key, v);
  }
  const label = (key: string) => metrics.find((m) => m.key === key)?.label ?? key;
  return (
    <ResearchShell title="Analytics lab">
      <p>
        This lab analyzes your selected 2–4 player-seasons. It does not contain a
        league-wide population, official rankings or era adjustment. Percentage inputs
        are ratios (0.5 means 50%).
      </p>
      <Link to={`/lab/compare${base.size ? `?${base}` : ''}`}>
        Choose or edit player-season cohort
      </Link>
      {!valid && (
        <p role="status">
          Choose 2–4 distinct players and a season for each in the comparison lab, then
          open Analyze selected cohort. Invalid or repeated analytics filters are not
          fetched.
        </p>
      )}
      <form
        className={styles.controls}
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const copy = new URLSearchParams(base);
          for (const key of ['x', 'y', 'weightX', 'weightY', 'minGames'])
            copy.set(key, String(form.get(key)));
          setParams(copy);
        }}
        key={params.toString()}
      >
        <label>
          X metric
          <select
            name="x"
            defaultValue={
              AnalyticsMetricSchema.safeParse(params.get('x')).success
                ? params.get('x')!
                : 'pointsPerGame'
            }
          >
            {metrics.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} ({m.unit})
              </option>
            ))}
          </select>
        </label>
        <label>
          Y metric
          <select
            name="y"
            defaultValue={
              AnalyticsMetricSchema.safeParse(params.get('y')).success
                ? params.get('y')!
                : 'reboundsPerGame'
            }
          >
            {metrics.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} ({m.unit})
              </option>
            ))}
          </select>
        </label>
        <label>
          X weight
          <input
            name="weightX"
            type="number"
            min={-5}
            max={5}
            step={0.01}
            required
            defaultValue={params.get('weightX') ?? '1'}
          />
        </label>
        <label>
          Y weight
          <input
            name="weightY"
            type="number"
            min={-5}
            max={5}
            step={0.01}
            required
            defaultValue={params.get('weightY') ?? '1'}
          />
        </label>
        <label>
          Minimum games
          <input
            name="minGames"
            type="number"
            min={0}
            max={82}
            step={1}
            required
            defaultValue={params.get('minGames') ?? '10'}
          />
        </label>
        <button type="submit">Apply analytics</button>
      </form>
      {valid && (
        <>
          <SaveResearchButton
            kind="analysis"
            label="Selected player-season analytics"
            path={`/lab/analytics?${params}`}
          />
          <QueryFeedback pending={query.isPending} failed={query.isError} />
        </>
      )}
      {query.data && valid && (
        <>
          <SourceNote provenance={query.data.provenance} />
          <p>
            {query.data.analysis.sample} qualifying selected seasons.{' '}
            {query.data.analysis.excluded.length} excluded. Default qualification is at
            least 10 played games; this is a custom sample rule, not an official NBA
            qualification.
          </p>
          <h2>Scatter and custom ranking</h2>
          <p>
            Score = {query.data.analysis.weightX} × z({label(query.data.analysis.x)}) +{' '}
            {query.data.analysis.weightY} × z({label(query.data.analysis.y)}). z =
            (value − selected-cohort mean) / population standard deviation. Constant
            metric: z = 0. Negative weights favor smaller values. Six-decimal scores
            determine tied competition ranks.
          </p>
          <Scatter data={query.data} />
          <ResearchTable label="Exact selected-cohort values">
            <table>
              <caption>
                Scatter point numbers and unrounded input values; custom score is not an
                official ranking
              </caption>
              <thead>
                <tr>
                  {[
                    'Point',
                    'Player / season',
                    'X value',
                    'Y value',
                    'z(X)',
                    'z(Y)',
                    'Score',
                    'Custom rank',
                  ].map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.analysis.rows.map((row, i) => {
                  const selected = query.data!.rows.find(
                    (r) => r.playerId === row.playerId,
                  );
                  return (
                    <tr key={row.playerId}>
                      <td>{i + 1}</td>
                      <th scope="row">
                        <Link
                          to={`/players/${row.playerId}/insights?season=${selected?.season}`}
                        >
                          {selected?.player?.fullName ?? row.playerId} ·{' '}
                          {selected?.season}
                        </Link>
                      </th>
                      <td>{row.x}</td>
                      <td>{row.y}</td>
                      <td>{row.zX}</td>
                      <td>{row.zY}</td>
                      <td>{row.score}</td>
                      <td>{row.rank}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ResearchTable>
          {query.data.analysis.sample === 0 && (
            <p role="status">
              No qualifying seasons with both supported metric inputs. Change metrics or
              qualifiers.
            </p>
          )}
          <p>
            Descriptive Pearson correlation:{' '}
            {query.data.analysis.correlation === null
              ? 'Unavailable (needs at least 3 values with nonzero variance on both axes)'
              : query.data.analysis.correlation.toFixed(4)}
            . Correlation does not establish causation.
          </p>
          {query.data.analysis.excluded.length > 0 && (
            <ul>
              {query.data.analysis.excluded.map((row) => (
                <li key={row.playerId}>
                  NBA {row.playerId}: {row.reason}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <h2>Metric glossary and supported inputs</h2>
      <ul>
        <li>
          Season per-game and shooting ratios: sourced NBA season-summary conventions.
          Regular season only, traded total rows counted once.
        </li>
        <li>
          TS% estimate: PTS / [2 × (FGA + 0.44 × FTA)]. eFG%: (FGM + 0.5 × 3PM) / FGA.
          Raw aggregated attempts required; not averaged game percentages.
        </li>
        <li>
          AST/TO: raw assists / turnovers; zero turnovers is unavailable. Points per 36:
          36 × raw PTS / recorded minutes; zero minutes is unavailable.
        </li>
        <li>
          Raw totals are enabled for the live NBA provider. Local fixture averages are
          never expanded into invented attempts/totals.
        </li>
        <li>
          Usage, possessions, pace, per-100, league percentiles and lineup ratings are
          unsupported by this selected-cohort source.
        </li>
      </ul>
    </ResearchShell>
  );
}
