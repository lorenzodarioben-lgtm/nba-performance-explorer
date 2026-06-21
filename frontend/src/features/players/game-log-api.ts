import {
  ApiErrorResponseSchema,
  PlayerGameLogResponseSchema,
  type PlayerGameLogResponse,
} from '@nba-performance-explorer/contracts';

import { createApiUrl } from '../../shared/api/createApiUrl';
import { PlayerSeasonError, seasonErrorFor } from './season-api';

export async function fetchPlayerGameLog(
  playerId: string,
  season: string,
  signal: AbortSignal,
): Promise<PlayerGameLogResponse> {
  const response = await fetch(
    createApiUrl(
      `/api/players/${encodeURIComponent(playerId)}/seasons/${encodeURIComponent(
        season,
      )}/games`,
    ),
    {
      headers: { Accept: 'application/json' },
      signal,
    },
  );

  let responseBody: unknown;

  try {
    responseBody = await response.json();
  } catch {
    throw new PlayerSeasonError('error');
  }

  if (!response.ok) {
    const parsedError = ApiErrorResponseSchema.safeParse(responseBody);
    throw seasonErrorFor(
      response.status,
      parsedError.success ? parsedError.data.error.code : undefined,
    );
  }

  const parsedResponse = PlayerGameLogResponseSchema.safeParse(responseBody);

  if (!parsedResponse.success) {
    throw new PlayerSeasonError('error');
  }

  return parsedResponse.data;
}
