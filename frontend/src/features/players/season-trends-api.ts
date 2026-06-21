import {
  ApiErrorResponseSchema,
  PlayerSeasonTrendsResponseSchema,
  type PlayerSeasonStats,
} from '@nba-performance-explorer/contracts';

import { createApiUrl } from '../../shared/api/createApiUrl';
import { PlayerSeasonError } from './season-api';

// Reuses the existing PlayerSeasonError (no circular dependency: season-api does not import
// this module). Career trends are player-scoped, so only invalid-id, player-not-found, and
// generic kinds apply.
export async function fetchPlayerSeasonTrends(
  playerId: string,
  signal: AbortSignal,
): Promise<PlayerSeasonStats[]> {
  const response = await fetch(
    createApiUrl(`/api/players/${encodeURIComponent(playerId)}/season-trends`),
    {
      headers: { Accept: 'application/json' },
      signal,
    },
  );
  const responseBody: unknown = await response.json();

  if (!response.ok) {
    const parsedError = ApiErrorResponseSchema.safeParse(responseBody);
    const code = parsedError.success ? parsedError.data.error.code : undefined;

    if (response.status === 404 || code === 'PLAYER_NOT_FOUND') {
      throw new PlayerSeasonError('player-not-found');
    }

    if (response.status === 400 || code === 'INVALID_PLAYER_ID') {
      throw new PlayerSeasonError('invalid-id');
    }

    throw new PlayerSeasonError('error');
  }

  return PlayerSeasonTrendsResponseSchema.parse(responseBody).seasons;
}
