import { Link } from 'react-router';

import { RankBars } from '../../charts/RankBars';
import { Stagger, StaggerItem } from '../../motion/choreography';
import { PlayerAvatar } from '../../ui/PlayerAvatar';

export interface RankedRow {
  playerId: string;
  name: string;
  rank: number;
  value: number;
  percentile: number;
  gamesPlayed: number;
  teams: readonly { abbreviation: string }[];
}

const formatRank = (row: RankedRow, rows: readonly RankedRow[]) =>
  rows.filter((other) => other.rank === row.rank).length > 1
    ? `T-${row.rank}`
    : String(row.rank);

/**
 * A recorded leaderboard: the top three as a podium (page one only), then every row with an
 * in-row value bar on one shared scale. Tied players share a "T-n" rank; nothing is re-ranked.
 */
export function RankedBoard({
  rows,
  format,
  metricLabel,
  showPodium,
}: {
  rows: readonly RankedRow[];
  format: (value: number) => string;
  metricLabel: string;
  showPodium: boolean;
}) {
  const podium = showPodium ? rows.filter((row) => row.rank <= 3).slice(0, 4) : [];
  const max = Math.max(0, ...rows.map((row) => row.value));
  return (
    <div className="ranked" data-chart="ranked-board">
      {podium.length ? (
        <Stagger as="ol" className="podium" gap={0.08}>
          {podium.map((row) => (
            <StaggerItem
              as="li"
              key={row.playerId}
              className={`podium__step podium__step--${row.rank}`}
            >
              <PlayerAvatar
                playerId={row.playerId}
                name={row.name}
                size={72}
                className="podium__face"
              />
              <span className="podium__rank">{formatRank(row, rows)}</span>
              <Link to={`/players/${row.playerId}`} className="podium__name">
                {row.name}
              </Link>
              <span className="podium__value">{format(row.value)}</span>
              <span className="podium__meta">
                {metricLabel} · {row.gamesPlayed} GP · {row.percentile.toFixed(1)}{' '}
                pctile
              </span>
            </StaggerItem>
          ))}
        </Stagger>
      ) : null}
      <RankBars
        label={`${metricLabel} ranking on this page`}
        max={max}
        rows={rows.map((row) => ({
          key: row.playerId,
          label: `${formatRank(row, rows)}  ${row.name}`,
          value: row.value,
          display: format(row.value),
          meta: `${row.teams.map((team) => team.abbreviation).join(' / ')} · ${row.gamesPlayed} GP · ${row.percentile.toFixed(1)} pctile`,
          highlight: row.rank === 1,
        }))}
      />
    </div>
  );
}
