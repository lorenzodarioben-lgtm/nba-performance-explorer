import { useId } from 'react';

import type { PlayerGame } from '@nba-performance-explorer/contracts';

import { formatGameDate, formatMatchup } from './game-format';
import { PlayerSeasonError } from './season-api';
import { usePlayerGameLogQuery } from './usePlayerGameLogQuery';

const columns = [
  { label: 'Date', numeric: false },
  { label: 'Team', numeric: false },
  { label: 'Matchup', numeric: false },
  { label: 'Result', numeric: false },
  { label: 'Minutes', numeric: true },
  { label: 'Points', numeric: true },
  { label: 'Rebounds', numeric: true },
  { label: 'Assists', numeric: true },
] as const;

// The win/loss marker is distinguished by fill versus outline (and the letter itself), never by
// colour alone; the accessible Win/Loss label is preserved on the <abbr>. On the dark table a win
// is a filled light chip and a loss is an outline.
function ResultBadge({ result }: { result: PlayerGame['result'] }) {
  const isWin = result === 'W';
  return (
    <abbr
      aria-label={isWin ? 'Win' : 'Loss'}
      className={`inline-flex h-5 w-5 items-center justify-center rounded-sm text-xs font-semibold no-underline ${
        isWin ? 'bg-chalk text-night' : 'border border-white/25 text-white/70'
      }`}
    >
      {result}
    </abbr>
  );
}

function GameLogTable({ games, season }: { games: PlayerGame[]; season: string }) {
  return (
    <div
      role="group"
      aria-label={`Game log table for the ${season} season`}
      tabIndex={0}
      className="scroll-x-dark mt-5 max-w-full overflow-x-auto rounded-md border border-white/10"
    >
      <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
        <caption className="px-4 pt-3 text-left text-sm text-white/70">
          Game log for the {season} season.
        </caption>
        <thead>
          <tr className="border-b border-white/15 bg-white/5">
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={`whitespace-nowrap px-4 py-2 font-semibold text-white/60 ${
                  column.numeric ? 'text-right' : 'text-left'
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr
              key={game.id}
              className="border-b border-white/10 last:border-b-0 hover:bg-white/5"
            >
              <th
                scope="row"
                className="whitespace-nowrap px-4 py-2 font-medium tabular-nums text-chalk"
              >
                {formatGameDate(game.date)}
              </th>
              <td className="px-4 py-2 text-white/70">{game.team.abbreviation}</td>
              <td className="whitespace-nowrap px-4 py-2 text-white/70">
                {formatMatchup(game.location, game.opponent.abbreviation)}
              </td>
              <td className="px-4 py-2">
                <ResultBadge result={game.result} />
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-chalk">
                {game.minutes}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-chalk">
                {game.points}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-chalk">
                {game.rebounds}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-chalk">
                {game.assists}
              </td>
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
      <p role="status" aria-live="polite" className="mt-3 text-sm text-white/70">
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
        className="mt-3 rounded-sm border border-white/10 bg-accent/15 px-3 py-2 text-sm text-red-100"
      >
        {kind === 'season-not-found'
          ? 'The game log for that season is unavailable.'
          : 'The game log is unavailable. Please try again.'}
      </p>
    );
  } else if (gameLogQuery.data.season !== season) {
    content = (
      <p role="status" aria-live="polite" className="mt-3 text-sm text-white/70">
        Loading game log...
      </p>
    );
  } else if (gameLogQuery.data.games.length === 0) {
    content = (
      <p role="status" aria-live="polite" className="mt-3 text-sm text-white/70">
        No games are available for the {season} season.
      </p>
    );
  } else {
    content = <GameLogTable games={gameLogQuery.data.games} season={season} />;
  }

  return (
    <section aria-labelledby={headingId} className="mt-10">
      <h3
        id={headingId}
        className="display text-2xl font-extrabold uppercase text-chalk"
      >
        Game log
      </h3>
      {content}
    </section>
  );
}
