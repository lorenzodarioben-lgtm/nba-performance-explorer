import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import {
  StudyLineupQuerySchema,
  StudyLineupResponseSchema,
  StudyDirectorySchema,
  StudyLineupIdSchema,
  type StudyLineupRow,
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
import { UnitCards } from './UnitCards';
function Members({ row }: { row: StudyLineupRow }) {
  return (
    <>
      {row.members.map((p) => (
        <div key={p.id}>
          <a href={p.sourceUrl}>{p.aliases.join(' / ')}</a> · {p.id}
        </div>
      ))}
    </>
  );
}
function GroupTable({ rows, label }: { rows: StudyLineupRow[]; label: string }) {
  return (
    <ResearchTable label={label}>
      <table>
        <caption>
          Independent source-reconstructed groups; shared time and plus/minus only
        </caption>
        <thead>
          <tr>
            {[
              'Source group',
              'Team',
              'Five source members',
              'Shared seconds',
              'Shared minutes',
              'Joint +/−',
              '+/− per48min',
              'Observed games',
              'Quarter reports',
              'Qualified',
            ].map((s) => (
              <th key={s} scope="col">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row">
                {r.id}
                <details>
                  <summary>Source game evidence</summary>
                  {r.games.map((g) => (
                    <div key={g.id}>
                      <a href={g.url}>
                        {g.date} · {g.id}
                      </a>
                    </div>
                  ))}
                </details>
              </th>
              <td>{r.team.abbreviation}</td>
              <td>
                <Members row={r} />
              </td>
              <td>{r.secondsTogether}</td>
              <td>{r.minutesTogether.toFixed(2)}</td>
              <td>{r.plusMinus}</td>
              <td>{r.plusMinusPer48?.toFixed(3) ?? 'Unavailable below minimum'}</td>
              <td>{r.observedGames}</td>
              <td>{r.reportedQuarterRows}</td>
              <td>{r.qualified ? 'Yes' : 'Below minimum'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ResearchTable>
  );
}
export function LineupStudyPage() {
  const [params, setParams] = useSearchParams(),
    api = new URLSearchParams(params);
  const a = params.get('compareA') ?? '',
    b = params.get('compareB') ?? '';
  api.delete('compareA');
  api.delete('compareB');
  if (a && b) api.set('compare', `${a},${b}`);
  const valid =
    StudyLineupQuerySchema.safeParse(Object.fromEntries(api)).success &&
    [...params.keys()].every((k) => params.getAll(k).length === 1) &&
    (!a || StudyLineupIdSchema.safeParse(a).success) &&
    (!b || StudyLineupIdSchema.safeParse(b).success) &&
    (!(a || b) || !params.has('compare'));
  const directory = useQuery({
    queryKey: ['research', 'study-lineup-directory'],
    queryFn: ({ signal }) =>
      fetchResearch(
        '/api/research-lineups/directory',
        signal,
        StudyDirectorySchema.parse,
      ),
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const query = useQuery({
    queryKey: ['research', 'study-lineups', api.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/research-lineups?${api}`,
        signal,
        StudyLineupResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 3600_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined;
  const update = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== 'page') p.delete('page');
    setParams(p);
  };
  const share = new URLSearchParams(params);
  share.set('season', '2017-18');
  share.set('scope', 'regular-season');
  const selected = params.get('members')?.split(',') ?? [];
  return (
    <ResearchShell title="Research lineup reports">
      <p>
        Browse researcher-reconstructed five-player groups from 2017–18 substitution
        records. Shared seconds and signed plus/minus are reported joint quantities,
        rather than a sum of individual season averages. These groups are not
        independently verified official NBA lineup events. Possessions,
        offensive/defensive/net ratings and contiguous stint order are unavailable.
      </p>
      <p>
        Source-native BasketballReference identities and short aliases are retained.
        Player names are not used to guess NBA IDs; source links provide identity
        evidence.
      </p>
      {!valid ? (
        <p role="alert">
          Invalid research lineup filters. Use supported2017-18 regular scope, native
          member/group IDs, different comparison groups and bounded numeric controls.
        </p>
      ) : (
        <QueryFeedback
          pending={query.isPending || directory.isPending}
          failed={query.isError || directory.isError}
        />
      )}
      <div className={styles.controls}>
        <label>
          Research source team
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
          Native member IDs (up to5, comma separated)
          <input
            value={params.get('members') ?? ''}
            maxLength={100}
            onChange={(e) => update('members', e.target.value)}
          />
        </label>
        <label>
          Add source member
          <select
            value=""
            disabled={selected.length >= 5}
            onChange={(e) => {
              if (e.target.value)
                update('members', [...selected, e.target.value].join(','));
            }}
          >
            <option value="">Choose source identity</option>
            {directory.data?.people.map((p) => (
              <option key={p.id} value={p.id} disabled={selected.includes(p.id)}>
                {p.aliases.join(' / ')} · {p.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Minimum shared minutes
          <input
            type="number"
            min={0}
            max={2000}
            value={params.get('minMinutes') ?? '30'}
            onChange={(e) => update('minMinutes', e.target.value)}
          />
        </label>
        <label>
          Research group sort
          <select
            value={params.get('sort') ?? 'minutes'}
            onChange={(e) => update('sort', e.target.value)}
          >
            <option value="minutes">Shared time</option>
            <option value="plusMinus">Signed plus/minus</option>
            <option value="plusMinusPer48">Plus/minus per 48 shared minutes</option>
            <option value="games">Observed games</option>
          </select>
        </label>
        <label>
          Research sort order
          <select
            value={params.get('order') ?? 'desc'}
            onChange={(e) => update('order', e.target.value)}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
        <label>
          Comparison source group A
          <input
            value={a}
            placeholder="study:TEAM_2017_ID"
            onChange={(e) => update('compareA', e.target.value)}
          />
        </label>
        <label>
          Comparison source group B
          <input
            value={b}
            placeholder="study:TEAM_2017_ID"
            onChange={(e) => update('compareB', e.target.value)}
          />
        </label>
      </div>
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <p>
            {data.total} groups qualify for these filters/minimum {data.minMinutes}{' '}
            shared minutes. Usable source: {data.usableLineups} groups/
            {data.usableGames} games, versus publisher {data.source.sourceLineups}{' '}
            groups/{data.source.sourceRegularGames} games. Same year/scope and minimum
            apply to both comparison groups; opponent/game contexts differ.
          </p>
          <p>
            Plus/minus per 48 = source plus/minus × 2880 / shared seconds. This time
            normalization is not net rating per 100 possessions, opponent adjustment or
            a causal quality estimate. Raw shared time/plus-minus stay visible below the
            comparison minimum; the normalized rate is then unavailable.
          </p>
          <label>
            Shareable research lineup URL
            <input readOnly value={`${window.location.origin}/lab/lineups?${share}`} />
          </label>
          <SaveResearchButton
            kind="analysis"
            label="Research lineup investigation"
            path={`/lab/lineups?${share}`}
          />
          {data.comparison.length === 2 ? (
            <>
              <h2>Two source groups</h2>
              <GroupTable rows={data.comparison} label="Research lineup comparison" />
            </>
          ) : (
            <p role="status">
              Choose two different source group IDs for comparison; pending selections
              are retained in the URL.
            </p>
          )}
          <h2>Qualified source groups</h2>
          <p>
            Page {data.page}; showing {data.rows.length} rows.
          </p>
          <button
            disabled={data.page <= 1}
            onClick={() => update('page', String(data.page - 1))}
          >
            Previous research group page
          </button>{' '}
          <button
            disabled={data.page * data.pageSize >= data.total}
            onClick={() => update('page', String(data.page + 1))}
          >
            Next research group page
          </button>
          {!data.rows.length ? (
            <p role="status">
              No usable source groups match these member/team/minute filters.
            </p>
          ) : (
            <>
              <UnitCards rows={data.rows} />
              <GroupTable rows={data.rows} label="Research lineup exact values" />
              <details>
                <summary>Choose comparison groups from this page</summary>
                {data.rows.map((r) => (
                  <p key={r.id}>
                    {r.id}{' '}
                    <button
                      disabled={r.id === b}
                      onClick={() => update('compareA', r.id)}
                    >
                      Use {r.id} as A
                    </button>{' '}
                    <button
                      disabled={r.id === a}
                      onClick={() => update('compareB', r.id)}
                    >
                      Use {r.id} as B
                    </button>
                  </p>
                ))}
              </details>
            </>
          )}
          <aside aria-label="Research source attribution">
            <h2>Source and exclusions</h2>
            <p>
              <a href={`https://doi.org/${data.source.doi}`}>{data.source.title}</a> ·{' '}
              {data.source.creator}, dataset version {data.source.datasetVersion}.{' '}
              <a href={data.source.licenceUrl}>{data.source.licence}</a>. Source updated
              {data.source.sourceUpdatedAt ?? 'Unknown'}, retrieved
              {data.source.retrievedAt}. Modified by extracting2017–18 reports, exact
              source game-key/URL joins, aggregate conversion and explicit quarantine.
              No producer/NBA endorsement implied.
            </p>
            <p>
              {data.source.reportedQuarterRows} original quarter reports; repeated
              same-lineup reports within quarters are retained. Underlying raw PBP,
              research code and pickle files are not redistributed or executed.
            </p>
            <ul>
              {data.quarantinedGames.map((g) => (
                <li key={g.id}>
                  {g.id}: source {g.sourceKey}, reported periods
                  {g.reportedPeriods.join(', ')}; missing-contiguous-periods. Whole game
                  excluded without guessing a missing quarter.
                </li>
              ))}
            </ul>
            <p>
              Groups only in excluded game: {data.quarantinedOnlyLineupIds.join(', ')}.
              Source file {data.source.statisticsFile}; SHA256
              {data.source.statisticsSha256}.
            </p>
          </aside>
        </>
      )}
    </ResearchShell>
  );
}
