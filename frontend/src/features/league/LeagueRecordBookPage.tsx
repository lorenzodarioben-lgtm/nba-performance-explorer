import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { PlayerAvatar } from '../../ui/PlayerAvatar';
import {
  LeagueRecordsQuerySchema,
  LeagueRecordsResponseSchema,
  type LeagueRecordCategory,
} from '@nba-performance-explorer/contracts';
import { ResearchShell, ResearchTable } from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';
import { LineChart } from '../../charts/LineChart';
import { fetchLeague, seasonDisplay } from './league-api';
import { LeagueFeedback, LeagueSourceNote } from './LeagueSourceNote';

const CATEGORIES: [LeagueRecordCategory, string][] = [
  ['points', 'Points'],
  ['rebounds', 'Rebounds'],
  ['assists', 'Assists'],
  ['steals', 'Steals'],
  ['blocks', 'Blocks'],
  ['threesMade', '3-pointers made'],
  ['fieldGoalsMade', 'Field goals made'],
  ['freeThrowsMade', 'Free throws made'],
  ['offensiveRebounds', 'Offensive rebounds'],
];
/** The season's leaderboard for the same measure, where the leaders page has it. */
function leaderLink(
  season: string,
  q: {
    category: LeagueRecordCategory;
    kind: 'game' | 'season';
    mode: 'totals' | 'per-game';
    scope: string;
  },
) {
  const p = new URLSearchParams({ season });
  if (q.category !== 'fieldGoalsMade' && q.category !== 'freeThrowsMade')
    p.set('metric', q.category);
  if (q.kind === 'season' && q.mode === 'totals') p.set('mode', 'totals');
  if (q.scope === 'playoffs') p.set('scope', 'playoffs');
  return `/leaders?${p}`;
}
const KIND_LABEL = { first: 'Opening mark', new: 'New record', tie: 'Tied' } as const;

