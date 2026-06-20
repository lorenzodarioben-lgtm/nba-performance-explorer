import { useQuery } from '@tanstack/react-query';

import { fetchPlayerSeasons, PlayerSeasonError } from './season-api';
import { isValidPlayerId } from './usePlayerProfileQuery';

export function usePlayerSeasonsQuery(playerId: string | undefined) {
  return useQuery({
    queryKey: ['players', 'seasons', playerId],
    queryFn: ({ signal }) => {
      if (!isValidPlayerId(playerId)) {
        throw new PlayerSeasonError('invalid-id');
      }

      return fetchPlayerSeasons(playerId, signal);
    },
    enabled: isValidPlayerId(playerId),
    retry: false,
  });
}
