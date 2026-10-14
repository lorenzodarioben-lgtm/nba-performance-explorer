import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { PlayoffBracketResponseSchema } from '@nba-performance-explorer/contracts';

import { fetchResearch } from '../research/api';
import { ROUND_NAMES, seriesForGame } from './bracket-layout';

/**
 * Where a recorded playoff game sits in its series: round, game number, the series score after
 * it and every other game of the series. Says nothing when the bracket source is unavailable.
 */
export function SeriesContext({ gameId }: { gameId: string }) {
  const bracket = useQuery({
    queryKey: ['research', 'playoff-bracket'],
    queryFn: ({ signal }) =>
      fetchResearch('/api/games/bracket', signal, PlayoffBracketResponseSchema.parse),
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
  const series = bracket.data ? seriesForGame(bracket.data.series, gameId) : null;
  if (!series) return null;
  const entry = series.games.find((g) => g.game.id === gameId)!;
  const [a, b] = series.teams;
  const [wa, wb] = entry.after;
  const state =
    wa === wb
      ? `Series tied ${wa}–${wb}`
      : `${wa > wb ? a.abbreviation : b.abbreviation} leads ${Math.max(wa, wb)}–${Math.min(wa, wb)}`;
  const clinched = series.winner && Math.max(wa, wb) === 4;
  return (
    <section className="seriesctx" aria-label="This game in its series">
      <span className="seriesctx__round">
        {series.round ? ROUND_NAMES[series.round] : 'Playoff series'} · Game{' '}
        {entry.number}
      </span>
      <b className="seriesctx__state">
        {clinched
          ? `${series.winner!.abbreviation} wins the series ${Math.max(wa, wb)}–${Math.min(wa, wb)}`
          : state}
      </b>
      <ol className="seriesctx__games">
        {series.games.map((g) => (
          <li key={g.game.id}>
            <Link
              to={`/games/${g.game.id}`}
              aria-current={g.game.id === gameId ? 'page' : undefined}
              className={g.winner.id === a.id ? 'is-a' : 'is-b'}
              aria-label={`Game ${g.number}: ${g.winner.abbreviation} won ${Math.max(g.game.homeScore, g.game.awayScore)}–${Math.min(g.game.homeScore, g.game.awayScore)}`}
            >
              G{g.number}
              <span aria-hidden="true">{g.winner.abbreviation}</span>
            </Link>
          </li>
        ))}
      </ol>
      <Link to={`/games/bracket?series=${series.id}`} className="seriesctx__go">
        Open the series
      </Link>
    </section>
  );
}