/** Single-game and single-season records within the archive, with their progression. */
export function LeagueRecordBookPage() {
  const [params, setParams] = useSearchParams();
  const parsed = LeagueRecordsQuerySchema.safeParse(Object.fromEntries(params));
  const valid =
    parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const q = parsed.success ? parsed.data : LeagueRecordsQuerySchema.parse({});
  const query = useQuery({
    queryKey: ['league', 'records', params.toString()],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/records?${params}`,
        signal,
        LeagueRecordsResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const update = (key: string, value: string | null) => {
    const copy = new URLSearchParams(params);
    if (value) copy.set(key, value);
    else copy.delete(key);
    setParams(copy);
  };
  const data = valid ? query.data : undefined;
  const label = CATEGORIES.find(([k]) => k === q.category)?.[1] ?? q.category;
  const fmt = (v: number) =>
    Number.isInteger(v) ? v.toLocaleString('en-US') : v.toFixed(1);
  const path = `/history/record-book${params.size ? `?${params}` : ''}`;
  return (
    <ResearchShell
      title="Record book"
      lede={
        <p>
          The best single games and seasons in the archive, by category, for the regular
          season or the playoffs, and how each record was set and tied over time. Only
          seasons whose box scores add up are counted, so these are archive records, not
          all-time NBA records.
        </p>
      }
    >
      <p>
        Also: <Link to="/leaders">League leaders by season</Link> ·{' '}
        <Link to="/history/records">Recorded 2023–24 game extremes</Link>
      </p>
      {!valid ? (
        <p role="alert">
          This record link is not supported.{' '}
          <button type="button" onClick={() => setParams({})}>
            Show points in a game
          </button>
        </p>
      ) : (
        <LeagueFeedback pending={query.isPending} error={query.error} />
      )}
      <div className={styles.controls}>
        <label>
          Record
          <select
            value={q.kind}
            onChange={(e) =>
              update('kind', e.target.value === 'game' ? null : e.target.value)
            }
          >
            <option value="game">Single game</option>
            <option value="season">Single season</option>
          </select>
        </label>
        <label>
          Games
          <select
            value={q.scope}
            onChange={(e) =>
              update(
                'scope',
                e.target.value === 'regular-season' ? null : e.target.value,
              )
            }
          >
            <option value="regular-season">Regular season</option>
            <option value="playoffs">Playoffs</option>
          </select>
        </label>
        <label>
          Category
          <select
            value={q.category}
            onChange={(e) =>
              update('category', e.target.value === 'points' ? null : e.target.value)
            }
          >
            {CATEGORIES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {q.kind === 'season' ? (
          <label>
            Measure
            <select
              value={q.mode}
              onChange={(e) =>
                update('mode', e.target.value === 'totals' ? null : e.target.value)
              }
            >
              <option value="totals">Season total</option>
              <option value="per-game">Per game (qualified)</option>
            </select>
          </label>
        ) : null}
      </div>
      {data ? (
        <>
          <p>
            <strong>{data.definition}</strong> Covers {data.coverage.included.length}{' '}
            seasons; {data.coverage.excluded.length} are excluded because their box
            scores are incomplete.
          </p>
          <ResearchTable label="Records table">
            <table>
              <caption>
                Top ten {label.toLowerCase()} {q.kind === 'game' ? 'games' : 'seasons'},
                plus every tie with the tenth
              </caption>
              <thead>
                <tr>
                  {[
                    'Rank',
                    label,
                    'Player',
                    'Season',
                    'Team',
                    q.kind === 'game' ? 'Game' : 'Games',
                  ].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.records.map((r, i) => (
                  <tr key={`${r.playerId}-${r.game?.id ?? r.season}-${i}`}>
                    <td>
                      {data.records.filter((x) => x.rank === r.rank).length > 1
                        ? `T-${r.rank}`
                        : r.rank}
                    </td>
                    <td>{fmt(r.value)}</td>
                    <th scope="row">
                      <Link to={`/players/${r.playerId}`} className="withface">
                        <PlayerAvatar playerId={r.playerId} name={r.name} size={28} />
                        {r.name}
                      </Link>
                    </th>
                    <td>
                      <Link to={leaderLink(r.season, q)}>
                        {seasonDisplay(r.season)}
                      </Link>
                    </td>
                    <td>{r.teams.map((t) => t.abbreviation).join(' / ')}</td>
                    <td>
                      {r.game ? (
                        <Link to={`/games/nba:${r.game.id}`}>
                          {r.game.date} {r.game.home ? 'vs' : '@'}{' '}
                          {r.game.opponent.abbreviation} ({r.game.won ? 'W' : 'L'})
                        </Link>
                      ) : (
                        r.gamesPlayed
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>

          <h2 className="record-book__h">How the record moved</h2>
          {data.progression.length > 1 ? (
            <LineChart
              label={`${label} record progression`}
              categories={data.progression.map((p) => p.game?.date ?? p.season)}
              series={[
                {
                  id: 'record',
                  label: 'Record',
                  color: 'var(--red-hi)',
                  values: data.progression.map((p) => p.value),
                },
              ]}
              format={fmt}
              height={220}
            />
          ) : null}
          <ResearchTable label="Record progression">
            <table>
              <caption>
                Each {q.kind === 'game' ? 'performance' : 'season'} that set or tied the
                best mark so far, in date order; the first row is the best of the first
                covered season
              </caption>
              <thead>
                <tr>
                  {['When', label, 'Player', 'Team', 'Event'].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.progression.map((p, i) => (
                  <tr key={`${p.playerId}-${p.game?.id ?? p.season}-${i}`}>
                    <td>{p.game?.date ?? seasonDisplay(p.season)}</td>
                    <td>{fmt(p.value)}</td>
                    <th scope="row">
                      <Link to={`/players/${p.playerId}`} className="withface">
                        <PlayerAvatar playerId={p.playerId} name={p.name} size={24} />
                        {p.name}
                      </Link>
                    </th>
                    <td>{p.teams.map((t) => t.abbreviation).join(' / ')}</td>
                    <td>{KIND_LABEL[p.kind]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <details>
            <summary>Seasons covered and excluded</summary>
            <p>Covered: {data.coverage.included.map(seasonDisplay).join(', ')}.</p>
            <ul>
              {data.coverage.excluded.map((e) => (
                <li key={e.season}>
                  {seasonDisplay(e.season)}: {e.reason}
                </li>
              ))}
            </ul>
          </details>
          <SaveResearchButton
            kind="analysis"
            label={`${label} ${q.kind === 'game' ? 'game' : 'season'} records`}
            path={path}
          />
          <LeagueSourceNote provenance={data.provenance} />
        </>
      ) : null}
    </ResearchShell>
  );
}
