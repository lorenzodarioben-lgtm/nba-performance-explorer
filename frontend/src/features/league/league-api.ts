import { useQuery } from '@tanstack/react-query';
import { LeagueSeasonsResponseSchema } from '@nba-performance-explorer/contracts';
import { createApiUrl } from '../../shared/api/createApiUrl';

/** A refused league request, carrying the server's own explanation (never raw upstream text). */
export class LeagueApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function fetchLeague<T>(
  path: string,
  signal: AbortSignal,
  parse: (value: unknown) => T,
): Promise<T> {
  const response = await fetch(createApiUrl(path), {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    let code = 'UNAVAILABLE';
    let message = 'The league archive could not answer this request.';
    try {
      const body = (await response.json()) as {
        error?: { code?: unknown; message?: unknown };
      };
      if (typeof body.error?.code === 'string') code = body.error.code.slice(0, 60);
      // Only explanations written by this app's API are shown, and only for refusals it made.
      if (typeof body.error?.message === 'string' && response.status < 500)
        message = body.error.message.slice(0, 400);
    } catch {
      // Keep the generic message.
    }
    throw new LeagueApiError(response.status, code, message);
  }
  return parse((await response.json()) as unknown);
}

export function useLeagueSeasons() {
  return useQuery({
    queryKey: ['league', 'seasons'],
    queryFn: ({ signal }) =>
      fetchLeague('/api/league/seasons', signal, LeagueSeasonsResponseSchema.parse),
    retry: false,
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/** Season-label order, newest first. */
export const newestFirst = <T extends { season: string }>(list: readonly T[]) =>
  [...list].sort((a, b) => b.season.localeCompare(a.season));

export const seasonDisplay = (season: string) => season.replace('-', '–');
