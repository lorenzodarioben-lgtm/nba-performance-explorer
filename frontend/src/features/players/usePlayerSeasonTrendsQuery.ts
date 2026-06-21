import { useQuery } from '@tanstack/react-query';

import { PlayerSeasonError } from './season-api';
import { fetchPlayerSeasonTrends } from './season-trends-api';
import { isValidPlayerId } from './usePlayerProfileQuery';

export function usePlayerSeasonTrendsQuery(playerId: string | undefined) {
  return useQuery({
    queryKey: ['players', 'season-trends', playerId],
    queryFn: ({ signal }) => {
      if (!isValidPlayerId(playerId)) {
        throw new PlayerSeasonError('invalid-id');
      }

      return fetchPlayerSeasonTrends(playerId, signal);
    },
    enabled: isValidPlayerId(playerId),
    retry: false,
  });
}
