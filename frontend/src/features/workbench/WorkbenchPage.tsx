import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  RecordedDirectorySchema,
  WorkbenchResponseSchema,
  type WorkbenchResponse,
  type WorkbenchRow,
} from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import {
  QueryFeedback,
  ResearchShell,
  ResearchTable,
  SourceNote,
} from '../research/ResearchShell';
import { SavedViews } from '../my-nba/SavedViews';
import { downloadShotFile } from '../shot-archive/shot-export';
import { BarChart } from '../../charts/BarChart';
import { RankBars } from '../../charts/RankBars';
import { ScatterPlot } from '../../charts/ScatterPlot';
import { Icon } from '../../ui/Icon';
import { Segmented } from '../../ui/Segmented';
import { Slate } from '../../ui/Slate';
import { SpreadStrip } from './SpreadStrip';
import { TrendOutliers } from './TrendOutliers';
import {
  PLAYER_METRICS,
  TEAM_METRICS,
  formatValue,
  metricLabel,
  readWorkbenchState,
  workbenchCsv,
} from './workbench-config';

const VIEWS = [
  { value: 'rank', label: 'Ranked' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'relationship', label: 'Relationship' },
] as const;
const TABLE_PAGE = 50;
/** Rows needed so a picked entity is always visible in the table. */
const pickedIndexLimit = (rows: readonly WorkbenchRow[], pick: string | null) =>
  pick ? rows.findIndex((r) => r.id === pick) + 1 : 0;
const TAPES = [
  { code: 'ARCHIVE', source: 'WIKIPEDIA · CC BY-SA', variant: 'archive' as const },
  { code: 'COHORT MATHS', variant: 'derived' as const },
];

