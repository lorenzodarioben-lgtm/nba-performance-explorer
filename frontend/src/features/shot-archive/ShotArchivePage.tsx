import { useRef, useState, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  ShotQuerySchema,
  ShotResponseSchema,
  ShotDirectorySchema,
  ShotZoneSchema,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import {
  ResearchShell,
  ResearchTable,
  SourceNote,
  QueryFeedback,
} from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';
import { shotPageCsv, shotSvgExport, downloadShotFile } from './shot-export';
import { ShotCourt, type ShotView } from './ShotCourt';
import { Segmented } from '../../ui/Segmented';
import { Slate } from '../../ui/Slate';
import { Icon } from '../../ui/Icon';
import type { TapeSpec } from '../../ui/Tape';

const SHOTS_TAPE: TapeSpec = {
  code: '18 PO',
  source: 'Kaggle · CC0',
  variant: 'partial',
};
const VIEWS: readonly { value: ShotView; label: string }[] = [
  { value: 'dots', label: 'Dots' },
  { value: 'density', label: 'Density' },
  { value: 'zones', label: 'Zones' },
];

function subscribeNarrow(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia('(max-width: 1023px)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
function useNarrow() {
  return useSyncExternalStore(
    subscribeNarrow,
    () =>
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 1023px)').matches,
    () => false,
  );
}
const ratio = (n: number | null) =>
  n === null ? 'Unavailable' : `${(n * 100).toFixed(1)}%`;
export function ShotArchivePage() {
  // Each court registers its own SVG under its group key, so an export always takes the
  // panel it belongs to (never "the n-th svg on the page").
  const courts = useRef(new Map<string, SVGSVGElement>());
  const [activeShot, setActiveShot] = useState<string | null>(null);
  const narrow = useNarrow();
  const [params, setParams] = useSearchParams();
  const apiParams = new URLSearchParams(params);
  apiParams.delete('view');
  const parsed = ShotQuerySchema.safeParse(Object.fromEntries(apiParams));
  const mode = params.get('view') ?? 'dots';
  const valid =
    parsed.success &&
    ['dots', 'density', 'zones'].includes(mode) &&
    [...params.keys()].every((k) => params.getAll(k).length === 1);
  const directory = useQuery({
    queryKey: ['research', 'shot-directory'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/shots/directory', signal, ShotDirectorySchema.parse),
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const query = useQuery({
    queryKey: ['research', 'shot-events', apiParams.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(`/api/shots?${apiParams}`, signal, ShotResponseSchema.parse),
    enabled: valid,
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined;
  const update = (key: string, value: string) => {
    const copy = new URLSearchParams(params);
    if (value) copy.set(key, value);
    else copy.delete(key);
    if (key !== 'page' && key !== 'view') copy.delete('page');
    setParams(copy);
  };
  const selections = params.get('players')?.split(',') ?? [];
  const choosePlayer = (index: number, value: string) => {
    const copy = [...selections];
    if (index === 0 && !value) {
      update('players', '');
      return;
    }
    copy[index] = value;
    update('players', copy.filter(Boolean).join(','));
  };
  const share = new URLSearchParams(params);
  share.set('season', '2017-18');
  share.set('scope', 'playoffs');
  const maxDensity = Math.max(
    1,
    ...(data?.groups.flatMap((group) => group.cells.map((cell) => cell.attempts)) ??
      []),
  );
  const active = data?.shots.find((shot) => shot.id === activeShot) ?? null;
  return (
    <ResearchShell title="Recorded shot studio">
      <p>
        Authentic field-goal events from part of the 2018 playoffs. Coverage ends June 3
        before the playoffs finished. Source zones, identities and coordinates are
        preserved; this is not a current/live/full-season or representative
        league-average dataset.
      </p>
      <p>
        <Link to="/explore">What&rsquo;s on tape</Link>
        <Link to="/leaders/recorded">Separate 2023–24 cohort leaders</Link>
      </p>
      {!valid ? (
        <p role="alert" className="notice notice--error">
          Invalid shot filters. Choose at most two different players, recorded 2017-18
          playoff scope and ordered date/distance bounds.
        </p>
      ) : (
        <QueryFeedback
          pending={query.isPending || directory.isPending}
          failed={query.isError || directory.isError}
        />
      )}
      <div className="studio">
        <details className="studio__rail" open={!narrow}>
          <summary>
            <Icon name="filter" size={16} />
            Filters
          </summary>
          <div className={`${styles.controls} studio__filters`}>
            <label>
              Recorded shot season
              <select
                value={params.get('season') ?? '2017-18'}
                onChange={(e) => update('season', e.target.value)}
              >
                {params.get('season') && params.get('season') !== '2017-18' && (
                  <option value={params.get('season')!}>Unsupported season</option>
                )}
                <option value="2017-18">2017–18 (partial playoffs)</option>
              </select>
            </label>
            <label>
              Recorded shot scope
              <select
                value={params.get('scope') ?? 'playoffs'}
                onChange={(e) => update('scope', e.target.value)}
              >
                {params.get('scope') && params.get('scope') !== 'playoffs' && (
                  <option value={params.get('scope')!}>Unsupported scope</option>
                )}
                <option value="playoffs">Playoffs</option>
              </select>
            </label>
            {[0, 1].map((i) => (
              <label key={i}>
                {i === 0 ? 'Shot player' : 'Compare shot player'}
                <select
                  value={selections[i] ?? ''}
                  disabled={i === 1 && !selections[0]}
                  onChange={(e) => choosePlayer(i, e.target.value)}
                >
                  <option value="">
                    {i === 0 ? 'All source players' : 'No comparison'}
                  </option>
                  {directory.data?.players.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      disabled={selections[1 - i] === p.id}
                    >
                      {p.name} · {p.attempts} source attempts
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              Shot team
              <select
                value={params.get('team') ?? ''}
                onChange={(e) => update('team', e.target.value)}
              >
                <option value="">All source teams</option>
                {directory.data?.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Shot opponent
              <select
                value={params.get('opponent') ?? ''}
                onChange={(e) => update('opponent', e.target.value)}
              >
                <option value="">All opponents</option>
                {directory.data?.teams.map((t) => (
                  <option key={t.id} value={t.abbreviation}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Recorded shot game
              <select
                value={params.get('game') ?? ''}
                onChange={(e) => update('game', e.target.value)}
              >
                <option value="">All recorded games</option>
                {directory.data?.games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.date} {g.away.abbreviation} at {g.home.abbreviation} · {g.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Shot zone
              <select
                value={params.get('zone') ?? ''}
                onChange={(e) => update('zone', e.target.value)}
              >
                <option value="">All source zones</option>
                {ShotZoneSchema.options.map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </label>
            <label>
              Shot type
              <select
                value={params.get('type') ?? ''}
                onChange={(e) => update('type', e.target.value)}
              >
                <option value="">All field goals</option>
                <option>2PT</option>
                <option>3PT</option>
              </select>
            </label>
            <label>
              Shot result
              <select
                value={params.get('result') ?? ''}
                onChange={(e) => update('result', e.target.value)}
              >
                <option value="">Makes and misses</option>
                <option value="made">Makes</option>
                <option value="missed">Misses</option>
              </select>
            </label>
            {(['from', 'to'] as const).map((k) => (
              <label key={k}>
                {k === 'from' ? 'Shot from date' : 'Shot to date'}
                <input
                  type="date"
                  value={params.get(k) ?? ''}
                  onChange={(e) => update(k, e.target.value)}
                />
              </label>
            ))}
            <label>
              Shot period
              <input
                type="number"
                min={1}
                max={10}
                value={params.get('period') ?? ''}
                onChange={(e) => update('period', e.target.value)}
                placeholder="All periods"
              />
            </label>
            {(['minDistance', 'maxDistance', 'minAttempts'] as const).map((k, i) => (
              <label key={k}>
                {
                  [
                    'Minimum shot distance (ft)',
                    'Maximum shot distance (ft)',
                    'Minimum attempts for ratios',
                  ][i]
                }
                <input
                  type="number"
                  min={i === 2 ? 1 : 0}
                  max={i === 2 ? 1000 : 90}
                  value={params.get(k) ?? (i === 0 ? '0' : i === 1 ? '90' : '10')}
                  onChange={(e) => update(k, e.target.value)}
                />
              </label>
            ))}
          </div>
        </details>
        <div className="studio__canvas">
          <div className="studio__bar">
            <Segmented
              label="Shot visualization"
              options={VIEWS}
              value={
                (VIEWS.some((view) => view.value === mode) ? mode : 'dots') as ShotView
              }
              onChange={(next) => update('view', next === 'dots' ? '' : next)}
            />
            {data ? (
              <button
                type="button"
                className="btn btn--sm"
                onClick={() =>
                  downloadShotFile(
                    shotPageCsv(data),
                    'text/csv;charset=utf-8',
                    `nba-recorded-2018-shots-page${data.page}.csv`,
                  )
                }
              >
                <Icon name="download" size={15} />
                Export current shot page CSV
              </button>
            ) : null}
          </div>
          {data ? (
            <>
              <p className="studio__mode">
                {mode === 'density'
                  ? 'Density uses every filtered located event, 5×5 foot cells; brighter means more attempts, not better shooting. All panels share the same count-to-shade scale.'
                  : mode === 'zones'
                    ? 'Zones shade each original source zone by its share of the panel’s attempts and label its FG%. Outlines are approximate drawings; no attempt is reassigned.'
                    : 'Dots show only the exact table page: filled chalk circles are makes; red crosses are misses. Hover a shot or a table row to link them.'}{' '}
                Identical basket-relative axes for every panel.
              </p>
              <div className="studio__panels" data-panels={data.groups.length}>
                {data.groups.map((g) => {
                  const key = g.playerId ?? 'all';
                  return (
                    <section
                      key={key}
                      className="studio__panel"
                      aria-label={`${g.label} shot summary`}
                    >
                      <div className="studio__panelhead">
                        <h2>{g.label}</h2>
                        <dl className="studio__stats">
                          <div>
                            <dt>Att</dt>
                            <dd>{g.attempts}</dd>
                          </div>
                          <div>
                            <dt>Makes</dt>
                            <dd>{g.makes}</dd>
                          </div>
                          <div>
                            <dt>FG</dt>
                            <dd>{ratio(g.fgPercentage)}</dd>
                          </div>
                          <div>
                            <dt>eFG</dt>
                            <dd>{ratio(g.efgPercentage)}</dd>
                          </div>
                          <div>
                            <dt>Pts/att</dt>
                            <dd>{g.pointsPerAttempt?.toFixed(3) ?? 'Unavailable'}</dd>
                          </div>
                        </dl>
                      </div>
                      <div className="studio__court">
                        <ShotCourt
                          view={mode as ShotView}
                          group={g}
                          shots={data.shots.filter(
                            (r) => !g.playerId || r.playerId === g.playerId,
                          )}
                          maxDensity={maxDensity}
                          activeShot={activeShot}
                          onActiveShot={setActiveShot}
                          title={g.label}
                          svgRef={(node) => {
                            if (node) courts.current.set(key, node);
                            else courts.current.delete(key);
                          }}
                        />
                      </div>
                      {mode === 'dots' &&
                      g.playerId &&
                      !data.shots.some((r) => r.playerId === g.playerId) ? (
                        <p className="studio__note studio__note--warn">
                          No {g.label} events on table page {data.page}. Dots follow the
                          exact table page; Density and Zones use every filtered
                          attempt.
                        </p>
                      ) : null}
                      <p className="studio__note">
                        {g.missingCoordinates} attempts withheld from geometry due to
                        missing coordinates. Ratios use at least {data.minAttempts}{' '}
                        attempts.
                      </p>
                      <button
                        type="button"
                        className="btn btn--sm btn--quiet"
                        onClick={() => {
                          const svg = courts.current.get(key);
                          if (svg)
                            downloadShotFile(
                              shotSvgExport(svg, data, g.label),
                              'image/svg+xml',
                              `nba-recorded-2018-shots-${g.playerId ?? 'filtered'}-${mode}.svg`,
                            );
                        }}
                      >
                        <Icon name="download" size={15} />
                        Export {g.label} plot SVG
                      </button>
                      <ResearchTable label={`${g.label} shot zones`}>
                        <table>
                          <caption>
                            Every filtered event by original source zone, before
                            pagination
                          </caption>
                          <thead>
                            <tr>
                              {[
                                'Zone',
                                'Attempts',
                                'Makes',
                                'FG',
                                'eFG',
                                'Points/attempt',
                              ].map((label) => (
                                <th scope="col" key={label}>
                                  {label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {g.zones.map((z) => (
                              <tr key={z.zone}>
                                <th scope="row">{z.zone}</th>
                                <td>{z.attempts}</td>
                                <td>{z.makes}</td>
                                <td>{ratio(z.fgPercentage)}</td>
                                <td>{ratio(z.efgPercentage)}</td>
                                <td>
                                  {z.pointsPerAttempt?.toFixed(3) ?? 'Unavailable'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </ResearchTable>
                      {mode === 'density' && (
                        <ResearchTable label={`${g.label} density values`}>
                          <table>
                            <caption>
                              All filtered 5×5 foot cells; exact values mirror density
                              plot
                            </caption>
                            <thead>
                              <tr>
                                {[
                                  'X from (ft)',
                                  'Y from (ft)',
                                  'Attempts',
                                  'Makes',
                                  'FG',
                                ].map((label) => (
                                  <th scope="col" key={label}>
                                    {label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {g.cells.map((c) => (
                                <tr key={`${c.x}:${c.y}`}>
                                  <td>{c.x}</td>
                                  <td>{c.y}</td>
                                  <td>{c.attempts}</td>
                                  <td>{c.makes}</td>
                                  <td>{ratio(c.fgPercentage)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ResearchTable>
                      )}
                    </section>
                  );
                })}
              </div>
              <div
                className={`studio__readout ${active ? 'is-active' : ''}`}
                aria-live="polite"
              >
                {active ? (
                  <>
                    <span
                      className={`studio__result ${active.made ? 'is-made' : 'is-miss'}`}
                    >
                      {active.made ? 'Made' : 'Missed'}
                    </span>
                    <b>{active.playerName}</b>
                    <span>
                      {active.type} · {active.zone} · {active.distanceFeet} ft
                    </span>
                    <span>
                      {active.date} · Q{active.period} {active.minutesRemaining}:
                      {String(active.secondsRemaining).padStart(2, '0')}
                    </span>
                    <span className="t-meta">
                      Raw {active.x ?? 'Unknown'} / {active.y ?? 'Unknown'}
                    </span>
                  </>
                ) : (
                  <span className="t-meta">Hover a shot or a row to read it</span>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          {params.get('result') && (
            <p>
              Result filter is active. Ratios describe only the selected make/miss
              subset; makes-only yields 100% FG by definition.
            </p>
          )}
          <p>
            {data.filteredAttempts} filtered attempts in {data.filteredGames} source
            games. Archive {data.sourceAttempts} attempts/{data.sourceGames} games/
            {data.sourcePlayers} players/{data.sourceTeams} teams, {data.sourceFrom} to{' '}
            {data.sourceTo}. No free throws or unseen game events are inferred.
          </p>
          <label>
            Shareable shot URL
            <input readOnly value={`${window.location.origin}/lab/shots?${share}`} />
          </label>
          <SaveResearchButton
            kind="analysis"
            label="Recorded 2018 playoff shot investigation"
            path={`/lab/shots?${share}`}
          />
          <p>
            {data.coordinateSystem}. {data.coordinateEvidence} Reference court 50×94
            feet; baseline 5.25 feet behind basket; source coordinates divided by 10 for
            feet.{' '}
            <a href="https://nbadb.w4w.dev/docs/guides/shot-chart-analysis">
              Coordinate orientation evidence
            </a>{' '}
            ·{' '}
            <a href="https://official.nba.com/rule-no-1-court-dimensions-equipment/">
              Court reference rules
            </a>
            . Source zones retained; court outlines do not recategorize attempts.
          </p>
          <Slate
            title="Exact event page"
            tapes={[SHOTS_TAPE]}
            meta={[
              `Page ${data.page}`,
              `${data.shots.length} of ${data.filteredAttempts}`,
            ]}
          />
          <p>
            Page {data.page}; {data.shots.length} of {data.filteredAttempts} filtered
            events. All plot dots correspond to these rows; summaries and density use
            all filtered rows.
          </p>
          <div className="studio__pager">
            <button
              disabled={data.page <= 1}
              onClick={() => update('page', String(data.page - 1))}
            >
              Previous shot page
            </button>
            <button
              disabled={data.page * data.pageSize >= data.filteredAttempts}
              onClick={() => update('page', String(data.page + 1))}
            >
              Next shot page
            </button>
          </div>
          {!data.shots.length ? (
            <p role="status">
              No shot events match this page/selection. Adjust filters or return to page
              1.
            </p>
          ) : (
            <ResearchTable label="Shot event exact values">
              <table>
                <caption>
                  Authentic shot IDs and raw coordinates; no generated attempts
                </caption>
                <thead>
                  <tr>
                    {[
                      'Shot/game ID',
                      'Player',
                      'Team',
                      'Date',
                      'Period/clock',
                      'Type/result',
                      'Zone',
                      'Distance(ft)',
                      'Raw X/Y',
                      'Action',
                    ].map((label) => (
                      <th scope="col" key={label}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.shots.map((r) => (
                    <tr
                      key={r.id}
                      className={activeShot === r.id ? 'is-hl' : undefined}
                      onPointerEnter={() => setActiveShot(r.id)}
                      onPointerLeave={() => setActiveShot(null)}
                      onFocus={() => setActiveShot(r.id)}
                    >
                      <th scope="row">
                        <a href={`https://www.nba.com/game/${r.gameId.slice(4)}`}>
                          {r.id}
                        </a>
                      </th>
                      <td>
                        <Link to={`/players/${r.playerId}`}>{r.playerName}</Link>
                      </td>
                      <td>{r.team.abbreviation}</td>
                      <td>{r.date}</td>
                      <td>
                        {r.period} · {r.minutesRemaining}:
                        {String(r.secondsRemaining).padStart(2, '0')}
                      </td>
                      <td>
                        {r.type} {r.made ? 'Made' : 'Missed'}
                      </td>
                      <td>
                        {r.zone} · {r.area}
                      </td>
                      <td>{r.distanceFeet}</td>
                      <td>
                        {r.x ?? 'Unknown'} / {r.y ?? 'Unknown'}
                      </td>
                      <td>{r.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResearchTable>
          )}
          <aside aria-label="Shot dataset attribution" className="source-note">
            <p>
              <a href={data.source.url}>{data.source.title}</a>, {data.source.creator},
              version {data.source.version},{' '}
              <a href={data.source.licenceUrl}>{data.source.licence}</a>. Updated{' '}
              {data.source.sourceUpdatedAt}; retrieved {data.source.retrievedAt}. Source
              CSV SHA256 {data.source.sha256}. Adapted into normalized event filters and
              derived summaries; original provenance {data.source.originalSource}.
            </p>
          </aside>
        </>
      )}
    </ResearchShell>
  );
}
