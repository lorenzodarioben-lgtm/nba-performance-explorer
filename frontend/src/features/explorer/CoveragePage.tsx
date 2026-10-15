import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  CareerResearchResponseSchema,
  CoverageResponseSchema,
  ResearchPlayerIdSchema,
  type CoverageDataset,
  type CoverageResponse,
} from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import { QueryFeedback, ResearchShell, ResearchTable } from '../research/ResearchShell';
import { LeagueCoverageSections } from '../league/LeagueCoverageSections';
import { PlayerCombobox } from '../player-search/PlayerCombobox';
import { Slate } from '../../ui/Slate';

const TAPES = [{ code: 'MEASURED FROM THE DATA', variant: 'derived' as const }];
const date = (iso: string | null) =>
  iso ? iso.slice(0, 10) : 'not stated by the source';
const pct = (a: number, t: number) =>
  t ? `${((100 * a) / t).toFixed(t >= 1000 ? 1 : 0)}%` : '—';

/** Rows of the season grid: each archived season and scope, then what any season can offer. */
const COLUMNS = [
  { key: 'games', label: 'Game results' },
  { key: 'players', label: 'Player season stats' },
  { key: 'tables', label: 'Standings and leaders' },
  { key: 'shots', label: 'Shot locations' },
  { key: 'lineups', label: 'Lineup units' },
] as const;
const CELL: Record<
  CoverageDataset['id'],
  { season: string; scope: string; column: (typeof COLUMNS)[number]['key'][] }
> = {
  'recorded-2023-24': {
    season: '2023-24',
    scope: 'Regular season',
    column: ['games', 'players'],
  },
  'league-2023-24': { season: '2023-24', scope: 'Regular season', column: ['tables'] },
  'playoffs-2024': { season: '2023-24', scope: 'Playoffs', column: ['games'] },
  'shots-2018': { season: '2017-18', scope: 'Playoffs', column: ['shots'] },
  'lineups-2017-18': {
    season: '2017-18',
    scope: 'Regular season',
    column: ['lineups'],
  },
};

/** The count that answers each column's question for a dataset. */
const HEADLINE: Record<(typeof COLUMNS)[number]['key'], string[]> = {
  games: ['Games agreed by both teams', 'Games'],
  players: ['Regular-season player rows'],
  tables: ['Standings rows'],
  shots: ['Field-goal attempts'],
  lineups: ['Five-player units'],
};
const headline = (d: CoverageDataset, column: (typeof COLUMNS)[number]['key']) =>
  d.counts.find((c) => HEADLINE[column].includes(c.label)) ?? d.counts[0];

function seasonRows(data: CoverageResponse) {
  const rows = new Map<
    string,
    { season: string; scope: string; cells: Map<string, CoverageDataset> }
  >();
  for (const d of data.datasets) {
    const place = CELL[d.id];
    const key = `${place.season} ${place.scope}`;
    const row = rows.get(key) ?? {
      season: place.season,
      scope: place.scope,
      cells: new Map(),
    };
    for (const c of place.column) row.cells.set(c, d);
    rows.set(key, row);
  }
  return [...rows.values()].sort(
    (a, b) => b.season.localeCompare(a.season) || a.scope.localeCompare(b.scope),
  );
}

