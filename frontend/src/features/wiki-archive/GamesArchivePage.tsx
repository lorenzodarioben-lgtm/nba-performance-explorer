import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import { z } from 'zod';
import {
  ArchiveGameIdSchema,
  ArchiveGamesResponseSchema,
  ArchiveSeasonSchema,
  CanonicalTeamIdSchema,
  GameDateSchema,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import {
  QueryFeedback,
  ResearchShell,
  ResearchTable,
  SourceNote,
} from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { WikiAttribution } from './WikiAttribution';
import { shiftCalendarDate } from './calendar-date';
import styles from '../research/research.module.css';
const QuerySchema = z
  .object({
    season: ArchiveSeasonSchema.default('2023-24'),
    date: GameDateSchema.optional(),
    team: CanonicalTeamIdSchema.optional(),
  })
  .strict();
export function GamesArchivePage() {
  const { gameId } = useParams();
  const [params, setParams] = useSearchParams();
  const parsed = QuerySchema.safeParse(Object.fromEntries(params));
  const valid =
    parsed.success &&
    (!gameId || ArchiveGameIdSchema.safeParse(gameId).success) &&
    [...params.keys()].every((k) => params.getAll(k).length === 1) &&
    (!gameId || [...params.keys()].every((k) => k === 'season'));
  const query = useQuery({
    queryKey: ['research', 'games-archive', gameId ?? 'all'],
    queryFn: ({ signal }) =>
      fetchResearch(
        `/api/games${gameId ? `/${gameId}` : ''}?season=2023-24`,
        signal,
        ArchiveGamesResponseSchema.parse,
      ),
    enabled: valid,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = valid ? query.data : undefined;
  const date = parsed.success ? (parsed.data.date ?? data?.lastDate) : undefined;
  const teamId = parsed.success ? parsed.data.team : undefined;
  const games =
    data?.games.filter(
      (g) =>
        gameId ||
        ((!date || g.date === date) &&
          (!teamId || g.home.id === teamId || g.away.id === teamId)),
    ) ?? [];
  const teams = [
    ...new Map(
      data?.games.flatMap((g) => [
        [g.home.id, g.home] as const,
        [g.away.id, g.away] as const,
      ]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));
  const update = (key: string, value: string) => {
    const copy = new URLSearchParams(params);
    copy.set('season', '2023-24');
    if (value) copy.set(key, value);
    else copy.delete(key);
    setParams(copy);
  };
  const savedParams = new URLSearchParams(params);
  if (!gameId && date) savedParams.set('date', date);
  savedParams.set('season', '2023-24');
  return (
    <ResearchShell
      title={gameId ? 'Recorded playoff game' : 'Recorded playoff scoreboard'}
    >
      <p>
        Historical 2024 playoff games from a licensed Wikipedia snapshot. Every
        displayed game is a recorded final. Live, upcoming, regular-season games and
        current schedules are outside this source's coverage.
      </p>
      <Link to="/games">Recorded scoreboard</Link>{' '}
      <Link to="/standings">Historical standings</Link>
      {!valid ? (
        <p role="alert">
          Invalid recorded-game URL. <Link to="/games">Open supported snapshot</Link>
        </p>
      ) : (
        <QueryFeedback pending={query.isPending} failed={query.isError} />
      )}
      {data && (
        <>
          <SourceNote provenance={data.provenance} />
          <WikiAttribution data={data.attribution} />
          <p>
            {data.recordedGames} recorded games; source date coverage {data.firstDate}{' '}
            through {data.lastDate}. Source time zone is unverified; displayed game
            dates are calendar dates and no local tipoff conversion is attempted.
          </p>
          <SaveResearchButton
            kind="analysis"
            label={gameId ? `Recorded game ${gameId}` : 'Recorded playoff scoreboard'}
            path={`/games${gameId ? `/${gameId}` : ''}?${savedParams}`}
          />
          <label>
            Shareable recorded-game URL
            <input
              readOnly
              value={`${window.location.origin}/games${gameId ? `/${gameId}` : ''}?${savedParams}`}
            />
          </label>
          {!gameId && date && (
            <div className={styles.controls}>
              <button onClick={() => update('date', shiftCalendarDate(date, -1))}>
                Previous calendar day
              </button>
              <label>
                Recorded game date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => update('date', e.target.value)}
                />
              </label>
              <button onClick={() => update('date', shiftCalendarDate(date, 1))}>
                Next calendar day
              </button>
              <label>
                Scoreboard team
                <select
                  value={teamId ?? ''}
                  onChange={(e) => update('team', e.target.value)}
                >
                  <option value="">All recorded playoff teams</option>
                  {teamId && !teams.some((t) => t.id === teamId) && (
                    <option value={teamId}>{teamId} (not in snapshot)</option>
                  )}
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={() => update('date', data.lastDate)}>
                Last recorded date
              </button>
            </div>
          )}
          {!games.length && (
            <p role="status">
              No recorded playoff games match this date/team in the snapshot. This does
              not indicate whether other NBA games took place.
            </p>
          )}
          <ResearchTable label="Recorded final games">
            <table>
              <caption>{games.length} matching recorded finals</caption>
              <thead>
                <tr>
                  {[
                    'Date',
                    'Away',
                    'Away score',
                    'Home',
                    'Home score',
                    'Status',
                    'Game details',
                  ].map((s) => (
                    <th key={s} scope="col">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g.id}>
                    <th scope="row">{g.date}</th>
                    <td>
                      <Link to={`/teams/${g.away.id}`}>{g.away.name}</Link>
                    </td>
                    <td>{g.awayScore}</td>
                    <td>
                      <Link to={`/teams/${g.home.id}`}>{g.home.name}</Link>
                    </td>
                    <td>{g.homeScore}</td>
                    <td>
                      Final
                      {g.quarters.length > 4 ? ` · ${g.quarters.length - 4} OT` : ''}
                    </td>
                    <td>
                      <Link to={`/games/${g.id}`}>{g.id}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResearchTable>
          {gameId && games[0] && (
            <>
              <h2>
                {games[0].away.name} at {games[0].home.name}
              </h2>
              <p>
                Venue: {games[0].venue ?? 'Unavailable'}. Source-reported time:{' '}
                {games[0].reportedTime ?? 'Unavailable'} (time zone unverified). UTC
                tipoff, live period and clock are unavailable.
              </p>
              <ResearchTable label="Recorded period scores">
                <table>
                  <caption>
                    Published quarter and overtime scoring; sums reconciled to final
                    scores
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Period</th>
                      <th scope="col">{games[0].away.abbreviation}</th>
                      <th scope="col">{games[0].home.abbreviation}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {games[0].quarters.map((q) => (
                      <tr key={q.period}>
                        <th scope="row">
                          {q.period <= 4 ? `Q${q.period}` : `OT${q.period - 4}`}
                        </th>
                        <td>{q.away}</td>
                        <td>{q.home}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResearchTable>
              <h2>Published game category leaders</h2>
              <ResearchTable label="Published game leaders">
                <table>
                  <caption>
                    Source PTS/REB/AST leader labels; ties retained as published, not a
                    full player box score
                  </caption>
                  <thead>
                    <tr>
                      {[
                        'Team',
                        'Points leaders',
                        'Rebound leaders',
                        'Assist leaders',
                      ].map((s) => (
                        <th key={s} scope="col">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {games[0].leaders.map((l) => (
                      <tr key={l.teamId}>
                        <th scope="row">
                          {l.teamId === games[0]!.home.id
                            ? games[0]!.home.name
                            : games[0]!.away.name}
                        </th>
                        <td>{l.points ?? 'Unavailable'}</td>
                        <td>{l.rebounds ?? 'Unavailable'}</td>
                        <td>{l.assists ?? 'Unavailable'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResearchTable>
              <a href={games[0].recapUrl} target="_blank" rel="noreferrer">
                Source-linked NBA recap
              </a>
              <p>
                Full player/team box scores, shooting attempts, play-by-play, scoring
                runs and substitution/possession data are unavailable in this source
                slice.
              </p>
            </>
          )}
        </>
      )}
    </ResearchShell>
  );
}
