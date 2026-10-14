import type { ArchiveLeagueResponse } from '@nba-performance-explorer/contracts';
import { motion } from 'motion/react';
import { Link } from 'react-router';

import { useSeen } from '../../motion/choreography';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { easings, springs } from '../../motion/tokens';

type Standing = ArchiveLeagueResponse['standings'][number];
export type LadderSort = 'rank' | 'wins' | 'losses' | 'winPercentage';

// 2023–24 postseason format (a league rule, not a source field): seeds 1–6 qualify directly,
// 7–10 enter the play-in tournament. Lines are drawn only on the source-rank order.
const PLAYOFF_CUT = 6;
const PLAY_IN_CUT = 10;

/**
 * Two conference ladders. Rows reorder with a layout (FLIP) animation when the sort changes;
 * the games-behind bar shares one scale across both conferences.
 */
export function ConferenceLadders({
  standings,
  sort,
  conference,
}: {
  standings: readonly Standing[];
  sort: LadderSort;
  conference?: 'East' | 'West' | undefined;
}) {
  const maxGb = Math.max(1, ...standings.map((row) => row.gamesBehind ?? 0));
  const conferences = (['East', 'West'] as const).filter(
    (name) => !conference || conference === name,
  );
  return (
    <div className="ladders" data-chart="conference-ladders">
      {conferences.map((name) => {
        const rows = standings
          .filter((row) => row.conference === name)
          .sort(
            (a, b) =>
              (sort === 'rank'
                ? a.rank - b.rank
                : sort === 'losses'
                  ? b.losses - a.losses
                  : b[sort] - a[sort]) || a.team.name.localeCompare(b.team.name),
          );
        return (
          <Ladder
            key={name}
            name={name}
            rows={rows}
            maxGb={maxGb}
            showCuts={sort === 'rank'}
          />
        );
      })}
    </div>
  );
}

function Ladder({
  name,
  rows,
  maxGb,
  showCuts,
}: {
  name: string;
  rows: readonly Standing[];
  maxGb: number;
  showCuts: boolean;
}) {
  const allowed = useMotionAllowed();
  const [ref, seen] = useSeen<HTMLElement>();
  return (
    <section ref={ref} className="ladder" aria-label={`${name}ern Conference ladder`}>
      <h2 className="ladder__title">
        {name}
        <span>Conference</span>
      </h2>
      <ol className="ladder__rows">
        {rows.map((row, index) => (
          <motion.li
            key={row.team.id}
            layout={allowed ? 'position' : false}
            transition={springs.data}
            className={`ladder__row ${
              showCuts && row.rank === PLAYOFF_CUT
                ? 'is-cut-playoff'
                : showCuts && row.rank === PLAY_IN_CUT
                  ? 'is-cut-playin'
                  : ''
            }`}
            data-rank={row.rank}
          >
            <span className="ladder__rank">{row.rank}</span>
            <Link to={`/teams/${row.team.id}`} className="ladder__team">
              <b>{row.team.abbreviation}</b>
              <span>{row.team.name}</span>
            </Link>
            <span className="ladder__wl num">
              {row.wins}–{row.losses}
            </span>
            <span className="ladder__gb" aria-hidden="true">
              <motion.i
                style={{ originX: 0 }}
                initial={allowed ? { scaleX: 0 } : false}
                animate={{ scaleX: seen ? (row.gamesBehind ?? 0) / maxGb : 0 }}
                transition={{ duration: 0.8, ease: easings.arena, delay: index * 0.03 }}
              />
            </span>
            <span className="ladder__gbnum num">
              {row.gamesBehind === null
                ? '—'
                : row.gamesBehind === 0
                  ? '—'
                  : row.gamesBehind}
            </span>
          </motion.li>
        ))}
      </ol>
      {showCuts ? (
        <p className="ladder__key">
          <span className="ladder__key-playoff">Playoffs 1–6</span>
          <span className="ladder__key-playin">Play-in 7–10</span>
          <span>2023–24 postseason format · bars: games behind</span>
        </p>
      ) : (
        <p className="ladder__key">
          <span>
            Sorted by the chosen metric · cut lines show on the source rank order
          </span>
        </p>
      )}
    </section>
  );
}
