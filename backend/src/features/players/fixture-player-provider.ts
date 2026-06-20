import type { PlayerSummary } from '@nba-performance-explorer/contracts';

import { mapFixturePlayer } from './map-fixture-player.js';
import { fixturePlayers } from './player-fixtures.js';
import type { PlayerProvider } from './player-provider.js';

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

export class FixturePlayerProvider implements PlayerProvider {
  async searchPlayers(searchTerm: string, limit: number): Promise<PlayerSummary[]> {
    const normalizedSearchTerm = searchTerm.toLowerCase();

    return fixturePlayers
      .filter((player) =>
        `${player.givenName} ${player.familyName}`
          .toLowerCase()
          .includes(normalizedSearchTerm),
      )
      .map(mapFixturePlayer)
      .sort((left, right) => {
        const nameComparison = compareText(
          left.fullName.toLowerCase(),
          right.fullName.toLowerCase(),
        );

        return nameComparison || compareText(left.id, right.id);
      })
      .slice(0, limit);
  }
}

export const fixturePlayerProvider = new FixturePlayerProvider();
