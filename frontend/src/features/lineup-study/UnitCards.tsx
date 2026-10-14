import type { StudyLineupRow } from '@nba-performance-explorer/contracts';
import { motion } from 'motion/react';

import { Stagger, StaggerItem, useSeen } from '../../motion/choreography';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { easings } from '../../motion/tokens';

function initials(aliases: readonly string[]) {
  const name = aliases[0] ?? '';
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Five-player units as cards: initials medallions, shared minutes on one page-wide scale and
 * plus/minus per 48 shared minutes around a zero line (shown only when the unit qualifies).
 */
export function UnitCards({ rows }: { rows: readonly StudyLineupRow[] }) {
  const allowed = useMotionAllowed();
  const [ref, seen] = useSeen<HTMLDivElement>(0.05);
  const maxMinutes = Math.max(1, ...rows.map((r) => r.minutesTogether));
  const maxRate = Math.max(
    1,
    ...rows.map((r) => (r.plusMinusPer48 === null ? 0 : Math.abs(r.plusMinusPer48))),
  );
  return (
    <div ref={ref}>
      <Stagger as="ul" className="units" gap={0.04}>
        {rows.map((row) => {
          const rate = row.plusMinusPer48;
          return (
            <StaggerItem as="li" key={row.id} className="unit">
              <div className="unit__head">
                <b>{row.team.abbreviation}</b>
                <span>{row.observedGames} games</span>
              </div>
              <div className="unit__five" aria-label="Five source members">
                {row.members.map((member) => (
                  <span
                    key={member.id}
                    className="unit__chip"
                    title={member.aliases.join(' / ')}
                  >
                    <i aria-hidden="true">{initials(member.aliases)}</i>
                    <span>{member.aliases[0]}</span>
                  </span>
                ))}
              </div>
              <div className="unit__metric">
                <span className="unit__label">Shared minutes</span>
                <span className="unit__bar" aria-hidden="true">
                  <motion.i
                    style={{ originX: 0 }}
                    initial={allowed ? { scaleX: 0 } : false}
                    animate={{ scaleX: seen ? row.minutesTogether / maxMinutes : 0 }}
                    transition={{ duration: 0.7, ease: easings.arena }}
                  />
                </span>
                <span className="unit__val num">{row.minutesTogether.toFixed(1)}</span>
              </div>
              <div className="unit__metric">
                <span className="unit__label">+/− per 48</span>
                <span className="unit__bar unit__bar--div" aria-hidden="true">
                  {rate === null ? null : (
                    <motion.i
                      className={rate < 0 ? 'is-neg' : 'is-pos'}
                      style={{ originX: rate < 0 ? 1 : 0 }}
                      initial={allowed ? { scaleX: 0 } : false}
                      animate={{ scaleX: seen ? Math.abs(rate) / maxRate : 0 }}
                      transition={{ duration: 0.7, ease: easings.arena, delay: 0.1 }}
                    />
                  )}
                </span>
                <span className="unit__val num">
                  {rate === null
                    ? 'Below min'
                    : `${rate > 0 ? '+' : ''}${rate.toFixed(1)}`}
                </span>
              </div>
              <p className="unit__raw">
                Joint +/− {row.plusMinus > 0 ? '+' : ''}
                {row.plusMinus} · {row.id}
              </p>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}
