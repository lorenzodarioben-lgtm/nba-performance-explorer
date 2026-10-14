import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  DraftQuerySchema,
  DraftResponseSchema,
  TeamDirectoryResponseSchema,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import {
  ResearchShell,
  ResearchTable,
  SourceNote,
  QueryFeedback,
} from '../research/ResearchShell';
import { WikiAttribution } from '../wiki-archive/WikiAttribution';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';
export function HistoricalDraftPage() {
  const [params, setParams] = useSearchParams(),
    valid =
      DraftQuerySchema.safeParse(Object.fromEntries(params)).success &&
      [...params.keys()].every((k) => params.getAll(k).length === 1);
  const query = useQuery({
    queryKey: ['research', 'historical-draft', params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(`/api/history/draft?${params}`, signal, DraftResponseSchema.parse),
    enabled: valid,
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const teams = useQuery({
    queryKey: ['research', 'teams'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/teams', signal, TeamDirectoryResponseSchema.parse),
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined,
    update = (k: string, v: string) => {
      const p = new URLSearchParams(params);
      if (v) p.set(k, v);
      else p.delete(k);
      if (k !== 'page') p.delete('page');
      setParams(p);
    },
    share = new URLSearchParams(params);
  share.set('year', '2023');
  return (
    <ResearchShell title="Historical draft class">
      <p>
        The source-listed 2023 draft class: 58 numbered selections and two explicit
        forfeitures. Published trade/via notes are retained. The listed team is not
        inferred as a player’s current roster or final transaction destination. Exact
        optional identity mappings provide profile links; unknown mappings keep source
        articles.
      </p>
      {!valid ? (
        <p role="alert">
          Invalid draft filters. Choose 2023, valid round and ordered pick bounds.
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      <div className={styles.controls}>
        <label>
          Draft round
          <select
            value={params.get('round') ?? ''}
            onChange={(e) => update('round', e.target.value)}
          >
            <option value="">Both rounds</option>
            <option value="1">Round 1</option>
            <option value="2">Round 2</option>
          </select>
        </label>
        <label>
          Draft source-listed team
          <select
            value={params.get('team') ?? ''}
            onChange={(e) => update('team', e.target.value)}
          >
            <option value="">All listed teams</option>
            {teams.data?.teams.map((t) => (
              <option value={t.id} key={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {(['fromPick', 'toPick'] as const).map((k, i) => (
          <label key={k}>
            {i === 0 ? 'First draft pick' : 'Last draft pick'}
            <input
              type="number"
              min={1}
              max={58}
              value={params.get(k) ?? (i === 0 ? '1' : '58')}
              onChange={(e) => update(k, e.target.value)}
            />
          </label>
        ))}
        <label>
          Search draft player/school
          <input
            maxLength={100}
            value={params.get('search') ?? ''}
            onChange={(e) => update('search', e.target.value)}
          />
        </label>
      </div>
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <p>
            {data.total} matching selections from {data.sourceSelections};{' '}
            {data.missingNBAIds} source-class NBA IDs unavailable. Identity mapping{' '}
            {data.identityStatus}, fetched {data.identityRetrievedAt ?? 'Unavailable'}.
            Unknown IDs are not guessed from names.
          </p>
          <label>
            Shareable draft URL
            <input
              readOnly
              value={`${window.location.origin}/history/draft?${share}`}
            />
          </label>
          <SaveResearchButton
            kind="page"
            label="Historical 2023 draft class"
            path={`/history/draft?${share}`}
          />
          <p>
            Page {data.page}, {data.selections.length} rows. Team filter uses only the
            first explicitly listed source team; all trade annotations remain visible.
          </p>
          <button
            disabled={data.page <= 1}
            onClick={() => update('page', String(data.page - 1))}
          >
            Previous draft page
          </button>{' '}
          <button
            disabled={data.page * data.pageSize >= data.total}
            onClick={() => update('page', String(data.page + 1))}
          >
            Next draft page
          </button>
          {!data.selections.length ? (
            <p role="status">No source selections match these filters/page.</p>
          ) : (
            <ResearchTable label="Historical draft selections">
              <table>
                <caption>
                  2023 numbered picks; source-listed affiliations and markers, not
                  current roster facts
                </caption>
                <thead>
                  <tr>
                    {[
                      'Round',
                      'Pick',
                      'Player/source marker',
                      'NBA identity',
                      'Position',
                      'Nationality',
                      'Listed team and trade notes',
                      'School/club',
                    ].map((s) => (
                      <th key={s} scope="col">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.selections.map((p) => (
                    <tr key={p.id}>
                      <td>{p.round}</td>
                      <th scope="row">{p.pick}</th>
                      <td>
                        <a href={p.articleUrl}>{p.playerLabel}</a>
                      </td>
                      <td>
                        {p.nbaPlayerId ? (
                          <Link to={`/players/${p.nbaPlayerId}`}>{p.nbaPlayerId}</Link>
                        ) : (
                          'Unavailable'
                        )}
                        {p.identityUrl && (
                          <div>
                            <a href={p.identityUrl}>CC0 identity evidence</a>
                          </div>
                        )}
                      </td>
                      <td>{p.position ?? 'Unavailable'}</td>
                      <td>{p.nationality ?? 'Unavailable'}</td>
                      <td>{p.teamLabel}</td>
                      <td>{p.schoolClub ?? 'Unavailable'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResearchTable>
          )}
          <h2>Source forfeitures</h2>
          <ul>
            {data.forfeitures.map((f) => (
              <li key={f.listedTeam.id}>
                Round {f.round}: {f.sourceLabel}
              </li>
            ))}
          </ul>
          <p>
            Forfeitures are source rows without numbered selections; no invented pick
            59/60 or player is assigned. Source player markers remain literal and do not
            establish a current award/eligibility claim.
          </p>
          <WikiAttribution data={data.attribution} />
        </>
      )}
    </ResearchShell>
  );
}
