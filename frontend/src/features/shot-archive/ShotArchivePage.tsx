import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  ShotQuerySchema,
  ShotResponseSchema,
  ShotDirectorySchema,
  ShotZoneSchema,
  type ShotAttempt,
  type ShotResponse,
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
const ratio = (n: number | null) =>
  n === null ? 'Unavailable' : `${(n * 100).toFixed(1)}%`;
// Fixed basket frame includes the full range of genuine long heaves; identical axes for both players.
function ShotPlot({
  shots,
  cells,
  mode,
  maxDensity,
}: {
  shots: readonly ShotAttempt[];
  cells: ShotResponse['groups'][number]['cells'];
  mode: string;
  maxDensity: number;
}) {
  return (
    <svg
      viewBox="-270 -900 540 990"
      aria-hidden="true"
      style={{ width: '100%', maxWidth: 380, height: 'auto' }}
    >
      <g transform="scale(1,-1)">
        <rect
          x={-250}
          y={-52.5}
          width={500}
          height={940}
          fill="none"
          stroke="#71717a"
          strokeWidth={2}
        />
        <path d="M-250 417.5 H250" stroke="#71717a" strokeDasharray="8 8" fill="none" />
        <circle cx={0} cy={0} r={7.5} fill="none" stroke="#52525b" strokeWidth={2} />
        {mode === 'density'
          ? cells.map((c) => (
              <rect
                key={`${c.x}:${c.y}`}
                x={c.x * 10}
                y={c.y * 10}
                width={50}
                height={50}
                fill="#1d4ed8"
                opacity={0.1 + (0.8 * c.attempts) / maxDensity}
              >
                <title>
                  {c.x} to {c.x + 5}ft X; {c.y} to {c.y + 5}ft Y: {c.attempts} attempts
                </title>
              </rect>
            ))
          : shots
              .filter((r) => r.x !== null && r.y !== null)
              .map((r) =>
                r.made ? (
                  <circle key={r.id} cx={r.x!} cy={r.y!} r={3.5} fill="#166534">
                    <title>{r.id}: made</title>
                  </circle>
                ) : (
                  <path
                    key={r.id}
                    d={`M${r.x! - 3},${r.y! - 3} l6,6 m-6,0 l6,-6`}
                    stroke="#991b1b"
                    strokeWidth={1.8}
                  >
                    <title>{r.id}: missed</title>
                  </path>
                ),
              )}
      </g>
      <text x={-245} y={75} fontSize={15}>
        X: −25 to +25 ft; basket(0,0); Y toward opposite end
      </text>
    </svg>
  );
}
export function ShotArchivePage() {
  const plots = useRef<HTMLDivElement>(null);
  const [params, setParams] = useSearchParams();
  const apiParams = new URLSearchParams(params);
  apiParams.delete('view');
  const parsed = ShotQuerySchema.safeParse(Object.fromEntries(apiParams));
  const mode = params.get('view') ?? 'dots';
  const valid =
    parsed.success &&
    ['dots', 'density'].includes(mode) &&
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
  return (
    <ResearchShell title="Recorded shot studio">
      <p>
        Authentic field-goal events from part of the 2018 playoffs. Coverage ends June3
        before the playoffs finished. Source zones, identities and coordinates are
        preserved; this is not a current/live/full-season or representative
        league-average dataset.
      </p>
      <p>
        <Link to="/explore">Explorer</Link> ·{' '}
        <Link to="/leaders/recorded">Separate2023–24 cohort leaders</Link>
      </p>
      {!valid ? (
        <p role="alert">
          Invalid shot filters. Choose at most two different players, recorded2017-18
          playoff scope and ordered date/distance bounds.
        </p>
      ) : (
        <QueryFeedback
          pending={query.isPending || directory.isPending}
          failed={query.isError || directory.isError}
        />
      )}
      <div className={styles.controls}>
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
                <option key={p.id} value={p.id} disabled={selections[1 - i] === p.id}>
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
        <label>
          Shot visualization
          <select value={mode} onChange={(e) => update('view', e.target.value)}>
            <option value="dots">Page make/miss events</option>
            <option value="density">All filtered coordinate density</option>
          </select>
        </label>
      </div>
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          {params.get('result') && (
            <p>
              Result filter is active. Ratios describe only the selected make/miss
              subset; makes-only yields100% FG by definition.
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
            label="Recorded2018 playoff shot investigation"
            path={`/lab/shots?${share}`}
          />
          <p>
            {data.coordinateSystem}. {data.coordinateEvidence} Reference court50×94feet;
            baseline5.25feet behind basket; source coordinates divided by10 for feet.{' '}
            <a href="https://nbadb.w4w.dev/docs/guides/shot-chart-analysis">
              Coordinate orientation evidence
            </a>{' '}
            ·{' '}
            <a href="https://official.nba.com/rule-no-1-court-dimensions-equipment/">
              Court reference rules
            </a>
            . Source zones retained; court outlines do not recategorize attempts.
          </p>
          <p>
            {mode === 'density'
              ? 'Density uses every filtered located event,5×5foot cells; darker means more attempts, not better shooting. Both panels share the same count-to-opacity scale.'
              : 'Dots show only the exact table page: green filled circles are makes; red crosses are misses. Long heaves remain visible.'}{' '}
            Identical basket-relative axes for both players.
          </p>
          <button
            onClick={() =>
              downloadShotFile(
                shotPageCsv(data),
                'text/csv;charset=utf-8',
                `nba-recorded-2018-shots-page${data.page}.csv`,
              )
            }
          >
            Export current shot page CSV
          </button>
          <div ref={plots}>
            {data.groups.map((g, index) => (
              <section key={g.playerId ?? 'all'} aria-label={`${g.label} shot summary`}>
                <h2>{g.label}</h2>
                <p>
                  {g.attempts} attempts, {g.makes} makes; FG {ratio(g.fgPercentage)},
                  eFG {ratio(g.efgPercentage)}, points/attempt{' '}
                  {g.pointsPerAttempt?.toFixed(3) ?? 'Unavailable'}.{' '}
                  {g.missingCoordinates} attempts withheld from geometry due to missing
                  coordinates. Ratios use at least{data.minAttempts} attempts.
                </p>
                <ShotPlot
                  mode={mode}
                  maxDensity={Math.max(
                    1,
                    ...data.groups.flatMap((g) => g.cells.map((c) => c.attempts)),
                  )}
                  cells={g.cells}
                  shots={data.shots.filter(
                    (r) => !g.playerId || r.playerId === g.playerId,
                  )}
                />
                <button
                  onClick={() => {
                    const svg = plots.current?.querySelectorAll('svg')[index];
                    if (svg)
                      downloadShotFile(
                        shotSvgExport(svg, data, g.label),
                        'image/svg+xml',
                        `nba-recorded-2018-shots-${g.playerId ?? 'filtered'}-${mode}.svg`,
                      );
                  }}
                >
                  Export {g.label} plot SVG
                </button>
                <ResearchTable label={`${g.label} shot zones`}>
                  <table>
                    <caption>
                      Every filtered event by original source zone, before pagination
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
                        ].map((s) => (
                          <th scope="col" key={s}>
                            {s}
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
                          <td>{z.pointsPerAttempt?.toFixed(3) ?? 'Unavailable'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ResearchTable>
                {mode === 'density' && (
                  <ResearchTable label={`${g.label} density values`}>
                    <table>
                      <caption>
                        All filtered5×5foot cells; exact values mirror density plot
                      </caption>
                      <thead>
                        <tr>
                          {[
                            'X from (ft)',
                            'Y from (ft)',
                            'Attempts',
                            'Makes',
                            'FG',
                          ].map((s) => (
                            <th scope="col" key={s}>
                              {s}
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
            ))}
          </div>
          <h2>Exact event page</h2>
          <p>
            Page{data.page}; {data.shots.length} of{data.filteredAttempts} filtered
            events. All plot dots correspond to these rows; summaries and density use
            all filtered rows.
          </p>
          <button
            disabled={data.page <= 1}
            onClick={() => update('page', String(data.page - 1))}
          >
            Previous shot page
          </button>{' '}
          <button
            disabled={data.page * data.pageSize >= data.filteredAttempts}
            onClick={() => update('page', String(data.page + 1))}
          >
            Next shot page
          </button>
          {!data.shots.length ? (
            <p role="status">
              No shot events match this page/selection. Adjust filters or return to
              page1.
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
                    ].map((s) => (
                      <th scope="col" key={s}>
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.shots.map((r) => (
                    <tr key={r.id}>
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
          <aside aria-label="Shot dataset attribution">
            <p>
              <a href={data.source.url}>{data.source.title}</a>, {data.source.creator},
              version{data.source.version},{' '}
              <a href={data.source.licenceUrl}>{data.source.licence}</a>. Updated
              {data.source.sourceUpdatedAt}; retrieved{data.source.retrievedAt}. Source
              CSV SHA256{data.source.sha256}. Adapted into normalized event filters and
              derived summaries; original provenance{data.source.originalSource}.
            </p>
          </aside>
        </>
      )}
    </ResearchShell>
  );
}
