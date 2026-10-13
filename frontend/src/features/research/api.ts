import { createApiUrl } from '../../shared/api/createApiUrl';

// Parser injected from a shared contract keeps this helper independent of raw source shapes.
export async function fetchResearch<T>(
  path: string,
  signal: AbortSignal,
  parse: (value: unknown) => T,
): Promise<T> {
  const response = await fetch(createApiUrl(path), {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Research request unavailable.');
  return parse((await response.json()) as unknown);
}
