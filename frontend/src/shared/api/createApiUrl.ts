const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const apiBaseUrl = configuredApiBaseUrl?.replace(/\/+$/, '') ?? '';

export function createApiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}
