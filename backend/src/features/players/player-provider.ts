import type { PlayerProfile, PlayerSummary } from '@nba-performance-explorer/contracts';

export interface PlayerProvider {
  searchPlayers(searchTerm: string, limit: number): Promise<PlayerSummary[]>;
  getPlayerById(playerId: string): Promise<PlayerProfile | null>;
}
