import { Link } from 'react-router';
import type { LeagueGameSummary } from '@nba-performance-explorer/contracts';
import { longDate, statusLine } from './game-format';

export function GameCard({
  game: g,
  showDate = false,
}: {
  game: LeagueGameSummary;
  showDate?: boolean;
}) {
  const scored = g.home.score !== null && g.away.score !== null;
  const awayWon = scored && g.status === 'final' && g.away.score! > g.home.score!;
  const homeWon = scored && g.status === 'final' && g.home.score! > g.away.score!;
  const side = (s: LeagueGameSummary['home'], won: boolean) => (
    <span className={`scorecard__team ${won ? 'is-won' : ''}`}>
      <b>{s.team.abbreviation}</b>
      <span>
        {s.team.name}
        {s.record ? ` (${s.record})` : ''}
      </span>
      <em>{s.score ?? ''}</em>
    </span>
  );
  return (
    <Link
      to={`/games/${g.id}`}
      className={`scorecard scorecard--${g.status}`}
      aria-label={`${g.away.team.name}${scored ? ` ${g.away.score}` : ''} at ${g.home.team.name}${scored ? ` ${g.home.score}` : ''}, ${statusLine(g)}${showDate ? `, ${longDate(g.date)}` : ''}`}
    >
      <span className="scorecard__status">
        {statusLine(g)}
        <span>
          {showDate
            ? longDate(g.date)
            : (g.label ?? (g.neutralSite ? 'Neutral site' : ''))}
        </span>
      </span>
      {side(g.away, awayWon)}
      {side(g.home, homeWon)}
      {g.note && g.status !== 'final' ? (
        <small className="scorecard__note">{g.note}</small>
      ) : null}
    </Link>
  );
}
