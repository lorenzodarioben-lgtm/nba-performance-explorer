import type {
  ComparisonResponse,
  ComparisonSelection,
} from '@nba-performance-explorer/contracts';
import type { PlayerProvider } from '../players/player-provider.js';
import { ProviderError } from '../players/provider-error.js';

export async function loadComparisonRows(
  provider: PlayerProvider,
  selection: ComparisonSelection,
): Promise<ComparisonResponse['rows']> {
  const rows: ComparisonResponse['rows'] = [];
  for (const slot of selection) {
    try {
      const player = await provider.getPlayerById(slot.playerId);
      const stats = player
        ? await provider.getPlayerSeasonStats(slot.playerId, slot.season)
        : null;
      if (
        (player && player.id !== slot.playerId) ||
        (stats && stats.season !== slot.season)
      ) {
        rows.push({ ...slot, player: null, stats: null, status: 'source-unavailable' });
        continue;
      }
      rows.push({
        ...slot,
        player,
        stats,
        status: !player
          ? 'player-not-found'
          : stats
            ? 'available'
            : 'season-unavailable',
      });
    } catch (error) {
      if (!(error instanceof ProviderError)) throw error;
      rows.push({ ...slot, player: null, stats: null, status: 'source-unavailable' });
    }
  }
  return rows;
}
