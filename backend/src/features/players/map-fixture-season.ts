import type {
  PlayerSeason,
  PlayerSeasonStats,
} from '@nba-performance-explorer/contracts';

import type { FixtureSeasonStat } from './season-fixtures.js';

// Map provider-private season records to the shared domain models. Only public contract
// fields are copied through; the private `playerId` and any other internal field never reach
// the response.

export function mapFixtureSeasonSummary(record: FixtureSeasonStat): PlayerSeason {
  return {
    season: record.season,
    team: {
      abbreviation: record.franchiseCode,
    },
  };
}

export function mapFixtureSeasonStats(record: FixtureSeasonStat): PlayerSeasonStats {
  return {
    season: record.season,
    team: {
      abbreviation: record.franchiseCode,
    },
    gamesPlayed: record.gamesPlayed,
    minutesPerGame: record.minutesPerGame,
    pointsPerGame: record.pointsPerGame,
    reboundsPerGame: record.reboundsPerGame,
    assistsPerGame: record.assistsPerGame,
    stealsPerGame: record.stealsPerGame,
    blocksPerGame: record.blocksPerGame,
    turnoversPerGame: record.turnoversPerGame,
    fieldGoalPercentage: record.fieldGoalPercentage,
    threePointPercentage: record.threePointPercentage,
    freeThrowPercentage: record.freeThrowPercentage,
  };
}
