import { useQuery } from '@tanstack/react-query';

import { fetchPlayerGameLog } from './game-log-api';
import { isValidSeasonId, PlayerSeasonError } from './season-api';
import { isValidPlayerId } from './usePlayerProfileQuery';

export function usePlayerGameLogQuery(
  playerId: string | undefined,
  season: string | null | undefined,
) {
  const enabled =
    isValidPlayerId(playerId) && season !== null && isValidSeasonId(season);

  return useQuery({
    queryKey: ['players', 'game-log', playerId, season],
    queryFn: ({ signal }) => {
      if (!isValidPlayerId(playerId)) {
        throw new PlayerSeasonError('invalid-id');
      }

      if (season === null || !isValidSeasonId(season)) {
        throw new PlayerSeasonError('invalid-season');
      }

      return fetchPlayerGameLog(playerId, season, signal);
    },
    enabled,
    retry: false,
  });
}
