import type { PlayerProfile, PlayerSummary } from '@nba-performance-explorer/contracts';

import { mapFixturePlayer } from './map-fixture-player.js';
import { mapFixturePlayerProfile } from './map-fixture-player-profile.js';
import { fixturePlayers } from './player-fixtures.js';
import type { PlayerProvider } from './player-provider.js';
import { fixtureTeams } from './team-fixtures.js';

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

  async getPlayerById(playerId: string): Promise<PlayerProfile | null> {
    const record = fixturePlayers.find((player) => player.sourceId === playerId);

    if (!record) {
      return null;
    }

    const team = fixtureTeams[record.franchiseCode];

    if (!team) {
      throw new Error(`Missing fixture team metadata for ${record.franchiseCode}.`);
    }

    return mapFixturePlayerProfile(record, team);
  }
}

export const fixturePlayerProvider = new FixturePlayerProvider();
