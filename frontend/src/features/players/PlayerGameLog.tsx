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
// colour alone; the accessible Win/Loss label is preserved on the <abbr>.
function ResultBadge({ result }: { result: PlayerGame['result'] }) {
  const isWin = result === 'W';
  return (
    <abbr
      aria-label={isWin ? 'Win' : 'Loss'}
      className={`inline-flex h-5 w-5 items-center justify-center rounded-sm text-xs font-semibold no-underline ${
        isWin ? 'bg-ink text-surface' : 'border border-edge-strong text-ink-2'
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
      className="mt-5 max-w-full overflow-x-auto scroll-x rounded-md border border-edge"
    >
      <table className="min-w-[48rem] w-full border-collapse text-left text-sm">
        <caption className="px-4 pt-3 text-left text-sm text-ink-2">
          Game log for the {season} season.
        </caption>
        <thead>
          <tr className="border-b border-edge-strong bg-surface-sunken">
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={`whitespace-nowrap px-4 py-2 font-semibold text-ink-2 ${
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
              className="border-b border-edge last:border-b-0 hover:bg-surface-sunken"
            >
              <th
                scope="row"
                className="whitespace-nowrap px-4 py-2 font-medium tabular-nums text-ink"
              >
                {formatGameDate(game.date)}
              </th>
              <td className="px-4 py-2 text-ink-2">{game.team.abbreviation}</td>
              <td className="whitespace-nowrap px-4 py-2 text-ink-2">
                {formatMatchup(game.location, game.opponent.abbreviation)}
              </td>
              <td className="px-4 py-2">
                <ResultBadge result={game.result} />
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-ink">
                {game.minutes}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-ink">
                {game.points}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-ink">
                {game.rebounds}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-ink">
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
      <p role="status" aria-live="polite" className="mt-3 text-sm text-ink-2">
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
        className="mt-3 rounded-sm border border-edge bg-accent-quiet px-3 py-2 text-sm text-danger"
      >
        {kind === 'season-not-found'
          ? 'The game log for that season is unavailable.'
          : 'The game log is unavailable. Please try again.'}
      </p>
    );
  } else if (gameLogQuery.data.season !== season) {
    content = (
      <p role="status" aria-live="polite" className="mt-3 text-sm text-ink-2">
        Loading game log...
      </p>
    );
  } else if (gameLogQuery.data.games.length === 0) {
    content = (
      <p role="status" aria-live="polite" className="mt-3 text-sm text-ink-2">
        No games are available for the {season} season.
      </p>
    );
  } else {
    content = <GameLogTable games={gameLogQuery.data.games} season={season} />;
  }

  return (
    <section aria-labelledby={headingId} className="mt-10">
      <h3 id={headingId} className="text-xl font-bold tracking-tight text-ink">
        Game log
      </h3>
      {content}
    </section>
  );
}
