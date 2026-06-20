import type { PlayerSummary } from '@nba-performance-explorer/contracts';

import type { FixturePlayerRecord } from './player-fixtures.js';

export function mapFixturePlayer(player: FixturePlayerRecord): PlayerSummary {
  return {
    id: player.sourceId,
    fullName: `${player.givenName} ${player.familyName}`,
    team: {
      abbreviation: player.franchiseCode,
    },
    ...(player.listedPosition ? { position: player.listedPosition } : {}),
  };
}
