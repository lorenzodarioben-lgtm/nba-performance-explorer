import {
  ApiErrorResponseSchema,
  PlayerProfileResponseSchema,
  type PlayerProfile,
} from '@nba-performance-explorer/contracts';

import { createApiUrl } from '../../shared/api/createApiUrl';

export type PlayerProfileErrorKind = 'invalid-id' | 'not-found' | 'error';

// A typed error so the page can map a failed request to the right accessible state without
// ever surfacing a raw backend message to the user.
export class PlayerProfileError extends Error {
  readonly kind: PlayerProfileErrorKind;

  constructor(kind: PlayerProfileErrorKind) {
    super(`Player profile request failed: ${kind}`);
    this.name = 'PlayerProfileError';
    this.kind = kind;
  }
}

export async function fetchPlayerProfile(
  playerId: string,
  signal: AbortSignal,
): Promise<PlayerProfile> {
  const response = await fetch(
    createApiUrl(`/api/players/${encodeURIComponent(playerId)}`),
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
    const code = parsedError.success ? parsedError.data.error.code : undefined;

    if (response.status === 404 || code === 'PLAYER_NOT_FOUND') {
      throw new PlayerProfileError('not-found');
    }

    if (response.status === 400 || code === 'INVALID_PLAYER_ID') {
      throw new PlayerProfileError('invalid-id');
    }

    throw new PlayerProfileError('error');
  }

  // A contract violation throws a ZodError, which the page renders as the generic error
  // state (it is not a PlayerProfileError).
  return PlayerProfileResponseSchema.parse(responseBody).player;
}
