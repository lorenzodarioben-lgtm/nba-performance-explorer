import { motion } from 'motion/react';
import type { TeamSeasonSplit } from '@nba-performance-explorer/contracts';

import { useSeen } from '../../motion/choreography';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { easings } from '../../motion/tokens';
import { Slate } from '../../ui/Slate';
import { percent, signed } from './team-season-format';

const GROUPS: readonly { id: TeamSeasonSplit['group']; label: string }[] = [
  { id: 'overall', label: 'Season' },
  { id: 'venue', label: 'Venue' },
  { id: 'opponent', label: 'Opponent' },
  { id: 'rest', label: 'Rest' },
  { id: 'margin', label: 'Game type' },
  { id: 'month', label: 'Month' },
];

/**
 * Every split as one row of a board: record, a win-percentage bar on a shared 0–100% scale with
 * the season rate marked, and margin per game. A table, so the numbers are read in order.
 */
export function SplitBoard({
  splits,
  chronologyKnown,
}: {
  splits: readonly TeamSeasonSplit[];
  chronologyKnown: boolean;
}) {
  const allowed = useMotionAllowed();
  const [ref, seen] = useSeen<HTMLDivElement>();
  const season = splits.find((s) => s.key === 'all')?.winPercentage ?? null;
  return (
    <section className="pmod" aria-labelledby="season-splits">
      <Slate
        id="season-splits"
        title="Splits"
        tapes={[{ code: 'FROM AGREED FINALS', variant: 'derived' }]}
        meta={['Verified games only', 'Under 5 games: small sample']}
      />
      <div ref={ref} className="splitboard">
        <table>
          <caption className="sr-only">
            Win-loss record, win percentage, points and margin per game for each split.
          </caption>
          <thead>
            <tr>
              <th scope="col">Split</th>
              <th scope="col">W–L</th>
              <th scope="col">Win %</th>
              <th scope="col">
                <span aria-hidden="true">Rate</span>
                <span className="sr-only">Win rate bar</span>
              </th>
              <th scope="col">PF</th>
              <th scope="col">PA</th>
              <th scope="col">Margin</th>
            </tr>
          </thead>
          {GROUPS.map((group) => {
            const rows = splits.filter((s) => s.group === group.id);
            if (!rows.length) return null;
            return (
              <tbody key={group.id}>
                <tr className="splitboard__group">
                  <th scope="rowgroup" colSpan={7}>
                    {group.label}
                  </th>
                </tr>
                {rows.map((split, index) => (
                  <tr
                    key={split.key}
                    className={split.smallSample ? 'is-small' : undefined}
                    data-split={split.key}
                  >
                    <th scope="row" title={split.definition}>
                      {split.label}
                      {split.smallSample ? (
                        <span className="splitboard__flag">
                          {split.games === 0 ? 'No games' : 'Small sample'}
                        </span>
                      ) : null}
                    </th>
                    <td className="num">
                      {split.wins}–{split.losses}
                    </td>
                    <td className="num">{percent(split.winPercentage)}</td>
                    <td aria-hidden="true">
                      <span className="splitboard__track">
                        {season !== null ? (
                          <span
                            className="splitboard__season"
                            style={{ left: `${season * 100}%` }}
                          />
                        ) : null}
                        {split.winPercentage !== null ? (
                          allowed ? (
                            <motion.i
                              style={{ originX: 0 }}
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: seen ? split.winPercentage : 0 }}
                              transition={{
                                duration: 0.8,
                                ease: easings.arena,
                                delay: Math.min(0.4, index * 0.04),
                              }}
                            />
                          ) : (
                            <i
                              style={{ transform: `scaleX(${split.winPercentage})` }}
                            />
                          )
                        ) : null}
                      </span>
                    </td>
                    <td className="num">{split.pointsFor?.toFixed(1) ?? '—'}</td>
                    <td className="num">{split.pointsAgainst?.toFixed(1) ?? '—'}</td>
                    <td className="num">{signed(split.marginPerGame, 1)}</td>
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
      <p className="lchart__note">
        The white tick on each bar marks the season win rate. Hover a split name for its
        exact definition.
        {chronologyKnown
          ? ' Rest counts calendar days between source-listed games; travel and tipoff times are unknown.'
          : ' Rest splits are withheld: two schedule games share a date, so game order is unknown.'}
      </p>
    </section>
  );
}
