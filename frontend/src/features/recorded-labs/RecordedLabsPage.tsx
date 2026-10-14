import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { z } from 'zod';
import {
  RecordedDirectorySchema,
  HypotheticalGroupSchema,
  RecordedTeamComparisonSchema,
  ResearchPlayerIdSchema,
  CanonicalTeamIdSchema,
  ArchiveSeasonSchema,
  type RecordedTeamComparison,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import { MirrorBars, type MirrorRow } from '../../charts/MirrorBars';
import {
  ResearchShell,
  ResearchTable,
  SourceNote,
  QueryFeedback,
} from '../research/ResearchShell';
import { WikiAttribution } from '../wiki-archive/WikiAttribution';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';
const ids = (kind: 'groups' | 'teams') =>
  z
    .string()
    .transform((s) => (s ? s.split(',') : []))
    .pipe(
      z
        .array(kind === 'groups' ? ResearchPlayerIdSchema : CanonicalTeamIdSchema)
        .max(kind === 'groups' ? 5 : 2)
        .refine((list) => new Set(list).size === list.length),
    );
const groupState = z
  .object({
    players: ids('groups').prefault(''),
    scope: z.enum(['regular-season', 'playoffs']).default('regular-season'),
    season: ArchiveSeasonSchema.default('2023-24'),
  })
  .strict();
const teamState = z
  .object({
    teams: ids('teams').prefault(''),
    season: ArchiveSeasonSchema.default('2023-24'),
  })
  .strict();
const fixed = (n: number | null, digits: number) =>
  n === null ? '—' : n.toFixed(digits);

/** Two recorded team samples, side by side on per-row scales, with typographic team plates. */
function TeamTape({ data }: { data: RecordedTeamComparison }) {
  const [a, b] = data.rows;
  if (!a || !b) return null;
  const rows: MirrorRow[] = [
    {
      label: 'Observed GP',
      a: a.observedGames,
      b: b.observedGames,
      displayA: String(a.observedGames),
      displayB: String(b.observedGames),
    },
    {
      label: 'Win ratio',
      a: a.winPercentage,
      b: b.winPercentage,
      displayA: fixed(a.winPercentage, 3),
      displayB: fixed(b.winPercentage, 3),
    },
    {
      label: 'PTS / game',
      a: a.pointsPerGame,
      b: b.pointsPerGame,
      displayA: fixed(a.pointsPerGame, 1),
      displayB: fixed(b.pointsPerGame, 1),
    },
    {
      label: 'Opp PTS / game',
      a: a.opponentPointsPerGame,
      b: b.opponentPointsPerGame,
      displayA: fixed(a.opponentPointsPerGame, 1),
      displayB: fixed(b.opponentPointsPerGame, 1),
    },
  ];
  return (
    <section className="teamtape" aria-label="Team comparison overview">
      <div className="teamtape__plates" aria-hidden="true">
        <span className="teamtape__plate">
          <b>{a.team.abbreviation}</b>
          {a.wins}–{a.losses}
        </span>
        <span className="teamtape__vs">VS</span>
        <span className="teamtape__plate teamtape__plate--b">
          <b>{b.team.abbreviation}</b>
          {b.wins}–{b.losses}
        </span>
      </div>
      <MirrorBars rows={rows} nameA={a.team.name} nameB={b.team.name} />
      <p className="lchart__note">
        Each row uses its own scale; observed samples only, not official standings.
        Final margin per game: {a.team.abbreviation} {fixed(a.finalMarginPerGame, 2)},{' '}
        {b.team.abbreviation} {fixed(b.finalMarginPerGame, 2)}.
      </p>
    </section>
  );
}

export function RecordedLabsPage({ mode }: { mode: 'groups' | 'teams' }) {
  const [params, setParams] = useSearchParams();
  const parsed = (mode === 'groups' ? groupState : teamState).safeParse(
    Object.fromEntries(params),
  );
  const valid =
    parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const selected = valid
    ? (params
        .get(mode === 'groups' ? 'players' : 'teams')
        ?.split(',')
        .filter(Boolean) ?? [])
    : [];
  const required = mode === 'groups' ? 5 : 2,
    ready = valid && selected.length === required;
  const directory = useQuery({
    queryKey: ['research', 'recorded-directory'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/recorded/directory', signal, RecordedDirectorySchema.parse),
    retry: false,
    staleTime: 24 * 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const groups = useQuery({
    queryKey: ['research', 'hypothetical', params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/hypothetical?${params}`,
        signal,
        HypotheticalGroupSchema.parse,
      ),
    enabled: ready && mode === 'groups',
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const teams = useQuery({
    queryKey: ['research', 'recorded-team-comparison', params.toString()],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/recorded/team-comparison?${params}`,
        signal,
        RecordedTeamComparisonSchema.parse,
      ),
    enabled: ready && mode === 'teams',
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const query = mode === 'groups' ? groups : teams,
    data = ready ? (mode === 'groups' ? groups.data : teams.data) : undefined;
  const add = (id: string) => {
    if (!id || selected.includes(id) || selected.length >= required) return;
    const copy = new URLSearchParams(params);
    copy.set(mode === 'groups' ? 'players' : 'teams', [...selected, id].join(','));
    setParams(copy);
  };
  const remove = (id: string) => {
    const copy = new URLSearchParams(params);
    const next = selected.filter((s) => s !== id);
    if (next.length) copy.set(mode === 'groups' ? 'players' : 'teams', next.join(','));
    else copy.delete(mode === 'groups' ? 'players' : 'teams');
    setParams(copy);
  };
  const name = (id: string) =>
    mode === 'groups'
      ? (directory.data?.players.find((p) => p.playerId === id)?.name ??
        `Identity ${id}`)
      : (directory.data?.teams.find((t) => t.id === id)?.name ?? id);
  const route = `/lab/${mode}`;
  const share = new URLSearchParams(params);
  share.set('season', '2023-24');
  return (
    <ResearchShell
      title={
        mode === 'groups'
          ? 'Hypothetical five-player identities'
          : 'Recorded team comparison'
      }
    >
      <p>
        Fixed genuine 2023–24 source data.{' '}
        {mode === 'groups'
          ? 'These identities are hypothetical membership only. No observed lineup, joint minutes, possessions, on/off or joint ratings are available.'
          : 'Compare matching regular-season definitions from source-agreed games. Cohort sizes can differ after source conflict quarantine.'}
      </p>
      <Link to={mode === 'groups' ? '/lab/teams' : '/lab/groups'}>
        {mode === 'groups' ? 'Recorded team comparison' : 'Hypothetical groups'}
      </Link>{' '}
      <Link to="/teams">Source team directory</Link>
      <QueryFeedback pending={directory.isPending} failed={directory.isError} />
      {!valid && (
        <p role="alert">
          Invalid or duplicate recorded selection.{' '}
          <button onClick={() => setParams({})}>Reset selection</button>
        </p>
      )}
      {directory.data && (
        <>
          <SourceNote provenance={directory.data.provenance} />
          <p>
            Adapted source tables by Wikipedia contributors under{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-SA4.0
            </a>
            ; explicit NBA-ID facts are{' '}
            <a
              href="https://www.wikidata.org/wiki/Wikidata:Copyright"
              target="_blank"
              rel="noreferrer"
            >
              Wikidata CC0
            </a>
            . Revision/contributor links below identify each source; original
            prose/media are not reproduced.
          </p>
          <details>
            <summary>Source revisions and contributors</summary>
            {directory.data.attributions.map((a) => (
              <WikiAttribution key={a.revision} data={a} />
            ))}
          </details>
          <div className={styles.controls}>
            <label>
              {mode === 'groups' ? 'Add recorded player' : 'Add recorded team'}
              <select
                value=""
                disabled={selected.length >= required || !valid}
                onChange={(e) => add(e.target.value)}
              >
                <option value="">Choose a source identity</option>
                {mode === 'groups'
                  ? directory.data.players
                      .filter((p) => !selected.includes(p.playerId))
                      .map((p) => (
                        <option key={p.playerId} value={p.playerId}>
                          {p.name} · {p.playerId} ·{' '}
                          {p.teams.map((t) => t.abbreviation).join(',')}
                        </option>
                      ))
                  : directory.data.teams
                      .filter((t) => !selected.includes(t.id))
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
              </select>
            </label>
            {mode === 'groups' && (
              <label>
                Individual summary scope
                <select
                  value={params.get('scope') ?? 'regular-season'}
                  onChange={(e) => {
                    const copy = new URLSearchParams(params);
                    copy.set('scope', e.target.value);
                    setParams(copy);
                  }}
                >
                  <option value="regular-season">Regular season</option>
                  <option value="playoffs">Playoffs</option>
                </select>
              </label>
            )}
          </div>
          <ul>
            {selected.map((id) => (
              <li key={id}>
                {name(id)} <button onClick={() => remove(id)}>Remove {name(id)}</button>
              </li>
            ))}
          </ul>
          {!ready && valid && (
            <p role="status">
              Choose exactly {required} different recorded identities. {selected.length}{' '}
              selected; source data is not guessed for incomplete groups.
            </p>
          )}
        </>
      )}
      {ready && <QueryFeedback pending={query.isPending} failed={query.isError} />}
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <label>
            Shareable recorded lab URL
            <input readOnly value={`${window.location.origin}${route}?${share}`} />
          </label>
          <SaveResearchButton
            kind="analysis"
            label={`Recorded2023-24 ${mode}`}
            path={`${route}?${share}`}
          />
          {mode === 'groups' && groups.data && (
            <>
              <h2>Hypothetical membership · no observed joint performance</h2>
              <p>
                {groups.data.availableMembers} of5 identities have selected-scope source
                rows. Sum of independent individual recorded points:{' '}
                {groups.data.sumOfIndividualRecordedPoints ?? 'Unavailable'}. This sum
                is across separate individual season records; it does not describe these
                players performing together.
              </p>
              <ResearchTable label="Hypothetical individual season summaries">
                <table>
                  <caption>
                    Individual reported season aggregates only; missing raw counts
                    remain unavailable
                  </caption>
                  <thead>
                    <tr>
                      {[
                        'Player',
                        'Status',
                        'Reported GP',
                        'PTS/game',
                        'REB/game',
                        'AST/game',
                        'Individual raw points',
                        'Source evidence',
                      ].map((s) => (
                        <th key={s} scope="col">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.data.members.map((m) => (
                      <tr key={m.playerId}>
                        <th scope="row">
                          {m.name ? (
                            <Link to={`/players/${m.playerId}`}>{m.name}</Link>
                          ) : (
                            `Source identity unavailable (${m.playerId})`
                          )}
                        </th>
                        <td>{m.status}</td>
                        <td>{m.gamesPlayed ?? 'Unavailable'}</td>
                        <td>{m.pointsPerGame ?? 'Unavailable'}</td>
                        <td>{m.reboundsPerGame ?? 'Unavailable'}</td>
                        <td>{m.assistsPerGame ?? 'Unavailable'}</td>
                        <td>{m.individualRecordedPoints ?? 'Unavailable'}</td>
                        <td>
                          {m.sources.map((s) => (
                            <a
                              key={s.revision}
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {s.title};{' '}
                            </a>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResearchTable>
              <p>
                Joint performance unavailable. Sharing a team/roster does not establish
                minutes together. No joint scoring efficiency or win prediction is
                calculated.
              </p>
            </>
          )}
          {mode === 'teams' && teams.data && (
            <>
              <TeamTape data={teams.data} />
              <ResearchTable label="Equal-scope recorded team comparison">
                <table>
                  <caption>
                    Observed source-agreed regular-season samples, not official complete
                    standings
                  </caption>
                  <thead>
                    <tr>
                      {[
                        'Team',
                        'Observed GP',
                        'W',
                        'L',
                        'Win ratio',
                        'PTS/game',
                        'Opponent PTS/game',
                        'Mean final margin',
                      ].map((s) => (
                        <th key={s} scope="col">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teams.data.rows.map((r) => (
                      <tr key={r.team.id}>
                        <th scope="row">
                          <Link to={`/teams/${r.team.id}`}>{r.team.name}</Link>
                        </th>
                        <td>{r.observedGames}</td>
                        <td>{r.wins}</td>
                        <td>{r.losses}</td>
                        <td>{r.winPercentage?.toFixed(4) ?? 'Unavailable'}</td>
                        <td>{r.pointsPerGame?.toFixed(2) ?? 'Unavailable'}</td>
                        <td>{r.opponentPointsPerGame?.toFixed(2) ?? 'Unavailable'}</td>
                        <td>{r.finalMarginPerGame?.toFixed(2) ?? 'Unavailable'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResearchTable>
              <p>
                {teams.data.quarantinedGameIds.length} source game IDs quarantined
                globally. Final margin is not possession-based net rating.
              </p>
              <h2>Recorded source-agreed head-to-head games</h2>
              <ResearchTable label="Recorded head-to-head evidence">
                <table>
                  <caption>
                    {teams.data.headToHead.length} agreed meetings in 2023–24 regular
                    season
                  </caption>
                  <thead>
                    <tr>
                      {[
                        'Date',
                        'Away',
                        'Away score',
                        'Home',
                        'Home score',
                        'Actual source game',
                      ].map((s) => (
                        <th key={s} scope="col">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teams.data.headToHead.map((g) => (
                      <tr key={g.id}>
                        <th scope="row">{g.date}</th>
                        <td>{g.away.name}</td>
                        <td>{g.awayScore}</td>
                        <td>{g.home.name}</td>
                        <td>{g.homeScore}</td>
                        <td>
                          <a href={g.recapUrl} target="_blank" rel="noreferrer">
                            {g.id}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResearchTable>
              {teams.data.rows.map((r) => (
                <WikiAttribution key={r.team.id} data={r.source} />
              ))}
            </>
          )}
        </>
      )}
    </ResearchShell>
  );
}
