import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { PlayerAvatar } from '../../ui/PlayerAvatar';
import { TeamLogo } from '../../ui/TeamLogo';
import { z } from 'zod';
import {
  CanonicalTeamIdSchema,
  LeagueCalendarResponseSchema,
  LeagueGamesResponseSchema,
  LeagueSnapshotResponseSchema,
  type LeagueGameSummary,
  type LeagueSnapshotResponse,
} from '@nba-performance-explorer/contracts';
import { ResearchShell } from '../research/ResearchShell';
import { getSceneImage } from '../../ui/sceneImages';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import styles from '../research/research.module.css';
import { fetchLeague, seasonDisplay } from './league-api';
import { LeagueFeedback, LeagueSourceNote } from './LeagueSourceNote';
import { GameCard } from './GameCard';
import { longDate } from './game-format';

const QuerySchema = z
  .object({
    date: z.iso.date().optional(),
    team: CanonicalTeamIdSchema.optional(),
    // Older links to the recorded 2024 playoff scoreboard carried a season; it is ignored here.
    season: z.literal('2023-24').optional(),
  })
  .strict();
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** The scoreboard: any date in the archive or NBA.com's current schedule. */
const BUZZER = getSceneImage('kawhi-buzzer');

/**
 * The scoreboard's header photograph: editorial imagery, never a picture of the date or
 * game on screen.
 */
function ScoreboardBackdrop() {
  if (!BUZZER) return null;
  return (
    <figure className="gameshot">
      <img
        src={BUZZER.src}
        srcSet={BUZZER.srcSet}
        sizes="(max-width: 767px) 100vw, min(66vw, 880px)"
        width={BUZZER.width}
        height={BUZZER.height}
        alt={BUZZER.alt}
        fetchPriority="high"
        decoding="async"
        style={{ objectPosition: BUZZER.objectPosition }}
      />
    </figure>
  );
}

