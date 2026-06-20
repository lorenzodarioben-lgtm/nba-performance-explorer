import type { PlayerSummary } from '@nba-performance-explorer/contracts';

export interface PlayerProvider {
  searchPlayers(searchTerm: string, limit: number): Promise<PlayerSummary[]>;
}
