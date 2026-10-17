import type { ArchiveLeagueResponse } from '@nba-performance-explorer/contracts';

import { Stagger, StaggerItem } from '../../motion/choreography';

type Leader = ArchiveLeagueResponse['leaders'][number];

function formatValue(row: Leader) {
  if (row.unit === '%') return `${row.value}%`;
  return String(row.value);
}

/**
 * Published category winners as a board: one card per category, every published winner shown,
 * and a shared bracket when the source lists a tie. Nothing is ranked beyond what was published.
 */
export function LeaderBoard({ leaders }: { leaders: readonly Leader[] }) {
  const categories = [...new Set(leaders.map((row) => row.category))];
  return (
    <Stagger as="ul" className="leaderboard" gap={0.04}>
      {categories.map((category) => {
        const rows = leaders.filter((row) => row.category === category);
        const tie = rows.length > 1;
        return (
          <StaggerItem as="li" key={category} className="leaderboard__card">
            <p className="leaderboard__cat">
              {category}
              {tie ? (
                <span className="leaderboard__tie">Tie · {rows.length}</span>
              ) : null}
            </p>
            <div className={tie ? 'leaderboard__bracket' : undefined}>
              {rows.map((row) => (
                <div key={row.name} className="leaderboard__winner">
                  <span className="leaderboard__name">{row.name}</span>
                  <span className="leaderboard__meta">{row.teamLabel ?? '—'}</span>
                </div>
              ))}
            </div>
            <p className="leaderboard__value">
              {formatValue(rows[0]!)}
              <span>{rows[0]!.unit === '%' ? 'percent' : rows[0]!.unit}</span>
            </p>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
