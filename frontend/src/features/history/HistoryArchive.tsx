import type { HistoryResponse } from '@nba-performance-explorer/contracts';
import { Link } from 'react-router';
import { Icon } from '../../ui/Icon';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { ResearchTable, SourceNote } from '../research/ResearchShell';
import styles from '../research/research.module.css';
import { SeasonTimeline } from './SeasonTimeline';

type HistorySelection = {
  params: URLSearchParams;
  onChange: (params: URLSearchParams) => void;
};

/** One filter implementation for the index and individual-season research views. */
export function HistoryFilters({
  params,
  onChange,
  archive = false,
}: HistorySelection & { archive?: boolean }) {
  return (
    <form
      key={params.toString()}
      className={archive ? 'archive-filters' : styles.controls}
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget),
          next = new URLSearchParams();
        for (const key of ['from', 'to', 'champion']) {
          const value = String(form.get(key) ?? '').trim();
          if (value) next.set(key, value);
        }
        onChange(next);
      }}
    >
      <label>
        First season start year
        <input
          name="from"
          type="number"
          min={1946}
          max={2100}
          placeholder="1946"
          defaultValue={params.get('from') ?? ''}
        />
      </label>
      <label>
        Last season start year
        <input
          name="to"
          type="number"
          min={1946}
          max={2100}
          placeholder="2100"
          defaultValue={params.get('to') ?? ''}
        />
      </label>
      <label className="archive-filters__entity">
        Champion source entity
        <input
          name="champion"
          pattern="wd:Q[1-9][0-9]{0,11}"
          placeholder="wd:Q121783"
          aria-describedby={archive ? 'archive-filter-help' : undefined}
          defaultValue={params.get('champion') ?? ''}
        />
      </label>
      <div className="archive-filters__actions">
        <button type="submit" className={archive ? 'btn btn--primary' : undefined}>
          Apply historical filters
          <Icon name="arrowRight" size={16} />
        </button>
        {archive && (
          <button type="button" onClick={() => onChange(new URLSearchParams())}>
            Reset filters
          </button>
        )}
      </div>
      {archive && (
        <p id="archive-filter-help">
          Use season start years. Champion IDs identify Wikidata entities, not NBA
          teams.
        </p>
      )}
    </form>
  );
}

