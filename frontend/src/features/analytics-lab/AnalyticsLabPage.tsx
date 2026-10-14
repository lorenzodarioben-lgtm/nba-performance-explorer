import { useState } from 'react';
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
import { ScatterPlot } from '../../charts/ScatterPlot';
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

function Scatter({
  data,
  selected,
  onBrush,
}: {
  data: CohortResponse;
  selected: ReadonlySet<string>;
  onBrush: (ids: readonly string[]) => void;
}) {
  const rows = data.analysis.rows;
  if (rows.length === 0) return null;
  const precise = (value: number) =>
    Math.abs(value) < 1 ? value.toFixed(3) : value.toFixed(1);
  return (
    <div className="panel frchart" data-chart="cohort-scatter">
      <ScatterPlot
        label={`${data.analysis.y} against ${data.analysis.x} for the selected player-seasons`}
        xLabel={`X: ${data.analysis.x}`}
        yLabel={`Y: ${data.analysis.y}`}
        formatX={precise}
        formatY={precise}
        selected={selected}
        onBrush={onBrush}
        points={rows.map((row, index) => {
          const source = data.rows.find((r) => r.playerId === row.playerId);
          return {
            id: row.playerId,
            x: row.x,
            y: row.y,
            tag: String(index + 1),
            label: `${index + 1}. ${source?.player?.fullName ?? row.playerId} · ${source?.season ?? ''}`,
          };
        })}
      />
      <p className="lchart__note">
        Numbers match the table rows. Drag across the chart to select a group; Escape
        clears.
      </p>
    </div>
  );
}

export function AnalyticsLabPage() {
  const [params, setParams] = useSearchParams();
  const [brushed, setBrushed] = useState<ReadonlySet<string>>(() => new Set());
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
      <Link to={`/discover${base.size ? `?${base}` : ''}`}>
        Discover similar selected seasons
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
          <Scatter
            data={query.data}
            selected={brushed}
            onBrush={(ids) => setBrushed(new Set(ids))}
          />
          {brushed.size ? (
            <p className="brushnote" role="status">
              {brushed.size} of {query.data.analysis.rows.length} points selected; their
              table rows are highlighted.{' '}
              <button type="button" onClick={() => setBrushed(new Set())}>
                Clear selection
              </button>
            </p>
          ) : null}
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
                    <tr
                      key={row.playerId}
                      className={brushed.has(row.playerId) ? 'is-hl' : undefined}
                    >
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