export function LeagueGamesPage() {
  const [params, setParams] = useSearchParams();
  const parsed = QuerySchema.safeParse(Object.fromEntries(params));
  const valid =
    parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1);
  const q = parsed.success ? parsed.data : {};
  const api = new URLSearchParams();
  if (q.date) api.set('date', q.date);
  if (q.team) api.set('team', q.team);
  const games = useQuery({
    queryKey: ['league', 'games', api.toString()],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/games${api.size ? `?${api}` : ''}`,
        signal,
        LeagueGamesResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 20_000,
    refetchInterval: (query) =>
      query.state.data?.games.some((g) => g.status === 'live') ? 30_000 : false,
    refetchOnWindowFocus: false,
  });
  const date = games.data?.date;
  const month = date?.slice(0, 7);
  const calendar = useQuery({
    queryKey: ['league', 'calendar', month],
    queryFn: ({ signal }) =>
      fetchLeague(
        `/api/league/calendar?month=${month}`,
        signal,
        LeagueCalendarResponseSchema.parse,
      ),
    enabled: valid && Boolean(month),
    retry: false,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
  const snapshot = useQuery({
    queryKey: ['league', 'snapshot'],
    queryFn: ({ signal }) =>
      fetchLeague('/api/league/snapshot', signal, LeagueSnapshotResponseSchema.parse),
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const go = (patch: Record<string, string | null>) => {
    const copy = new URLSearchParams(params);
    copy.delete('season');
    for (const [k, v] of Object.entries(patch)) {
      if (v) copy.set(k, v);
      else copy.delete(k);
    }
    setParams(copy);
  };
  const data = valid ? games.data : undefined;
  const days = new Map((calendar.data?.days ?? []).map((d) => [d.date, d]));
  const path = `/games${params.size ? `?${params}` : ''}`;
  return (
    <ResearchShell
      title="Scoreboard"
      backdrop={<ScoreboardBackdrop />}
      lede={
        <p>
          Games on any date: every result since 1983–84 from the archive, and NBA.com’s
          current schedule with scheduled, live, final and postponed states as NBA.com
          reports them. Tip-off times show in your time zone.
        </p>
      }
    >
      <p>
        Also: <Link to="/games/bracket">2024 playoff bracket</Link> ·{' '}
        <Link to="/games/recorded">Recorded 2024 playoff games (Wikipedia)</Link> ·{' '}
        <Link to="/standings">Standings</Link>
      </p>
      {!valid ? (
        <p role="alert">
          This scoreboard link is not supported.{' '}
          <button type="button" onClick={() => setParams({})}>
            Show today
          </button>
        </p>
      ) : (
        <LeagueFeedback pending={games.isPending} error={games.error} />
      )}
      {data ? (
        <>
          <div className={styles.controls}>
            <button
              type="button"
              disabled={!data.previousDate}
              onClick={() => go({ date: data.previousDate })}
            >
              Previous game day
            </button>
            <label>
              Date
              <input
                type="date"
                value={data.date}
                onChange={(e) => go({ date: e.target.value || null })}
              />
            </label>
            <button
              type="button"
              disabled={!data.nextDate}
              onClick={() => go({ date: data.nextDate })}
            >
              Next game day
            </button>
            {q.team ? (
              <button type="button" onClick={() => go({ team: null })}>
                All teams
              </button>
            ) : null}
          </div>
          {month ? (
            <nav className="game-calendar" aria-label={`Game days in ${month}`}>
              <div className="game-calendar__head" aria-hidden="true">
                {WEEKDAYS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <ol className="game-calendar__grid">
                {monthCells(month).map((cell, i) =>
                  cell ? (
                    <li key={cell}>
                      <button
                        type="button"
                        className="reset game-calendar__day"
                        aria-pressed={cell === data.date}
                        aria-label={`${longDate(cell)}: ${days.get(cell)?.games ?? 0} games`}
                        disabled={!days.get(cell)?.games}
                        onClick={() => go({ date: cell })}
                      >
                        <b>{Number(cell.slice(8))}</b>
                        {days.get(cell)?.games ? (
                          <small>{days.get(cell)!.games}</small>
                        ) : null}
                      </button>
                    </li>
                  ) : (
                    <li key={`blank-${i}`} aria-hidden="true" />
                  ),
                )}
              </ol>
            </nav>
          ) : null}
          <h2 className="games-day">{longDate(data.date)}</h2>
          {data.games.length ? (
            <ul className="scorecards">
              {data.games.map((g) => (
                <li key={g.id}>
                  <GameCard game={g} />
                </li>
              ))}
            </ul>
          ) : (
            <p role="status">
              No games {q.team ? 'for this team ' : ''}on this date in the archive or
              NBA.com’s schedule.
            </p>
          )}
          {data.performers.some((p) => p.rows.length) ? (
            <section className="pmod" aria-labelledby="top-performances">
              <h2 id="top-performances">Top performances</h2>
              <p className="team-note">
                The day’s leading box-score marks across all games, ties included. A
                record of what happened, not an award.
              </p>
              <div className="snapshot-grid">
                {data.performers.map((p) => (
                  <div key={p.key}>
                    <h3>{p.label}</h3>
                    <ol>
                      {p.rows.map((r) => (
                        <li key={`${r.playerId}-${r.gameId}`}>
                          <Link to={`/players/${r.playerId}`} className="withface">
                            <PlayerAvatar
                              playerId={r.playerId}
                              name={r.name}
                              size={24}
                            />
                            {r.name}
                          </Link>{' '}
                          ({r.team}) <b>{r.value}</b>{' '}
                          <Link to={`/games/${r.gameId}`}>vs {r.opponent}</Link>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <p className="team-note">{data.coverage}</p>
          <SaveResearchButton
            kind="analysis"
            label={`Games on ${data.date}`}
            path={path}
          />
          <LeagueSourceNote provenance={data.provenance} />
        </>
      ) : null}
      {snapshot.data ? <Snapshot data={snapshot.data} /> : null}
    </ResearchShell>
  );
}

function Snapshot({ data }: { data: LeagueSnapshotResponse }) {
  const list = (games: LeagueGameSummary[], empty: string) =>
    games.length ? (
      <ul className="scorecards">
        {games.map((g) => (
          <li key={g.id}>
            <GameCard game={g} showDate />
          </li>
        ))}
      </ul>
    ) : (
      <p role="status">{empty}</p>
    );
  return (
    <section className="pmod" aria-labelledby="league-snapshot">
      <h2 id="league-snapshot">League snapshot</h2>
      <p>
        <strong>
          {seasonDisplay(data.season)} regular season, final as of {longDate(data.asOf)}
          .
        </strong>{' '}
        {data.current
          ? `NBA.com’s ${data.current.season.replace('-', '–')} schedule: ${data.current.phase === 'preseason' ? `preseason under way${data.current.regularSeasonStart ? `; the regular season starts ${longDate(data.current.regularSeasonStart)}` : ''}` : data.current.phase === 'regular-season' ? 'regular season under way' : data.current.phase === 'postseason' ? 'regular season complete' : 'not started'}.`
          : 'NBA.com’s current schedule could not be reached.'}
      </p>
      <div className="snapshot-grid">
        {data.conferenceLeaders.map((c) => (
          <div key={c.conference}>
            <h3>{c.conference} leaders</h3>
            <ol>
              {c.teams.map((t) => (
                <li key={t.team.id}>
                  <Link
                    to={`/teams/${t.team.id}?season=${data.season}`}
                    className="withlogo"
                  >
                    <TeamLogo team={t.team} season={data.season} size={20} />
                    {t.team.name}
                  </Link>{' '}
                  {t.wins}–{t.losses}
                </li>
              ))}
            </ol>
          </div>
        ))}
        <div>
          <h3>Per-game leaders</h3>
          <ul>
            {data.statLeaders.map((l) => (
              <li key={l.metric}>
                {l.label}:{' '}
                <Link to={`/players/${l.playerId}`} className="withface">
                  <PlayerAvatar playerId={l.playerId} name={l.name} size={24} />
                  {l.name}
                </Link>{' '}
                ({l.team}) {l.value.toFixed(1)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <h3>Recently completed</h3>
      {list(data.recent, 'No completed games in NBA.com’s current schedule yet.')}
      <h3>Coming up</h3>
      {list(data.upcoming, 'No upcoming games in NBA.com’s current schedule.')}
      <LeagueSourceNote provenance={data.provenance} />
    </section>
  );
}

/** Calendar cells for a month, Monday first; null pads the first week. */
function monthCells(month: string): (string | null)[] {
  const first = new Date(`${month}-01T12:00:00Z`);
  const pad = (first.getUTCDay() + 6) % 7;
  const daysIn = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return [
    ...Array.from({ length: pad }, () => null),
    ...Array.from(
      { length: daysIn },
      (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`,
    ),
  ];
}