/** The original source-backed table, shared without changing labels or provenance. */
export function HistoryFactsTable({
  seasons,
}: {
  seasons: HistoryResponse['seasons'];
}) {
  return (
    <ResearchTable label="Historical season facts">
      <table>
        <caption>
          Recorded season/champion statements; source entity labels retained
        </caption>
        <thead>
          <tr>
            {[
              'Season',
              'Source season label',
              'Champion statements',
              'Check source / report issue',
            ].map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {seasons.map((season) => (
            <tr key={season.id}>
              <th scope="row">
                <Link to={`/history/${season.season}`}>{season.season}</Link>
              </th>
              <td>{season.sourceLabel}</td>
              <td>
                {season.winners.length ? (
                  <ul>
                    {season.winners.map((winner) => (
                      <li key={winner.id}>
                        <a href={winner.sourceUrl} target="_blank" rel="noreferrer">
                          {winner.label ?? winner.id}
                        </a>{' '}
                        <Link to={`/history?champion=${winner.id}`}>
                          All source seasons for {winner.label ?? winner.id}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="archive-missing">
                    Champion unavailable in source
                  </span>
                )}
              </td>
              <td>
                <a href={season.sourceUrl} target="_blank" rel="noreferrer">
                  Wikidata {season.id}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ResearchTable>
  );
}

export function HistoryArchive({
  data,
  valid,
  pending,
  failed,
  params,
  onChange,
  path,
}: HistorySelection & {
  data: HistoryResponse | undefined;
  valid: boolean;
  pending: boolean;
  failed: boolean;
  path: string;
}) {
  const ordered = [...(data?.seasons ?? [])].sort((a, b) =>
    a.season.localeCompare(b.season),
  );
  const first = ordered[0]?.season,
    last = ordered.at(-1)?.season;
  const selectedRange =
    params.has('from') || params.has('to')
      ? `${params.get('from') ?? 'First source year'} — ${params.get('to') ?? 'Last source year'} · start years`
      : 'All source seasons';
  return (
    <>
      <section className="archive-deck" aria-labelledby="archive-explore">
        <div className="archive-deck__intro">
          <h2 id="archive-explore">Explore the archive</h2>
          <p>{selectedRange}</p>
          {params.get('champion') && (
            <p>
              Champion entity: <strong>{params.get('champion')}</strong>
            </p>
          )}
        </div>
        <HistoryFilters params={params} onChange={onChange} archive />
      </section>
      {!valid && (
        <p role="alert" className="archive-state">
          Invalid historical selection.{' '}
          <button onClick={() => onChange(new URLSearchParams())}>Clear filters</button>
        </p>
      )}
      {valid && pending && (
        <p role="status" className="loading-line archive-state">
          <i aria-hidden="true" />
          Loading historical facts…
        </p>
      )}
      {failed && (
        <p role="alert" className="archive-state">
          The historical facts source or this season is unavailable. No substitute facts
          are shown. <Link to="/history">Return to season navigator</Link>
        </p>
      )}
      {data && (
        <>
          <section className="archive-chronology" aria-labelledby="archive-chronology">
            <div className="archive-section-head">
              <div>
                <h2 id="archive-chronology">Season by season.</h2>
                <p>
                  {data.seasons.length} matching seasons
                  {first && last
                    ? ` · ${first.replace('-', '–')} to ${last.replace('-', '–')}`
                    : ''}
                </p>
              </div>
              <a className="archive-index-link" href="#archive-records">
                Open the source index
                <Icon name="arrowRight" size={16} />
              </a>
            </div>
            <p className="archive-source-intro">
              Wikidata · CC0. Champion statements retain source labels, which may use
              modern franchise names. Historical aliases and NBA team IDs are not
              inferred.
            </p>
            {data.seasons.length ? (
              <SeasonTimeline seasons={data.seasons} />
            ) : (
              <p role="status" className="archive-state">
                No recorded historical facts match this selection.
              </p>
            )}
          </section>
          <aside className="archive-paths" aria-labelledby="archive-research">
            <div>
              <h2 id="archive-research">
                Go deeper into
                <br />
                2023–24.
              </h2>
              <p>
                Separate licensed tables.
                <br />A different view of the season.
              </p>
            </div>
            <nav aria-label="2023–24 recorded research">
              <Link to="/standings">
                <span>Standings</span>
                <Icon name="arrowRight" size={20} />
              </Link>
              <Link to="/leaders">
                <span>Published leaders</span>
                <Icon name="arrowRight" size={20} />
              </Link>
              <Link to="/games/recorded">
                <span>Recorded 2024 playoff games</span>
                <Icon name="arrowRight" size={20} />
              </Link>
            </nav>
          </aside>
          <section
            className="archive-records"
            id="archive-records"
            aria-labelledby="archive-index-heading"
          >
            <div className="archive-section-head">
              <h2 id="archive-index-heading">The source index</h2>
              <a href="#archive-chronology">
                Back to decades
                <Icon name="arrowRight" size={16} />
              </a>
            </div>
            <p>
              Every returned record, with the original season label and links to check
              or report a source statement.
            </p>
            <details className="archive-index">
              <summary>
                View all {data.seasons.length} season records
                <span aria-hidden="true">Wikidata · CC0</span>
              </summary>
              <HistoryFactsTable seasons={data.seasons} />
            </details>
            <p className="archive-coverage">
              {data.seasons.length} matching seasons of {data.sourceSeasons} source
              season entities. {data.coverage.excludedRows} noncanonical rows excluded;{' '}
              {data.coverage.missingWinners} source seasons lack champion statements.
              Source status: {data.status}.
            </p>
            <SourceNote provenance={data.provenance} />
            <p>
              Season leaderboards, awards, draft classes, complete box scores and
              official championship totals are unavailable in this source slice.
            </p>
          </section>
          <div className="archive-save">
            <label>
              Shareable history URL
              <input readOnly value={`${window.location.origin}${path}`} />
            </label>
            <SaveResearchButton
              kind="analysis"
              label="Historical season navigator"
              path={path}
            />
          </div>
        </>
      )}
    </>
  );
}
