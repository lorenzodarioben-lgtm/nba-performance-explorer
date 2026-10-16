import type { ArchiveGame } from '@nba-performance-explorer/contracts';
import { motion } from 'motion/react';
import { Link } from 'react-router';

import { Stagger, StaggerItem, useSeen } from '../../motion/choreography';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { easings } from '../../motion/tokens';
import { Tape } from '../../ui/Tape';
import { TeamLogo } from '../../ui/TeamLogo';
import { seasonOfDate } from '../teams/teamLogos';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
export function calendarLabel(date: string) {
  const [year, month, day] = date.split('-');
  return `${MONTHS[Number(month) - 1] ?? month} ${Number(day)}, ${year}`;
}

const periodLabel = (period: number) =>
  period <= 4 ? `Q${period}` : `OT${period - 4}`;

/** A recorded final as a broadcast score card. Always "Final": nothing here is live. */
export function ScoreCards({ games }: { games: readonly ArchiveGame[] }) {
  return (
    <Stagger as="ul" className="scorecards" gap={0.05}>
      {games.map((game) => {
        const awayWon = game.awayScore > game.homeScore;
        const ot = game.quarters.length > 4 ? game.quarters.length - 4 : 0;
        return (
          <StaggerItem as="li" key={game.id}>
            <Link
              to={`/games/${game.id}`}
              className="scorecard"
              aria-label={`${game.away.name} ${game.awayScore}, ${game.home.name} ${game.homeScore}, final${ot ? `, ${ot} overtime` : ''}, ${calendarLabel(game.date)}`}
            >
              <span className="scorecard__status">
                Final{ot ? ` · ${ot} OT` : ''}
                <span>{calendarLabel(game.date)}</span>
              </span>
              <span
                className={`scorecard__team scorecard__team--logo ${awayWon ? 'is-won' : ''}`}
              >
                <TeamLogo team={game.away} season={seasonOfDate(game.date)} size={22} />
                <b>{game.away.abbreviation}</b>
                <span>{game.away.name}</span>
                <em className="num">{game.awayScore}</em>
              </span>
              <span
                className={`scorecard__team scorecard__team--logo ${awayWon ? '' : 'is-won'}`}
              >
                <TeamLogo team={game.home} season={seasonOfDate(game.date)} size={22} />
                <b>{game.home.abbreviation}</b>
                <span>{game.home.name}</span>
                <em className="num">{game.homeScore}</em>
              </span>
            </Link>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

/** The game page header: a broadcast score bug for a recorded final. */
export function GameHero({ game }: { game: ArchiveGame }) {
  const allowed = useMotionAllowed();
  const awayWon = game.awayScore > game.homeScore;
  const ot = game.quarters.length > 4 ? game.quarters.length - 4 : 0;
  const season = seasonOfDate(game.date);
  const side = (
    team: ArchiveGame['home'],
    score: number,
    won: boolean,
    delay: number,
  ) => (
    <motion.div
      className={`gamehero__side ${won ? 'is-won' : ''}`}
      initial={allowed ? { opacity: 0, y: 24 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: easings.arena, delay }}
    >
      <span className="gamehero__mark">
        <TeamLogo team={team} season={season} size={64} fallback="none" priority />
        <span className="gamehero__abbr">{team.abbreviation}</span>
      </span>
      <span className="gamehero__name">{team.name}</span>
      <span className="gamehero__score num">{score}</span>
    </motion.div>
  );
  return (
    <section className="gamehero" aria-label="Final score">
      <div className="gamehero__meta">
        <span className="gamehero__final">Final{ot ? ` · ${ot} OT` : ''}</span>
        <span>{calendarLabel(game.date)}</span>
        {game.venue ? <span>{game.venue}</span> : null}
        <Tape code="Archive" source="Wikipedia · CC BY-SA" variant="archive" />
      </div>
      <div className="gamehero__board">
        {side(game.away, game.awayScore, awayWon, 0.05)}
        <span className="gamehero__at" aria-hidden="true">
          at
        </span>
        {side(game.home, game.homeScore, !awayWon, 0.15)}
      </div>
    </section>
  );
}

/** Quarter-by-quarter line score with totals; the column of the leading side is emphasised. */
export function LineScore({ game }: { game: ArchiveGame }) {
  return (
    <div className="linescore" aria-hidden="true">
      <div className="linescore__row linescore__row--head">
        <span />
        {game.quarters.map((q) => (
          <span key={q.period}>{periodLabel(q.period)}</span>
        ))}
        <span>T</span>
      </div>
      {(['away', 'home'] as const).map((key) => (
        <div key={key} className="linescore__row">
          <span className="linescore__team">{game[key].abbreviation}</span>
          {game.quarters.map((q) => (
            <span
              key={q.period}
              className={
                q[key] > q[key === 'away' ? 'home' : 'away'] ? 'is-up' : undefined
              }
            >
              {q[key]}
            </span>
          ))}
          <span className="linescore__total">
            {key === 'away' ? game.awayScore : game.homeScore}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Margin flow (calculated from the published period scores): the home side's lead after each
 * period. Above the line the home team leads, below it the away team leads.
 */
export function MarginFlow({ game }: { game: ArchiveGame }) {
  const allowed = useMotionAllowed();
  const [ref, seen] = useSeen<HTMLDivElement>();
  // Running home lead after each period, from the published period scores.
  const points = game.quarters.map((q, index) => {
    const margin = game.quarters
      .slice(0, index + 1)
      .reduce((sum, period) => sum + period.home - period.away, 0);
    return { period: q.period, margin, swing: q.home - q.away };
  });
  const max = Math.max(4, ...points.map((p) => Math.abs(p.margin)));
  return (
    <div ref={ref} className="marginflow" aria-hidden="true">
      <span className="marginflow__label">↑ {game.home.abbreviation} (home) ahead</span>
      <div className="marginflow__bars">
        {points.map((point, index) => {
          const share = Math.abs(point.margin) / max;
          const up = point.margin >= 0;
          return (
            <div key={point.period} className="marginflow__col">
              <span className="marginflow__half marginflow__half--up">
                {up ? (
                  <motion.i
                    style={{ originY: 1 }}
                    initial={allowed ? { scaleY: 0 } : false}
                    animate={{ scaleY: seen ? share : 0 }}
                    transition={{
                      duration: 0.6,
                      ease: easings.arena,
                      delay: index * 0.08,
                    }}
                  />
                ) : null}
              </span>
              <span className="marginflow__half marginflow__half--down">
                {!up ? (
                  <motion.i
                    className="is-away"
                    style={{ originY: 0 }}
                    initial={allowed ? { scaleY: 0 } : false}
                    animate={{ scaleY: seen ? share : 0 }}
                    transition={{
                      duration: 0.6,
                      ease: easings.arena,
                      delay: index * 0.08,
                    }}
                  />
                ) : null}
              </span>
              <span className="marginflow__val num">
                {point.margin === 0
                  ? 'Tied'
                  : `${up ? game.home.abbreviation : game.away.abbreviation} +${Math.abs(point.margin)}`}
              </span>
              <span className="marginflow__period">{periodLabel(point.period)}</span>
            </div>
          );
        })}
      </div>
      <span className="marginflow__label marginflow__label--away">
        ↓ {game.away.abbreviation} (away) ahead
      </span>
    </div>
  );
}
