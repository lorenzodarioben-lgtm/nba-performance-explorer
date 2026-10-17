import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import {
  ArchiveGamesResponseSchema,
  ArchiveLeagueResponseSchema,
  type DirectoryTeam,
} from '@nba-performance-explorer/contracts';
import { fetchResearch } from '../research/api';
import { QueryFeedback, ResearchTable, SourceNote } from '../research/ResearchShell';
import { WikiAttribution } from './WikiAttribution';
import { readTeamArchiveState } from './team-archive-state';
export function TeamArchivePanel({ team }: { team: DirectoryTeam }) {
  const [params, setParams] = useSearchParams();
  const { parsed, valid } = readTeamArchiveState(params);
  const enabled = valid && parsed.data?.archive === '2023-24';
  const league = useQuery({
    queryKey: ['research', 'league-archive'],
    queryFn: ({ signal }) =>
      fetchResearch(
        '/api/standings?season=2023-24',
        signal,
        ArchiveLeagueResponseSchema.parse,
      ),
    enabled,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const games = useQuery({
    queryKey: ['research', 'games-archive', 'all'],
    queryFn: ({ signal }) =>
      fetchResearch(
        '/api/games?season=2023-24',
        signal,
        ArchiveGamesResponseSchema.parse,
      ),
    enabled,
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const standing = enabled
    ? league.data?.standings.find((r) => r.team.id === team.id)
    : undefined;
  const recorded = enabled
    ? (games.data?.games
        .filter((g) => g.home.id === team.id || g.away.id === team.id)
        .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)) ?? [])
    : [];
  const filtered = recorded.filter(
    (g) =>
      !parsed.success ||
      !parsed.data.side ||
      (parsed.data.side === 'home' ? g.home.id === team.id : g.away.id === team.id),
  );
  const ownScore = (g: (typeof recorded)[number]) =>
    g.home.id === team.id ? g.homeScore : g.awayScore;
  const opponentScore = (g: (typeof recorded)[number]) =>
    g.home.id === team.id ? g.awayScore : g.homeScore;
  const wins = filtered.filter((g) => ownScore(g) > opponentScore(g)).length;
  const avg = (metric: (g: (typeof recorded)[number]) => number) =>
    filtered.length
      ? (filtered.reduce((sum, g) => sum + metric(g), 0) / filtered.length).toFixed(2)
      : 'Unavailable';
  return (
    <section aria-label="Historical team snapshot">
      <h2>Historical team results</h2>
      <p>
        Optional licensed 2023–24 regular-season standings and recorded 2024 playoff
        results. Roster and regular-season results use the separate optional team-page
        snapshot below. Live team data remains unavailable.
      </p>
      {!valid ? (
        <p role="alert">
          Invalid historical team filters.{' '}
          <button onClick={() => setParams({})}>Reset team filters</button>
        </p>
      ) : !enabled ? (
        <button onClick={() => setParams({ archive: '2023-24' })}>
          Load recorded 2023-24 results
        </button>
      ) : (
        <>
          <QueryFeedback
            pending={league.isPending || games.isPending}
            failed={league.isError || games.isError}
          />
          <label>
            Shareable historical team URL
            <input
              readOnly
              value={`${window.location.origin}/teams/${team.id}?${params}`}
            />
          </label>
          {standing && (
            <>
              <h3>Recorded regular-season standing</h3>
              <p>
                {standing.wins}–{standing.losses} over {standing.gamesPlayed} games;{' '}
                {(standing.winPercentage * 100).toFixed(2)}% wins; source{' '}
                {standing.conference} rank {standing.rank}; games behind{' '}
                {standing.gamesBehind ?? 'Unavailable'}.
              </p>
              <SourceNote provenance={league.data!.provenance} />
              <WikiAttribution data={league.data!.attribution} />
            </>
          )}
          {games.data && (
            <>
              <SourceNote provenance={games.data.provenance} />
              <WikiAttribution data={games.data.attribution} />
              <h3>Observed playoff results</h3>
              <label>
                Recorded venue filter
                <select
                  value={parsed.data?.side ?? ''}
                  onChange={(e) => {
                    const copy = new URLSearchParams(params);
                    if (e.target.value) copy.set('side', e.target.value);
                    else copy.delete('side');
                    setParams(copy);
                  }}
                >
                  <option value="">Home and away</option>
                  <option value="home">Home</option>
                  <option value="away">Away</option>
                </select>
              </label>
              <p>
                {wins} wins, {filtered.length - wins} losses in {filtered.length}{' '}
                matching recorded finals. Recent form, up to 10 matching games:{' '}
                {filtered
                  .slice(-10)
                  .map((g) => (ownScore(g) > opponentScore(g) ? 'W' : 'L'))
                  .join(' ') || 'Unavailable'}
                .
              </p>
              <p>
                Recorded points per game {avg(ownScore)}; opponent points per game{' '}
                {avg(opponentScore)}; mean final margin{' '}
                {avg((g) => ownScore(g) - opponentScore(g))}. These are scoring
                summaries, not possession ratings or a regular-season record.
              </p>
              {!filtered.length && (
                <p role="status">
                  No matching recorded playoff games. No participation or regular-season
                  results are inferred.
                </p>
              )}
              <ResearchTable label="Recorded team playoff results">
                <table>
                  <caption>Chronological recorded playoff games only</caption>
                  <thead>
                    <tr>
                      {[
                        'Date',
                        'Venue',
                        'Opponent',
                        'Team score',
                        'Opponent score',
                        'Result',
                        'Details',
                      ].map((s) => (
                        <th key={s} scope="col">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((g) => (
                      <tr key={g.id}>
                        <th scope="row">{g.date}</th>
                        <td>{g.home.id === team.id ? 'Home' : 'Away'}</td>
                        <td>
                          <Link
                            to={`/teams/${g.home.id === team.id ? g.away.id : g.home.id}`}
                          >
                            {g.home.id === team.id ? g.away.name : g.home.name}
                          </Link>
                        </td>
                        <td>{ownScore(g)}</td>
                        <td>{opponentScore(g)}</td>
                        <td>{ownScore(g) > opponentScore(g) ? 'W' : 'L'}</td>
                        <td>
                          <Link to={`/games/${g.id}`}>{g.id}</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ResearchTable>
            </>
          )}
        </>
      )}
    </section>
  );
}
