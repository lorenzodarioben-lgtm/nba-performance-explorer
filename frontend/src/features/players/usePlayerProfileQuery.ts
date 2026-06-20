import { PlayerIdSchema } from '@nba-performance-explorer/contracts';
import { useQuery } from '@tanstack/react-query';

import { fetchPlayerProfile, PlayerProfileError } from './api';

export function isValidPlayerId(playerId: string | undefined): playerId is string {
  return playerId !== undefined && PlayerIdSchema.safeParse(playerId).success;
}

export function usePlayerProfileQuery(playerId: string | undefined) {
  return useQuery({
    queryKey: ['players', 'profile', playerId],
    queryFn: ({ signal }) => {
      // The query is only enabled for valid ids; this guard also narrows the type and
      // protects against an invalid id ever reaching the network.
      if (!isValidPlayerId(playerId)) {
        throw new PlayerProfileError('invalid-id');
      }

      return fetchPlayerProfile(playerId, signal);
    },
    enabled: isValidPlayerId(playerId),
    retry: false,
  });
}
