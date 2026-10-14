import { useId, useState } from 'react';

import type { PlayerGame } from '@nba-performance-explorer/contracts';

import { BarChart } from '../../charts/BarChart';
import { ChartLegend } from '../../charts/markers';
import { LoadingLine, Notice } from '../../ui/DataState';
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
      className={`result-badge ${isWin ? 'result-badge--w' : 'result-badge--l'}`}
    >
      {result}
    </abbr>
  );
}

function GameLogTable({
  games,
  season,
  highlight,
}: {
  games: PlayerGame[];
  season: string;
  highlight: string | null;
}) {
  return (
    <div
      role="group"
      aria-label={`Game log table for the ${season} season`}
      tabIndex={0}
      className="scroll-region max-w-full overflow-x-auto"
    >
      <table className="dtable gamelog">
        <caption>Game log for the {season} season.</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={column.numeric ? 'r' : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id} className={highlight === game.id ? 'is-hl' : undefined}>
              <th scope="row" className="num">
                {formatGameDate(game.date)}
              </th>
              <td>{game.team.abbreviation}</td>
              <td className="gamelog__matchup">
                {formatMatchup(game.location, game.opponent.abbreviation)}
              </td>
              <td>
                <ResultBadge result={game.result} />
              </td>
              <td className="num">{game.minutes}</td>
              <td className="num gamelog__pts">{game.points}</td>
              <td className="num">{game.rebounds}</td>
              <td className="num">{game.assists}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Points in every game of the season, oldest to newest; a loss is drawn in the muted tone. */
function GameLogChart({
  games,
  season,
  onHighlight,
}: {
  games: PlayerGame[];
  season: string;
  onHighlight: (gameId: string | null) => void;
}) {
  const chronological = [...games].reverse();
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div className="gamelog-chart" onPointerLeave={() => onHighlight(null)}>
      <ChartLegend
        items={[
          { id: 'w', label: 'Points in a win', color: '#cfcdc9' },
          { id: 'l', label: 'Points in a loss', color: '#6c6b69' },
        ]}
      />
      <BarChart
        label={`Points in each ${season} game, oldest to newest`}
        format={(value) => String(Math.round(value))}
        height={200}
        color="#cfcdc9"
        accent="#ef4444"
        selected={selected}
        onSelect={(index) => {
          const game = chronological[index];
          setSelected(index);
          onHighlight(game?.id ?? null);
        }}
        data={chronological.map((game) => ({
          key: game.id,
          label: `${formatGameDate(game.date)} ${formatMatchup(game.location, game.opponent.abbreviation)}`,
          value: game.points,
          tone: game.result === 'W' ? 'default' : 'muted',
          detail: [
            { label: 'Result', value: game.result === 'W' ? 'Win' : 'Loss' },
            { label: 'Minutes', value: String(game.minutes) },
            { label: 'Rebounds', value: String(game.rebounds) },
            { label: 'Assists', value: String(game.assists) },
          ],
        }))}
        tickLabel={(datum) => datum.label.split(' ').slice(0, 2).join(' ')}
      />
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
  const [highlight, setHighlight] = useState<string | null>(null);

  let content;

  if (gameLogQuery.isPending) {
    content = <LoadingLine>Loading game log...</LoadingLine>;
  } else if (gameLogQuery.isError) {
    const kind =
      gameLogQuery.error instanceof PlayerSeasonError
        ? gameLogQuery.error.kind
        : 'error';

    content = (
      <Notice tone="error" role="alert">
        {kind === 'season-not-found'
          ? 'The game log for that season is unavailable.'
          : 'The game log is unavailable. Please try again.'}
      </Notice>
    );
  } else if (gameLogQuery.data.season !== season) {
    content = <LoadingLine>Loading game log...</LoadingLine>;
  } else if (gameLogQuery.data.games.length === 0) {
    content = (
      <p role="status" aria-live="polite" className="pmod__empty">
        No games are available for the {season} season.
      </p>
    );
  } else {
    content = (
      <>
        {gameLogQuery.data.games.length > 1 ? (
          <GameLogChart
            games={gameLogQuery.data.games}
            season={season}
            onHighlight={setHighlight}
          />
        ) : null}
        <GameLogTable
          games={gameLogQuery.data.games}
          season={season}
          highlight={highlight}
        />
      </>
    );
  }

  return (
    <section aria-labelledby={headingId} className="gamelog-section">
      <h3 id={headingId} className="t-module">
        Game log
      </h3>
      {content}
    </section>
  );
}
