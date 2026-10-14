import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  RecordedAnalyticsQuerySchema,
  RecordedAnalyticsResponseSchema,
  ArchiveRankingMetricSchema,
  type Distribution,
  type RecordedAnalyticsResponse,
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
import { BarChart } from '../../charts/BarChart';
import { ScatterPlot } from '../../charts/ScatterPlot';
import styles from '../research/research.module.css';
function Histogram({ data, label }: { data: Distribution; label: string }) {
  const max = Math.max(1, ...data.bins.map((b) => b.count));
  return (
    <>
      <div
        className="panel frchart"
        data-chart={`histogram-${label}`}
        data-bins={max ? data.bins.length : 0}
      >
        <BarChart
          label={`${label} distribution: players per equal-width bin`}
          format={(value) => String(Math.round(value))}
          height={180}
          color="#3b82f6"
          data={data.bins.map((b, i) => ({
            key: String(i),
            label: `${b.from.toFixed(2)}–${b.to.toFixed(2)}`,
            value: b.count,
          }))}
          tickLabel={(datum) => datum.label.split('–')[0]}
        />
      </div>
      <ResearchTable label={`${label} histogram values`}>
        <table>
          <caption>
            {label} equal-width bins; last includes max; constant metric uses one bin
          </caption>
          <thead>
            <tr>
              <th scope="col">From</th>
              <th scope="col">To</th>
              <th scope="col">Count</th>
            </tr>
          </thead>
          <tbody>
            {data.bins.map((b, i) => (
              <tr key={i}>
                <td>{b.from.toFixed(4)}</td>
                <td>{b.to.toFixed(4)}</td>
                <td>{b.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResearchTable>
    </>
  );
}
function Scatter({ data }: { data: RecordedAnalyticsResponse }) {
  const precise = (value: number) =>
    Math.abs(value) < 1 ? value.toFixed(3) : value.toFixed(1);
  return (
    <div className="panel frchart" data-chart="recorded-scatter">
      <ScatterPlot
        label={`${data.y} against ${data.x} across the qualified group`}
        xLabel={`X: ${data.x}`}
        yLabel={`Y: ${data.y}`}
        formatX={precise}
        formatY={precise}
        points={data.rows.map((r) => ({
          id: r.playerId,
          x: r.x,
          y: r.y,
          label: `${r.name} · ${r.gamesPlayed} GP`,
          highlight: r.playerId === data.target,
        }))}
      />
      <p className="lchart__note">
        Red marks the target player when one is chosen. Correlation is descriptive, not
        causal.
      </p>
    </div>
  );
}
export function RecordedAnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const parsed = RecordedAnalyticsQuerySchema.safeParse(Object.fromEntries(params));
  const valid =
    parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const query = useQuery({
    queryKey: ['research', 'recorded-analytics', params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/analytics?${params}`,
        signal,
        RecordedAnalyticsResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined;
  const update = (key: string, value: string) => {
    const copy = new URLSearchParams(params);
    if (value) copy.set(key, value);
    else copy.delete(key);
    setParams(copy);
  };
  const share = new URLSearchParams(params);
  share.set('season', '2023-24');
  return (
    <ResearchShell title="Recorded cohort analytics">
      <p>
        Distributions, descriptive correlation and custom ranking over the supported
        common 2023–24 source cohort. This population excludes missing identities,
        unknown scope and unavailable trade/metric inputs; it is not a
        complete/current/official league population or an era model.
      </p>
      <Link to="/leaders/recorded">Inspect recorded ranking coverage</Link>{' '}
      <Link to="/lab/analytics">Selected-player analytics lab</Link>
      {!valid ? (
        <p role="alert">
          Invalid recorded analytics filters. Choose two different metrics and supported
          numeric controls.
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      <div className={styles.controls}>
        {(['x', 'y'] as const).map((key) => (
          <label key={key}>
            {key === 'x' ? 'Recorded X metric' : 'Recorded Y metric'}
            <select
              value={
                params.get(key) ?? (key === 'x' ? 'pointsPerGame' : 'reboundsPerGame')
              }
              onChange={(e) => update(key, e.target.value)}
            >
              {ArchiveRankingMetricSchema.options.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Recorded analytics scope
          <select
            value={params.get('scope') ?? 'regular-season'}
            onChange={(e) => update('scope', e.target.value)}
          >
            <option value="regular-season">Regular season</option>
            <option value="playoffs">Playoffs</option>
          </select>
        </label>
        <label>
          Recorded analytics minimum GP
          <input
            type="number"
            min={1}
            max={150}
            value={params.get('minGames') ?? '20'}
            onChange={(e) => update('minGames', e.target.value)}
          />
        </label>
        {(['weightX', 'weightY'] as const).map((key, i) => (
          <label key={key}>
            {i === 0 ? 'Recorded X weight' : 'Recorded Y weight'}
            <input
              type="number"
              min={-5}
              max={5}
              step={0.01}
              value={params.get(key) ?? '1'}
              onChange={(e) => update(key, e.target.value)}
            />
          </label>
        ))}
      </div>
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <p>
            Snapshot assembled {data.snapshotCreatedAt}. {data.sourceRows} scoped source
            rows; {data.unknownScopeRows} unknown-scope rows withheld. X-only eligible{' '}
            {data.singleMetricQualifiedX}; Y-only eligible {data.singleMetricQualifiedY}
            ; common paired cohort {data.rows.length}. All plots/ranks/percentile
            markers use that common denominator.
          </p>
          <label>
            Recorded target marker
            <select
              value={params.get('target') ?? ''}
              onChange={(e) => update('target', e.target.value)}
            >
              <option value="">No target marker</option>
              {params.get('target') && !data.targetAvailable && (
                <option value={params.get('target')!}>
                  {params.get('target')} (not jointly qualified)
                </option>
              )}
              {data.rows.map((r) => (
                <option key={r.playerId} value={r.playerId}>
                  {r.name} · {r.playerId}
                </option>
              ))}
            </select>
          </label>
          {data.target && !data.targetAvailable && (
            <p role="status">
              Target is absent from the qualifying source cohort. No zero value or
              marker is imputed.
            </p>
          )}
          <label>
            Shareable recorded analytics URL
            <input readOnly value={`${window.location.origin}/lab/recorded?${share}`} />
          </label>
          <SaveResearchButton
            kind="analysis"
            label="Recorded cohort distributions and ranking"
            path={`/lab/recorded?${share}`}
          />
          {!data.rows.length ? (
            <p role="status">
              No jointly supported source values. Change metrics or lower the explicit
              GP threshold.
            </p>
          ) : (
            <>
              <h2>Distributions and scatter</h2>
              <p>
                X mean {data.xDistribution.mean?.toFixed(4)}, SD{' '}
                {data.xDistribution.standardDeviation?.toFixed(4)}, Q25/median/Q75{' '}
                {data.xDistribution.q25?.toFixed(4)} /{' '}
                {data.xDistribution.median?.toFixed(4)} /{' '}
                {data.xDistribution.q75?.toFixed(4)}. Y mean{' '}
                {data.yDistribution.mean?.toFixed(4)}, SD{' '}
                {data.yDistribution.standardDeviation?.toFixed(4)}. Population SD;
                quantiles interpolate at(n−1)×p.
              </p>
              <Histogram data={data.xDistribution} label={data.x} />
              <Histogram data={data.yDistribution} label={data.y} />
              <Scatter data={data} />
              <p>
                Descriptive Pearson correlation:{' '}
                {data.correlation === null
                  ? 'Unavailable (fewer than3 pairs or constant axis)'
                  : data.correlation.toFixed(4)}
                . Correlation does not establish causation. Target has a larger marker
                and is identified explicitly in the equivalent table.
              </p>
              <h2>Custom common-cohort ranking</h2>
              <p>
                Score = {data.weightX}×z(X) + {data.weightY}×z(Y);
                z=(value−mean)/populationSD. Constant axis z=0; negative weights favor
                lower values; six-decimal scores define tied competition ranks. Axis
                percentiles use100×(lower+0.5×equal)/common cohort size.
              </p>
              <ResearchTable label="Recorded analytics exact values">
                <table>
                  <caption>
                    {data.rows.length} source-supported pairs; exact values mirror all
                    plotted dots
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
                        'Score',
                        'X percentile',
                        'Y percentile',
                        'Target',
                      ].map((s) => (
                        <th key={s} scope="col">
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
                        <td>{r.score.toFixed(6)}</td>
                        <td>{r.xPercentile.toFixed(2)}</td>
                        <td>{r.yPercentile.toFixed(2)}</td>
                        <td>{r.playerId === data.target ? 'Selected target' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResearchTable>
            </>
          )}
          <details>
            <summary>Source revisions, contributors and licences</summary>
            {data.attributions.map((a) => (
              <WikiAttribution key={a.revision} data={a} />
            ))}
          </details>
        </>
      )}
    </ResearchShell>
  );
}
