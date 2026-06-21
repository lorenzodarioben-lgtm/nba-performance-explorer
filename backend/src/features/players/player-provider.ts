import type {
  PlayerProfile,
  PlayerSeason,
  PlayerSeasonStats,
  PlayerSummary,
} from '@nba-performance-explorer/contracts';

export interface PlayerProvider {
  searchPlayers(searchTerm: string, limit: number): Promise<PlayerSummary[]>;
  getPlayerById(playerId: string): Promise<PlayerProfile | null>;
  listPlayerSeasons(playerId: string): Promise<PlayerSeason[]>;
  getPlayerSeasonStats(
    playerId: string,
    season: string,
  ): Promise<PlayerSeasonStats | null>;
  listPlayerSeasonStats(playerId: string): Promise<PlayerSeasonStats[]>;
}