export function CoveragePage() {
  const query = useQuery({
    queryKey: ['research', 'coverage'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/coverage', signal, CoverageResponseSchema.parse),
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = query.data;
  return (
    <ResearchShell
      title="Data coverage"
      lede={
        <p>
          Exactly what the data behind every tool covers: which seasons and game types,
          how many records, which fields exist and which do not, where each copy came
          from and when it was retrieved. Every number here is counted from the data
          itself.
        </p>
      }
    >
      <nav className="intel-links" aria-label="Related">
        <Link to="/explore">What&rsquo;s on tape</Link>
        <Link to="/lab/formulas">Formula lab</Link>
      </nav>
      <QueryFeedback pending={query.isPending} failed={query.isError} />
      {data ? (
        <>
          <SeasonGrid data={data} />
          <section className="pmod" aria-labelledby="cov-datasets">
            <Slate
              id="cov-datasets"
              title="Datasets committed with the app"
              tapes={TAPES}
              meta={[`${data.datasets.length} datasets`, 'Work without a network']}
            />
            <div className="cov-cards">
              {data.datasets.map((d) => (
                <DatasetCard key={d.id} d={d} />
              ))}
            </div>
          </section>
          <section className="pmod" aria-labelledby="cov-live">
            <Slate id="cov-live" title="Sources contacted on request" />
            <ul className="cov-live">
              {data.liveSources.map((s) => (
                <li key={s.id} className="cov-live__item" data-mode={s.mode}>
                  <b>{s.name}</b>
                  <span className="cov-chip">{s.mode.replaceAll('-', ' ')}</span>
                  <p>{s.use}</p>
                  <p className="fr-note">{s.note}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
      <LeagueCoverageSections />
      <PlayerSeasonFields />
      <section className="pmod" aria-labelledby="cov-never">
        <Slate id="cov-never" title="Not available from any source here" />
        <ul className="cov-never">
          <li>
            Live or current scores, schedules and standings: no permitted, verified
            feed.
          </li>
          <li>
            Play-by-play, scoring runs, lead changes and possessions: no licensed event
            data; quarter totals are never stretched into runs.
          </li>
          <li>
            Offensive, defensive and net ratings, and on/off splits: need possessions
            and substitutions.
          </li>
          <li>Injury and availability records.</li>
          <li>
            A representative league-wide shot baseline: the only shot archive is a
            partial playoff sample.
          </li>
          <li>
            Era-adjusted comparisons: no defensible cross-era model or complete archive.
          </li>
        </ul>
        <p className="fr-note">
          The full requirement-by-requirement status is in the project&rsquo;s final
          feature matrix (docs/release/FINAL_FEATURE_MATRIX.md).
        </p>
      </section>
    </ResearchShell>
  );
}

function SeasonGrid({ data }: { data: CoverageResponse }) {
  const rows = seasonRows(data);
  return (
    <section className="pmod" aria-labelledby="cov-seasons">
      <Slate id="cov-seasons" title="Seasons and game types" tapes={TAPES} />
      <ResearchTable label="Coverage by season">
        <table className="cov-grid">
          <caption>
            Archived seasons and scopes; other seasons appear only through NBA.com
            player pages and the Wikidata champions list, on request
          </caption>
          <thead>
            <tr>
              <th scope="col">Season</th>
              {COLUMNS.map((c) => (
                <th scope="col" key={c.key}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.season}${r.scope}`}>
                <th scope="row">
                  {r.season.replace('-', '–')} <small>{r.scope}</small>
                </th>
                {COLUMNS.map((c) => {
                  const d = r.cells.get(c.key);
                  return (
                    <td key={c.key} data-state={d ? d.completeness : 'none'}>
                      {d ? (
                        <>
                          <span className="cov-state">
                            {d.completeness === 'complete-scope'
                              ? 'Complete'
                              : 'Partial'}
                          </span>
                          <small>
                            {headline(d, c.key)?.value.toLocaleString('en-US')}{' '}
                            {headline(d, c.key)?.label.toLowerCase()}
                          </small>
                        </>
                      ) : (
                        <span className="cov-none">Not archived</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th scope="row">
                Any other season <small>On request</small>
              </th>
              <td colSpan={2}>
                <span className="cov-state">NBA.com</span>
                <small>player careers, logs and season stats when reachable</small>
              </td>
              <td>
                <span className="cov-state">Wikidata</span>
                <small>champions only</small>
              </td>
              <td colSpan={2}>
                <span className="cov-none">Not available</span>
              </td>
            </tr>
          </tbody>
        </table>
      </ResearchTable>
      <p className="fr-note">
        &ldquo;Complete&rdquo; means every game of that scope is present in the data,
        not that every statistic exists; see each dataset&rsquo;s fields below.
      </p>
    </section>
  );
}

function DatasetCard({ d }: { d: CoverageDataset }) {
  return (
    <article
      className="cov-card"
      aria-labelledby={`cov-${d.id}`}
      data-state={d.completeness}
    >
      <header>
        <span className="cov-chip">
          {d.completeness === 'complete-scope' ? 'Complete scope' : 'Partial scope'}
        </span>
        <h3 id={`cov-${d.id}`}>{d.title}</h3>
        <p className="cov-card__note">{d.completenessNote}</p>
      </header>
      <dl className="cov-card__meta">
        <div>
          <dt>Source</dt>
          <dd>
            <a href={d.source.url} rel="noreferrer" target="_blank">
              {d.source.name}
            </a>
          </dd>
        </div>
        <div>
          <dt>Licence</dt>
          <dd>
            <a href={d.source.licenceUrl} rel="noreferrer" target="_blank">
              {d.source.licence}
            </a>
          </dd>
        </div>
        {d.source.version ? (
          <div>
            <dt>Version</dt>
            <dd>{d.source.version}</dd>
          </div>
        ) : null}
        <div>
          <dt>Retrieved</dt>
          <dd>
            {d.retrievedFrom === d.retrievedTo
              ? date(d.retrievedFrom)
              : `${date(d.retrievedFrom)} to ${date(d.retrievedTo)}`}
          </dd>
        </div>
        <div>
          <dt>Source last updated</dt>
          <dd>{date(d.sourceUpdatedAt)}</dd>
        </div>
      </dl>
      <dl className="statgrid cov-card__counts">
        {d.counts.map((c) => (
          <div className="statgrid__cell" key={c.label}>
            <dt>{c.label}</dt>
            <dd>{c.value.toLocaleString('en-US')}</dd>
          </div>
        ))}
      </dl>
      <ResearchTable label={`${d.title} field availability`}>
        <table className="cov-fields">
          <caption>Records with a value for each field</caption>
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Available</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            {d.fields.map((f) => (
              <tr key={f.field}>
                <th scope="row">
                  {f.label}
                  {f.note ? <small>{f.note}</small> : null}
                </th>
                <td className="num">
                  {f.available.toLocaleString('en-US')} of{' '}
                  {f.total.toLocaleString('en-US')}
                </td>
                <td>
                  <span className="cov-bar" aria-hidden="true">
                    <i
                      style={{
                        width: `${f.total ? (100 * f.available) / f.total : 0}%`,
                      }}
                    />
                  </span>
                  <span className="num">{pct(f.available, f.total)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResearchTable>
      <h4 className="fr-sub">Not in this dataset</h4>
      <ul className="cov-card__missing">
        {d.unavailable.map((u) => (
          <li key={u}>{u}</li>
        ))}
      </ul>
      <p className="cov-card__tools">
        {d.tools.map((t) => (
          <Link key={t.to} to={t.to}>
            {t.label}
          </Link>
        ))}
      </p>
    </article>
  );
}

const CAREER_FIELDS = [
  ['gamesPlayed', 'GP'],
  ['minutes', 'MIN'],
  ['points', 'PTS'],
  ['rebounds', 'REB'],
  ['assists', 'AST'],
  ['turnovers', 'TOV'],
  ['fieldGoalsAttempted', 'FGA'],
  ['threesAttempted', '3PA'],
  ['freeThrowsAttempted', 'FTA'],
] as const;

/** Season-by-season field coverage for one player, measured from NBA.com's own career rows. */
function PlayerSeasonFields() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('player');
  const player = raw && ResearchPlayerIdSchema.safeParse(raw).success ? raw : null;
  const career = useQuery({
    queryKey: ['research', 'coverage-career', player],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/players/${player}/career`,
        signal,
        CareerResearchResponseSchema.parse,
      ),
    enabled: player !== null,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const seasons = career.data?.seasons ?? [];
  const firstReported = CAREER_FIELDS.map(([key, label]) => {
    const first = seasons.find((s) => s.totals[key] !== null);
    const missing = seasons.filter((s) => s.totals[key] === null).length;
    return { key, label, first: first?.totals.season ?? null, missing };
  }).filter((f) => f.missing > 0);
  return (
    <section className="pmod" aria-labelledby="cov-player">
      <Slate id="cov-player" title="Season-by-season fields for a player (NBA.com)" />
      <p>
        Not every statistic was recorded in every era. Choose a player to see, season by
        season, which fields NBA.com actually reports for them. A dash means the source
        gives no value; the app never fills it in.
      </p>
      <PlayerCombobox
        label="Player for field coverage"
        tone="dark"
        onSelect={(p) => setParams({ player: p.id }, { replace: true })}
      />
      <p className="fr-note">
        Examples: <Link to="?player=76003">Kareem Abdul-Jabbar</Link> (from 1969–70) ·{' '}
        <Link to="?player=893">Michael Jordan</Link> ·{' '}
        <Link to="?player=201939">Stephen Curry</Link>
      </p>
      {raw && !player ? <p role="alert">That player link is not supported.</p> : null}
      {player ? (
        <QueryFeedback pending={career.isPending} failed={career.isError} />
      ) : null}
      {career.data ? (
        <>
          <p className="cov-player__summary">
            <b>{career.data.player.fullName}</b>: {seasons.length} reported seasons.{' '}
            {firstReported.length
              ? firstReported
                  .map((f) =>
                    f.first
                      ? `${f.label} missing in ${f.missing} season${f.missing === 1 ? '' : 's'} (first reported ${f.first})`
                      : `${f.label} never reported`,
                  )
                  .join('; ')
              : 'Every listed field is reported in every season.'}
          </p>
          <ResearchTable
            label={`${career.data.player.fullName} field coverage by season`}
          >
            <table className="cov-player">
              <caption>
                Fields NBA.com reports per season; — means no value is reported
              </caption>
              <thead>
                <tr>
                  <th scope="col">Season</th>
                  {CAREER_FIELDS.map(([key, label]) => (
                    <th scope="col" key={key}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seasons.map((s) => (
                  <tr
                    key={`${s.totals.season}-${s.totals.team?.abbreviation ?? 'tot'}`}
                  >
                    <th scope="row">{s.totals.season}</th>
                    {CAREER_FIELDS.map(([key]) => (
                      <td key={key} data-has={s.totals[key] !== null}>
                        {s.totals[key] !== null ? '✓' : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
        </>
      ) : null}
    </section>
  );
}
