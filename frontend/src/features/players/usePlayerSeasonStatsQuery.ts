import { useQuery } from '@tanstack/react-query';

import {
  fetchPlayerSeasonStats,
  isValidSeasonId,
  PlayerSeasonError,
} from './season-api';
import { isValidPlayerId } from './usePlayerProfileQuery';

export function usePlayerSeasonStatsQuery(
  playerId: string | undefined,
  season: string | null,
) {
  const enabled =
    isValidPlayerId(playerId) && season !== null && isValidSeasonId(season);

  return useQuery({
    queryKey: ['players', 'season-stats', playerId, season],
    queryFn: ({ signal }) => {
      // The query is only enabled for a valid player and a season drawn from the available
      // list; this guard also narrows the types and prevents a stray request.
      if (!isValidPlayerId(playerId) || season === null || !isValidSeasonId(season)) {
        throw new PlayerSeasonError('invalid-season');
      }

      return fetchPlayerSeasonStats(playerId, season, signal);
    },
    enabled,
    retry: false,
  });
}
