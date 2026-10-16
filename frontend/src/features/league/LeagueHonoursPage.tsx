import { useQuery } from '@tanstack/react-query';
import { PlayerAvatar } from '../../ui/PlayerAvatar';
import { TeamLogo } from '../../ui/TeamLogo';
import { Link, useSearchParams } from 'react-router';
import {
  LeagueHonoursResponseSchema,
  type LeagueHonoursResponse,
} from '@nba-performance-explorer/contracts';
import { ResearchShell, ResearchTable } from '../research/ResearchShell';
import styles from '../research/research.module.css';
import { fetchLeague, seasonDisplay } from './league-api';
import { LeagueFeedback, LeagueSourceNote } from './LeagueSourceNote';

type Champion = LeagueHonoursResponse['champions'][number];
const CHECKS: [keyof Champion['checks'], string][] = [
  ['franchiseTitles', 'NBA.com franchise titles'],
  ['franchiseSeason', 'NBA.com team-by-year'],
  ['finalsMvpTeam', 'Wikipedia Finals MVP team'],
];
const mark = (agrees: boolean | null) =>
  agrees === null ? 'No record' : agrees ? 'Agrees' : 'Disagrees';

/** Champions from the archived Finals, and award winners agreed by two sources. */
export function LeagueHonoursPage() {
  const [params, setParams] = useSearchParams();
  const award = params.get('award') ?? 'mvp';
  const query = useQuery({
    queryKey: ['league', 'honours'],
    queryFn: ({ signal }) =>
      fetchLeague('/api/league/honours', signal, LeagueHonoursResponseSchema.parse),
    retry: false,
    staleTime: Infinity,
  });
  const data = query.data;
  const valid =
    [...params.keys()].every((k) => k === 'award' && params.getAll(k).length === 1) &&
    (!data || data.awards.some((a) => a.id === award));
  const chosen = data?.awards.find((a) => a.id === award);
  const disagreements = (data?.champions ?? []).filter((c) =>
    Object.values(c.checks).some((x) => x.agrees === false),
  );
  return (
    <ResearchShell
      title="Champions and awards"
      lede={
        <p>
          Every champion since 1983–84, worked out from the archived Finals games and
          checked against NBA.com’s franchise records and Wikipedia. Award winners are
          listed only where NBA.com and Wikipedia agree on the player and the season.
        </p>
      }
    >
      <p>
        Also: <Link to="/history/awards">2023–24 award finalists and recipients</Link> ·{' '}
        <Link to="/history">Season archive</Link>
      </p>
      {!valid ? (
        <p role="alert">
          This honours link is not supported.{' '}
          <button type="button" onClick={() => setParams({})}>
            Show the MVPs
          </button>
        </p>
      ) : (
        <LeagueFeedback pending={query.isPending} error={query.error} />
      )}
      {data && valid ? (
        <>
          <h2 className="record-book__h">Champions</h2>
          <p className="team-note">
            {disagreements.length
              ? `${disagreements.length} season${disagreements.length === 1 ? '' : 's'} where a record disagrees: ${disagreements.map((c) => seasonDisplay(c.season)).join(', ')}.`
              : `All ${data.champions.length} champions agree with every record that covers them.`}
            {data.unsettled.length ? ` Not settled: ${data.unsettled.join(' ')}` : ''}
          </p>
          <ResearchTable label="Champions">
            <table>
              <caption>
                Finals winner, opponent and series result from the archived games; each
                check is another record of the same title
              </caption>
              <thead>
                <tr>
                  {[
                    'Season',
                    'Champion',
                    'Runner-up',
                    'Series',
                    'Finals MVP',
                    ...CHECKS.map((c) => c[1]),
                  ].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.champions.map((c) => (
                  <tr key={c.season}>
                    <th scope="row">
                      <Link to={`/standings?season=${c.season}`}>
                        {seasonDisplay(c.season)}
                      </Link>
                    </th>
                    <td>
                      <Link
                        to={`/teams/${c.champion.id}?season=${c.season}`}
                        className="withlogo"
                      >
                        <TeamLogo team={c.champion} season={c.season} size={28} />
                        {c.champion.name}
                      </Link>
                    </td>
                    <td>
                      <span className="withlogo">
                        <TeamLogo team={c.runnerUp} season={c.season} size={20} />
                        {c.runnerUp.name}
                      </span>
                    </td>
                    <td>
                      <Link to={`/games/${c.lastGame}`}>
                        {c.wins}–{c.losses}
                      </Link>
                    </td>
                    <td>
                      {c.finalsMvp ? (
                        <Link
                          to={`/players/${c.finalsMvp.playerId}/records`}
                          className="withface"
                        >
                          <PlayerAvatar
                            playerId={c.finalsMvp.playerId}
                            name={c.finalsMvp.name}
                            size={28}
                          />
                          {c.finalsMvp.name}
                        </Link>
                      ) : (
                        'Not confirmed'
                      )}
                    </td>
                    {CHECKS.map(([key]) => (
                      <td
                        key={key}
                        title={c.checks[key].detail}
                        data-agrees={String(c.checks[key].agrees)}
                      >
                        {mark(c.checks[key].agrees)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          <h2 className="record-book__h">Awards</h2>
          <div className={styles.controls}>
            <label>
              Award
              <select
                value={award}
                onChange={(e) =>
                  setParams(e.target.value === 'mvp' ? {} : { award: e.target.value })
                }
              >
                {data.awards.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {chosen ? (
            <ResearchTable label={`${chosen.label} winners`}>
              <table>
                <caption>
                  {chosen.winners.length} winners agreed by NBA.com and Wikipedia
                  {chosen.since < '1983-84'
                    ? `; the award dates from ${seasonDisplay(chosen.since)}, before the archive`
                    : ''}
                </caption>
                <thead>
                  <tr>
                    {['Season', 'Player', 'Team'].map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chosen.winners.map((w) => (
                    <tr key={`${w.season}-${w.playerId}`}>
                      <th scope="row">{seasonDisplay(w.season)}</th>
                      <td>
                        <Link
                          to={`/players/${w.playerId}/records`}
                          className="withface"
                        >
                          <PlayerAvatar playerId={w.playerId} name={w.name} size={32} />
                          {w.name}
                        </Link>
                      </td>
                      <td>{w.team}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResearchTable>
          ) : null}
          {data.notes.length ? (
            <>
              <h2 className="record-book__h">Where the sources differ</h2>
              <ul className="league-unavailable">
                {data.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </>
          ) : null}
          <ul className="league-unavailable" aria-label="Honours sources">
            {data.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} rel="noreferrer" target="_blank">
                  {s.label}
                </a>
                , retrieved {s.retrievedAt.slice(0, 10)}
              </li>
            ))}
          </ul>
          <LeagueSourceNote provenance={data.provenance} />
        </>
      ) : null}
    </ResearchShell>
  );
}
