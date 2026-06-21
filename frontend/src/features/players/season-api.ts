import {
  ApiErrorResponseSchema,
  PlayerSeasonStatsResponseSchema,
  PlayerSeasonsResponseSchema,
  SeasonIdSchema,
  type PlayerSeason,
  type PlayerSeasonStats,
} from '@nba-performance-explorer/contracts';

import { createApiUrl } from '../../shared/api/createApiUrl';

export type PlayerSeasonErrorKind =
  | 'invalid-id'
  | 'invalid-season'
  | 'player-not-found'
  | 'season-not-found'
  | 'error';

// One typed error covering every season request failure, so the UI can map a failure to the
// right accessible state without ever surfacing a raw backend message.
export class PlayerSeasonError extends Error {
  readonly kind: PlayerSeasonErrorKind;

  constructor(kind: PlayerSeasonErrorKind) {
    super(`Player season request failed: ${kind}`);
    this.name = 'PlayerSeasonError';
    this.kind = kind;
  }
}

export function isValidSeasonId(season: string | undefined): season is string {
  return season !== undefined && SeasonIdSchema.safeParse(season).success;
}

export function seasonErrorFor(
  status: number,
  code: string | undefined,
): PlayerSeasonError {
  if (code === 'SEASON_NOT_FOUND') {
    return new PlayerSeasonError('season-not-found');
  }
  if (code === 'PLAYER_NOT_FOUND') {
    return new PlayerSeasonError('player-not-found');
  }
  if (code === 'INVALID_SEASON_ID') {
    return new PlayerSeasonError('invalid-season');
  }
  if (code === 'INVALID_PLAYER_ID') {
    return new PlayerSeasonError('invalid-id');
  }
  if (status === 404) {
    return new PlayerSeasonError('player-not-found');
  }
  if (status === 400) {
    return new PlayerSeasonError('invalid-id');
  }
  return new PlayerSeasonError('error');
}

export async function fetchPlayerSeasons(
  playerId: string,
  signal: AbortSignal,
): Promise<PlayerSeason[]> {
  const response = await fetch(
    createApiUrl(`/api/players/${encodeURIComponent(playerId)}/seasons`),
    {
      headers: { Accept: 'application/json' },
      signal,
    },
  );
  const responseBody: unknown = await response.json();

  if (!response.ok) {
    const parsedError = ApiErrorResponseSchema.safeParse(responseBody);
    throw seasonErrorFor(
      response.status,
      parsedError.success ? parsedError.data.error.code : undefined,
    );
  }

  return PlayerSeasonsResponseSchema.parse(responseBody).seasons;
}

export async function fetchPlayerSeasonStats(
  playerId: string,
  season: string,
  signal: AbortSignal,
): Promise<PlayerSeasonStats> {
  const response = await fetch(
    createApiUrl(
      `/api/players/${encodeURIComponent(playerId)}/seasons/${encodeURIComponent(
        season,
      )}/stats`,
    ),
    {
      headers: { Accept: 'application/json' },
      signal,
    },
  );
  const responseBody: unknown = await response.json();

  if (!response.ok) {
    const parsedError = ApiErrorResponseSchema.safeParse(responseBody);
    throw seasonErrorFor(
      response.status,
      parsedError.success ? parsedError.data.error.code : undefined,
    );
  }

  return PlayerSeasonStatsResponseSchema.parse(responseBody).stats;
}