export function WorkbenchPage() {
  const [params, setParams] = useSearchParams();
  const state = readWorkbenchState(params);
  const q = state.query;
  const query = useQuery({
    queryKey: ['research', 'workbench', state.api.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/workbench?${state.api}`,
        signal,
        WorkbenchResponseSchema.parse,
      ),
    enabled: state.valid,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const directory = useQuery({
    queryKey: ['research', 'recorded-directory'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/recorded/directory', signal, RecordedDirectorySchema.parse),
    retry: false,
    staleTime: 24 * 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  /** Updates the URL; changing the question (not the pick) clears an outdated pick. */
  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { replace: Object.keys(patch).every((k) => k === 'pick') });
  };
  const entity = q?.entity ?? 'players';
  const data = state.valid ? query.data : undefined;
  return (
    <ResearchShell
      title="Research workbench"
      lede={
        <p>
          Ask your own question of the recorded 2023–24 archive: pick players or teams
          and a metric, then rank it, see its distribution or test it against a second
          metric. Every number is computed over a cohort you can see, with every
          exclusion counted.
        </p>
      }
    >
      <section className="wb-deck" aria-label="Research question">
        <div className="wb-deck__row">
          <Segmented
            label="Population"
            options={[
              { value: 'players', label: 'Players' },
              { value: 'teams', label: 'Teams' },
            ]}
            value={entity}
            onChange={(value) =>
              setParams(
                value === 'players' ? {} : { entity: 'teams', metric: 'winPercentage' },
              )
            }
          />
          <Segmented
            label="Question"
            options={VIEWS}
            value={q?.view ?? 'rank'}
            onChange={(value) =>
              update({
                view: value === 'rank' ? null : value,
                y:
                  value === 'relationship'
                    ? (q?.y ??
                      (entity === 'players'
                        ? q?.metric === 'assistsPerGame'
                          ? 'pointsPerGame'
                          : 'assistsPerGame'
                        : q?.metric === 'marginPerGame'
                          ? 'winPercentage'
                          : 'marginPerGame'))
                    : null,
                pick: null,
              })
            }
          />
        </div>
        <div className="wb-deck__row">
          <MetricSelect
            label={q?.view === 'relationship' ? 'Across (x)' : 'Metric'}
            entity={entity}
            value={q?.metric ?? 'pointsPerGame'}
            exclude={q?.y}
            onChange={(value) => update({ metric: value, pick: null })}
          />
          {q?.view === 'relationship' ? (
            <MetricSelect
              label="Up (y)"
              entity={entity}
              value={q.y ?? ''}
              exclude={q.metric}
              onChange={(value) => update({ y: value, pick: null })}
            />
          ) : null}
          <label className="wb-field">
            {entity === 'players'
              ? 'Minimum games played'
              : 'Minimum games behind value'}
            <input
              type="number"
              min={1}
              max={82}
              value={q?.minGames ?? (entity === 'players' ? 20 : 5)}
              onChange={(e) => update({ minGames: e.target.value })}
            />
          </label>
          {q?.view === 'rank' ? (
            <label className="wb-field">
              Order
              <select
                value={q.order}
                onChange={(e) =>
                  update({ order: e.target.value === 'desc' ? null : e.target.value })
                }
              >
                <option value="desc">Highest first</option>
                <option value="asc">Lowest first</option>
              </select>
            </label>
          ) : null}
          {entity === 'players' ? (
            <label className="wb-field">
              Team
              <select
                value={q?.team ?? ''}
                onChange={(e) => update({ team: e.target.value || null, pick: null })}
              >
                <option value="">All teams</option>
                {directory.data?.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="wb-field">
              Conference
              <select
                value={q?.conference ?? ''}
                onChange={(e) =>
                  update({ conference: e.target.value || null, pick: null })
                }
              >
                <option value="">Both conferences</option>
                <option value="East">East</option>
                <option value="West">West</option>
              </select>
            </label>
          )}
        </div>
      </section>
      {!state.valid ? (
        <p role="alert">
          This research question is not supported.{' '}
          <Link to="/lab/workbench">Start a new question</Link>.
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {data && q ? (
        <Results
          data={data}
          pick={state.pick}
          onPick={(id) => update({ pick: id === state.pick ? null : id })}
          updating={query.isPlaceholderData}
          sharePath={`/lab/workbench${params.size ? `?${params}` : ''}`}
        />
      ) : null}
    </ResearchShell>
  );
}

function MetricSelect({
  label,
  entity,
  value,
  exclude,
  onChange,
}: {
  label: string;
  entity: 'players' | 'teams';
  value: string;
  exclude?: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <label className="wb-field wb-field--wide">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {(entity === 'players' ? PLAYER_METRICS : TEAM_METRICS).map((group) => (
          <optgroup key={group.group} label={group.group}>
            {group.items.map(([key, text]) => (
              <option key={key} value={key} disabled={key === exclude}>
                {text}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function Results({
  data,
  pick,
  onPick,
  updating,
  sharePath,
}: {
  data: WorkbenchResponse;
  pick: string | null;
  onPick: (id: string) => void;
  updating: boolean;
  sharePath: string;
}) {
  // Chart-driven table filters: a histogram bin or a brushed region of the scatter.
  const [bin, setBin] = useState<number | null>(null);
  const [brushed, setBrushed] = useState<ReadonlySet<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [tableLimit, setTableLimit] = useState(TABLE_PAGE);
  const key = `${data.entity}:${data.view}:${data.metric.key}:${data.y?.key ?? ''}:${data.minGames}`;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setBin(null);
    setBrushed(new Set());
    setShowAll(false);
    setTableLimit(TABLE_PAGE);
  }
  const picked = data.rows.find((r) => r.id === pick) ?? null;
  const fmt = (v: number | null) => formatValue(data.metric, v);
  const fmtY = (v: number | null) => (data.y ? formatValue(data.y, v) : '—');
  const binOf = (x: number) => {
    const i = data.bins.findIndex(
      (b, n) => x >= b.from && (x < b.to || n === data.bins.length - 1),
    );
    return i;
  };
  const tableRows = useMemo(() => {
    if (data.view === 'distribution' && bin !== null)
      return data.rows.filter((r) => binOf(r.x) === bin);
    if (data.view === 'relationship' && brushed.size)
      return data.rows.filter((r) => brushed.has(r.id));
    return data.rows;
    // binOf depends only on data.bins
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, bin, brushed]);
  const filtered = tableRows.length !== data.rows.length;
  const rankRows = showAll ? data.rows : data.rows.slice(0, 25);
  const fit =
    data.relationship?.slope != null &&
    data.relationship.intercept != null &&
    data.summary.min != null
      ? {
          x1: data.summary.min,
          y1: data.relationship.intercept + data.relationship.slope * data.summary.min,
          x2: data.summary.max!,
          y2: data.relationship.intercept + data.relationship.slope * data.summary.max!,
        }
      : null;
  return (
    <>
      <section
        className="pmod wb-results"
        aria-labelledby="wb-answer"
        data-updating={updating || undefined}
      >
        <Slate
          id="wb-answer"
          title={
            data.view === 'relationship' && data.y
              ? `${data.metric.label} against ${data.y.label}`
              : data.view === 'distribution'
                ? `How ${data.metric.label.toLowerCase()} is spread`
                : `${data.metric.label}, ranked`
          }
          tapes={TAPES}
          meta={[`${data.rows.length} in the cohort`, `${data.minGames}+ games`]}
        />
        <p className="wb-cohort">
          <b>Cohort:</b> {data.cohort}.{' '}
          {data.excluded.length ? (
            <>
              Excluded:{' '}
              {data.excluded.map((e, i) => (
                <span key={e.reason} className="wb-excl">
                  {i ? ' · ' : ''}
                  {e.reason} <b>{e.count}</b>
                </span>
              ))}
              .
            </>
          ) : (
            'Nothing excluded.'
          )}
        </p>
        <dl className="statgrid wb-stats">
          <div className="statgrid__cell">
            <dt>Cohort</dt>
            <dd>{data.summary.n}</dd>
          </div>
          <div className="statgrid__cell">
            <dt>Mean</dt>
            <dd>{fmt(data.summary.mean)}</dd>
          </div>
          <div className="statgrid__cell">
            <dt>Median</dt>
            <dd>{fmt(data.summary.median)}</dd>
          </div>
          <div className="statgrid__cell">
            <dt>Range</dt>
            <dd>
              {fmt(data.summary.min)} – {fmt(data.summary.max)}
            </dd>
          </div>
          {data.relationship ? (
            <div className="statgrid__cell">
              <dt>Correlation (r)</dt>
              <dd>{data.relationship.pearson?.toFixed(2) ?? '—'}</dd>
            </div>
          ) : (
            <div className="statgrid__cell">
              <dt>Std deviation</dt>
              <dd>
                {data.summary.sd === null
                  ? '—'
                  : fmt(data.summary.sd).replace(/^[+−]/, '')}
              </dd>
            </div>
          )}
        </dl>
        {data.rows.length === 0 ? (
          <p className="pmod__empty">
            No one meets this question’s rules. Lower the games minimum or pick another
            metric.
          </p>
        ) : (
          <div className="wb-stage">
            <div className="wb-chart">
              {data.view === 'rank' ? (
                <>
                  <RankBars
                    label={`${data.metric.label} ranking`}
                    rows={rankRows.map((r) => ({
                      key: r.id,
                      label: (
                        <span>
                          <b className="wb-rank">{r.rank}</b> {r.label}{' '}
                          <small>{r.teams.join('/')}</small>
                        </span>
                      ),
                      value: r.x,
                      display: fmt(r.x),
                      highlight: r.id === pick,
                    }))}
                  />
                  {data.rows.length > 25 ? (
                    <button
                      type="button"
                      className="btn btn--sm btn--quiet"
                      onClick={() => setShowAll((v) => !v)}
                    >
                      {showAll ? 'Show the top 25' : `Show all ${data.rows.length}`}
                    </button>
                  ) : null}
                </>
              ) : data.view === 'distribution' ? (
                <>
                  <BarChart
                    data={data.bins.map((b, i) => ({
                      key: String(i),
                      label: `${fmt(b.from)} to ${fmt(b.to)}`,
                      value: b.count,
                      tone: picked && binOf(picked.x) === i ? 'accent' : 'default',
                      dimmed: bin !== null && bin !== i,
                      detail: [
                        {
                          label: data.entity === 'players' ? 'Players' : 'Teams',
                          value: String(b.count),
                        },
                      ],
                    }))}
                    label={`Distribution of ${data.metric.label}`}
                    format={(v) => String(Math.round(v))}
                    height={240}
                    selected={bin}
                    onSelect={(i) => setBin(bin === i ? null : i)}
                    tickLabel={(_, i) => fmt(data.bins[i]!.from)}
                  />
                  <SpreadStrip
                    summary={data.summary}
                    format={fmt}
                    marker={picked ? { value: picked.x, label: picked.label } : null}
                  />
                  <p className="lchart__note">
                    Choose a bar to list only that range in the table. Equal-width bins
                    from the cohort minimum to maximum; the strip shows the quartiles
                    and the mean.
                  </p>
                </>
              ) : (
                <>
                  <ScatterPlot
                    points={data.rows.map((r) => ({
                      id: r.id,
                      x: r.x,
                      y: r.y!,
                      label: r.label,
                      highlight: r.id === pick,
                      tag: r.id === pick ? r.label : undefined,
                    }))}
                    label={`${data.metric.label} against ${data.y!.label}`}
                    xLabel={data.metric.label}
                    yLabel={data.y!.label}
                    formatX={fmt}
                    formatY={fmtY}
                    height={420}
                    onBrush={(ids) => setBrushed(new Set(ids))}
                    selected={brushed}
                    onPick={onPick}
                    fitLine={fit}
                  />
                  <p className="lchart__note">
                    Click or press Enter on a point to open it; drag a rectangle to list
                    only those entities in the table. The dashed line is the
                    least-squares fit of
                    {` ${data.y!.label.toLowerCase()} on ${data.metric.label.toLowerCase()}`}{' '}
                    (r = {data.relationship?.pearson?.toFixed(2) ?? '—'}, n ={' '}
                    {data.relationship?.n ?? data.rows.length}): a description of this
                    cohort, not a cause.
                  </p>
                  <TrendOutliers data={data} pick={pick} onPick={onPick} />
                </>
              )}
            </div>
            <aside className="wb-pick" aria-live="polite" aria-label="Selected">
              {picked ? (
                <PickedCard row={picked} data={data} total={data.rows.length} />
              ) : (
                <p className="wb-pick__hint">
                  Choose a {data.entity === 'players' ? 'player' : 'team'} in the chart
                  or the table to see its exact values and where it ranks.
                </p>
              )}
            </aside>
          </div>
        )}
      </section>

      <section className="pmod" aria-labelledby="wb-table">
        <Slate
          id="wb-table"
          title="Exact values"
          tapes={[TAPES[1]!]}
          meta={[
            filtered
              ? `${tableRows.length} of ${data.rows.length} shown`
              : `${data.rows.length} rows`,
          ]}
          actions={
            filtered ? (
              <button
                type="button"
                className="btn btn--sm btn--quiet"
                onClick={() => {
                  setBin(null);
                  setBrushed(new Set());
                }}
              >
                Show every row
              </button>
            ) : undefined
          }
        />
        <ResearchTable label="Workbench exact values">
          <table>
            <caption>
              {data.metric.label}: {data.metric.definition}
            </caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">{data.entity === 'players' ? 'Player' : 'Team'}</th>
                <th scope="col">Games</th>
                <th scope="col">{data.metric.label}</th>
                {data.y ? <th scope="col">{data.y.label}</th> : null}
                <th scope="col">Percentile</th>
                <th scope="col">z</th>
              </tr>
            </thead>
            <tbody>
              {tableRows
                .slice(0, Math.max(tableLimit, pickedIndexLimit(tableRows, pick)))
                .map((r) => (
                  <tr key={r.id} className={r.id === pick ? 'is-picked' : undefined}>
                    <td>{r.rank}</td>
                    <th scope="row">
                      <button
                        type="button"
                        className="reset wb-rowpick"
                        aria-pressed={r.id === pick}
                        onClick={() => onPick(r.id)}
                      >
                        {r.label}
                      </button>{' '}
                      <small>{r.teams.join('/')}</small>
                    </th>
                    <td>{r.sample}</td>
                    <td>{fmt(r.x)}</td>
                    {data.y ? <td>{fmtY(r.y)}</td> : null}
                    <td>{r.percentile.toFixed(1)}</td>
                    <td>{r.zX.toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </ResearchTable>
        {tableRows.length > tableLimit ? (
          <button
            type="button"
            className="btn btn--sm btn--quiet wb-more"
            onClick={() => setTableLimit((n) => n + TABLE_PAGE)}
          >
            Show {Math.min(TABLE_PAGE, tableRows.length - tableLimit)} more of{' '}
            {tableRows.length}
          </button>
        ) : null}
        <div className="wb-actions">
          <button
            type="button"
            className="btn btn--sm"
            onClick={() =>
              downloadShotFile(
                workbenchCsv(data),
                'text/csv;charset=utf-8',
                `nba-workbench-${data.entity}-${data.metric.key}${data.y ? `-vs-${data.y.key}` : ''}.csv`,
              )
            }
          >
            <Icon name="download" size={15} />
            Export cohort CSV
          </button>
          <label className="wb-share">
            Shareable question URL
            <input
              readOnly
              value={`${window.location.origin}${sharePath}`}
              onFocus={(e) => e.target.select()}
            />
          </label>
        </div>
        <SavedViews
          path={sharePath}
          prefix="/lab/workbench"
          title="Saved research questions"
          placeholder={`e.g. ${metricLabel(data.entity, data.metric.key)} leaders`}
        />
        <SourceNote provenance={data.provenance} />
      </section>
    </>
  );
}

function PickedCard({
  row,
  data,
  total,
}: {
  row: WorkbenchRow;
  data: WorkbenchResponse;
  total: number;
}) {
  return (
    <div className="wb-card">
      <span className="wb-card__kicker">
        {row.teams.join(' / ')} · {row.sample} games
      </span>
      <b className="wb-card__name">{row.label}</b>
      <dl className="wb-card__facts">
        <div>
          <dt>{data.metric.label}</dt>
          <dd>{formatValue(data.metric, row.x)}</dd>
        </div>
        {data.y ? (
          <div>
            <dt>{data.y.label}</dt>
            <dd>{formatValue(data.y, row.y)}</dd>
          </div>
        ) : null}
        <div>
          <dt>Rank</dt>
          <dd>
            {row.rank} of {total}
          </dd>
        </div>
        <div>
          <dt>Percentile</dt>
          <dd>{row.percentile.toFixed(0)}</dd>
        </div>
      </dl>
      <p className="wb-card__z">
        {Math.abs(row.zX) < 0.05
          ? 'At the cohort mean.'
          : `${Math.abs(row.zX).toFixed(2)} standard deviations ${row.zX > 0 ? 'above' : 'below'} the cohort mean.`}
      </p>
      <span className="wb-card__links">
        <Link to={row.href}>
          {data.entity === 'players' ? 'Recorded season' : 'Team season'}
        </Link>
        {data.entity === 'players' ? (
          <Link to={`/lab/profiles?players=${row.id}`}>Percentile profile</Link>
        ) : (
          <Link to={`/standings/race?team=${row.id}`}>Standings race</Link>
        )}
      </span>
    </div>
  );
}
