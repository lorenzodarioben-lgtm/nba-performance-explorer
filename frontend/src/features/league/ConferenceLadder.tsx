import { motion } from 'motion/react';
import { Link } from 'react-router';

import { useSeen } from '../../motion/choreography';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { easings, springs } from '../../motion/tokens';
import { TeamLogo } from '../../ui/TeamLogo';
import { FORMAT_2023_24, type PostseasonFormat } from './postseason-format';

/** The fields a ladder row needs; both the Wikipedia and the NBA.com standings provide them. */
interface Standing {
  rank: number;
  conference: string;
  team: { id: string; name: string; abbreviation: string };
  wins: number;
  losses: number;
  winPercentage: number;
  gamesBehind: number | null;
}
export type LadderSort = 'rank' | 'wins' | 'losses' | 'winPercentage';

/**
 * Two conference ladders. Rows reorder with a layout (FLIP) animation when the sort changes;
 * the games-behind bar shares one scale across both conferences.
 */
export function ConferenceLadders({
  standings,
  sort,
  conference,
  format = FORMAT_2023_24,
  season,
}: {
  standings: readonly Standing[];
  sort: LadderSort;
  conference?: 'East' | 'West' | undefined;
  /** Where the cut lines go; defaults to the 2023–24 format. */
  format?: PostseasonFormat;
  /** The season shown, so each team carries the mark it used then. */
  season?: string;
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
            format={format}
            season={season}
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
  format,
  season,
}: {
  name: string;
  rows: readonly Standing[];
  maxGb: number;
  showCuts: boolean;
  format: PostseasonFormat;
  season: string | undefined;
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
              showCuts && row.rank === format.playoffCut
                ? 'is-cut-playoff'
                : showCuts && row.rank === format.playInCut
                  ? 'is-cut-playin'
                  : ''
            }`}
            data-rank={row.rank}
          >
            <span className="ladder__rank">{row.rank}</span>
            <Link to={`/teams/${row.team.id}`} className="ladder__team">
              <TeamLogo team={row.team} season={season} size={24} />
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
          <span className="ladder__key-playoff">Playoffs 1–{format.playoffCut}</span>
          {format.playInCut ? (
            <span className="ladder__key-playin">
              Play-in {format.playoffCut + 1}–{format.playInCut}
            </span>
          ) : null}
          <span>{format.label} · bars: games behind</span>
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
