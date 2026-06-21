import type { PlayerGame } from '@nba-performance-explorer/contracts';

import type { FixtureGame } from './game-fixtures.js';

// Map a provider-private game record to the shared `PlayerGame`. Only public contract fields are
// copied through; the private `playerId` and `season` are used for filtering, not returned. Only
// team-abbreviation summaries are needed (no full team-metadata lookup). No formatting,
// matchup composition, or fabricated values.
export function mapFixtureGame(record: FixtureGame): PlayerGame {
  return {
    id: record.gameId,
    date: record.gameDate,
    team: { abbreviation: record.teamCode },
    opponent: { abbreviation: record.opponentCode },
    location: record.location,
    result: record.result,
    minutes: record.minutes,
    points: record.points,
    rebounds: record.rebounds,
    assists: record.assists,
  };
}
