import type { PlayerProfile } from '@nba-performance-explorer/contracts';

import type { FixturePlayerRecord } from './player-fixtures.js';
import type { FixtureTeam } from './team-fixtures.js';

// Maps a provider-private fixture record (plus its resolved team metadata) into the shared
// internal `PlayerProfile`. Optional fields are included only when present so absent values
// never reach the client as `undefined`/`null`. Provider-specific fields (sourceId,
// givenName, franchiseCode, sourceSlug, ...) are intentionally not copied through.
export function mapFixturePlayerProfile(
  player: FixturePlayerRecord,
  team: FixtureTeam,
): PlayerProfile {
  return {
    id: player.sourceId,
    fullName: `${player.givenName} ${player.familyName}`,
    team: {
      abbreviation: player.franchiseCode,
      name: team.name,
      city: team.city,
    },
    ...(player.listedPosition ? { position: player.listedPosition } : {}),
    ...(player.jerseyNumber ? { jerseyNumber: player.jerseyNumber } : {}),
    ...(player.heightInches !== undefined ? { heightInches: player.heightInches } : {}),
    ...(player.weightPounds !== undefined ? { weightPounds: player.weightPounds } : {}),
    ...(player.country ? { country: player.country } : {}),
    ...(player.draft
      ? {
          draft: {
            year: player.draft.year,
            round: player.draft.round,
            pick: player.draft.pick,
          },
        }
      : {}),
  };
}
