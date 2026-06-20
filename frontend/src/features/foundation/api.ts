import {
  ApiErrorResponseSchema,
  HealthResponseSchema,
  type HealthResponse,
} from '@nba-performance-explorer/contracts';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const apiBaseUrl = configuredApiBaseUrl?.replace(/\/+$/, '') ?? '';

function createApiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(createApiUrl('/api/health'), {
    headers: {
      Accept: 'application/json',
    },
  });

  const responseBody: unknown = await response.json();

  if (!response.ok) {
    const parsedError = ApiErrorResponseSchema.safeParse(responseBody);
    const message = parsedError.success
      ? parsedError.data.error.message
      : 'The backend health check failed.';

    throw new Error(message);
  }

  return HealthResponseSchema.parse(responseBody);
}
