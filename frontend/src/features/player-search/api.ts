import {
  ApiErrorResponseSchema,
  PlayerSearchResponseSchema,
  type PlayerSearchResponse,
} from '@nba-performance-explorer/contracts';

import { createApiUrl } from '../../shared/api/createApiUrl';

export async function searchPlayers(
  searchTerm: string,
  signal: AbortSignal,
): Promise<PlayerSearchResponse> {
  const searchParameters = new URLSearchParams({
    search: searchTerm,
  });
  const response = await fetch(
    createApiUrl(`/api/players?${searchParameters.toString()}`),
    {
      headers: {
        Accept: 'application/json',
      },
      signal,
    },
  );
  const responseBody: unknown = await response.json();

  if (!response.ok) {
    const parsedError = ApiErrorResponseSchema.safeParse(responseBody);
    const message = parsedError.success
      ? parsedError.data.error.message
      : 'The player search request failed.';

    throw new Error(message);
  }

  return PlayerSearchResponseSchema.parse(responseBody);
}
