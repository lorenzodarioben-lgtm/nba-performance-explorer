import { useId } from 'react';

import type { PlayerGame } from '@nba-performance-explorer/contracts';

import { formatGameDate, formatMatchup } from './game-format';
import { PlayerSeasonError } from './season-api';
import { usePlayerGameLogQuery } from './usePlayerGameLogQuery';

function GameLogTable({ games, season }: { games: PlayerGame[]; season: string }) {
  return (
    <div className="mt-4 max-w-full overflow-x-auto">
      <table className="min-w-[48rem] w-full border-collapse text-left text-sm">
        <caption className="mb-2 text-left text-sm text-zinc-600">
          Game log for the {season} season.
        </caption>
        <thead>
          <tr className="border-b border-zinc-300">
            {[
              'Date',
              'Team',
              'Matchup',
              'Result',
              'Minutes',
              'Points',
              'Rebounds',
              'Assists',
            ].map((heading) => (
              <th
                key={heading}
                scope="col"
                className="whitespace-nowrap py-2 pr-4 font-semibold text-zinc-700 last:pr-0"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id} className="border-b border-zinc-200">
              <th
                scope="row"
                className="whitespace-nowrap py-2 pr-4 font-medium text-zinc-950"
              >
                {formatGameDate(game.date)}
              </th>
              <td className="py-2 pr-4 text-zinc-800">{game.team.abbreviation}</td>
              <td className="whitespace-nowrap py-2 pr-4 text-zinc-800">
                {formatMatchup(game.location, game.opponent.abbreviation)}
              </td>
              <td className="py-2 pr-4 text-zinc-800">
                <abbr
                  aria-label={game.result === 'W' ? 'Win' : 'Loss'}
                  className="no-underline"
                >
                  {game.result}
                </abbr>
              </td>
              <td className="py-2 pr-4 text-zinc-800">{game.minutes}</td>
              <td className="py-2 pr-4 text-zinc-800">{game.points}</td>
              <td className="py-2 pr-4 text-zinc-800">{game.rebounds}</td>
              <td className="py-2 text-zinc-800">{game.assists}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PlayerGameLog({
  playerId,
  season,
}: {
  playerId: string;
  season: string;
}) {
  const headingId = useId();
  const gameLogQuery = usePlayerGameLogQuery(playerId, season);

  let content;

  if (gameLogQuery.isPending) {
    content = (
      <p role="status" aria-live="polite" className="mt-3 text-sm text-zinc-700">
        Loading game log...
      </p>
    );
  } else if (gameLogQuery.isError) {
    const kind =
      gameLogQuery.error instanceof PlayerSeasonError
        ? gameLogQuery.error.kind
        : 'error';

    content = (
      <p
        role="alert"
        className="mt-3 border-l-4 border-red-600 pl-3 text-sm text-red-800"
      >
        {kind === 'season-not-found'
          ? 'The game log for that season is unavailable.'
          : 'The game log is unavailable. Please try again.'}
      </p>
    );
  } else if (gameLogQuery.data.season !== season) {
    content = (
      <p role="status" aria-live="polite" className="mt-3 text-sm text-zinc-700">
        Loading game log...
      </p>
    );
  } else if (gameLogQuery.data.games.length === 0) {
    content = (
      <p role="status" aria-live="polite" className="mt-3 text-sm text-zinc-700">
        No games are available for the {season} season.
      </p>
    );
  } else {
    content = <GameLogTable games={gameLogQuery.data.games} season={season} />;
  }

  return (
    <section aria-labelledby={headingId} className="mt-8">
      <h3 id={headingId} className="text-xl font-bold text-zinc-950">
        Game log
      </h3>
      {content}
    </section>
  );
}
