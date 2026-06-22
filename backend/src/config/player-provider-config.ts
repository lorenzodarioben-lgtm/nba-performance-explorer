// Runtime configuration for selecting and tuning the backend data provider. Parsing is pure
// (it takes an env-like object) so it is deterministic and unit-testable without mutating
// `process.env`. The server calls it once with `process.env` before it starts listening, and a
// thrown `PlayerProviderConfigError` deliberately prevents startup.

export type PlayerProviderMode = 'fixture' | 'nba-stats';

export interface PlayerProviderConfig {
  mode: PlayerProviderMode;
  timeoutMs: number;
}

export interface ProviderConfigEnv {
  NBA_DATA_PROVIDER?: string | undefined;
  NBA_STATS_TIMEOUT_MS?: string | undefined;
  NODE_ENV?: string | undefined;
}

export const DEFAULT_NBA_STATS_TIMEOUT_MS = 10_000;
export const MIN_NBA_STATS_TIMEOUT_MS = 1_000;
export const MAX_NBA_STATS_TIMEOUT_MS = 30_000;

export class PlayerProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlayerProviderConfigError';
  }
}

function parseMode(env: ProviderConfigEnv): PlayerProviderMode {
  const isProduction = env.NODE_ENV === 'production';
  const raw = env.NBA_DATA_PROVIDER;

  // Absent outside production defaults to fixtures; absent in production is an error so a live
  // deployment can never silently run on fixture data.
  if (raw === undefined) {
    if (isProduction) {
      throw new PlayerProviderConfigError(
        'NBA_DATA_PROVIDER must be set to "nba-stats" in production.',
      );
    }
    return 'fixture';
  }

  if (raw === 'fixture') {
    if (isProduction) {
      throw new PlayerProviderConfigError(
        'NBA_DATA_PROVIDER cannot be "fixture" in production; set it to "nba-stats".',
      );
    }
    return 'fixture';
  }

  if (raw === 'nba-stats') {
    return 'nba-stats';
  }

  throw new PlayerProviderConfigError(
    'NBA_DATA_PROVIDER must be "fixture" or "nba-stats".',
  );
}

function parseTimeoutMs(raw: string | undefined): number {
  if (raw === undefined) {
    return DEFAULT_NBA_STATS_TIMEOUT_MS;
  }

  const trimmed = raw.trim();
  // A strict positive-integer string only; reject decimals, signs, and non-numeric input.
  const value = /^\d+$/.test(trimmed) ? Number.parseInt(trimmed, 10) : Number.NaN;

  if (
    !Number.isInteger(value) ||
    value < MIN_NBA_STATS_TIMEOUT_MS ||
    value > MAX_NBA_STATS_TIMEOUT_MS
  ) {
    throw new PlayerProviderConfigError(
      `NBA_STATS_TIMEOUT_MS must be an integer from ${MIN_NBA_STATS_TIMEOUT_MS} through ${MAX_NBA_STATS_TIMEOUT_MS}.`,
    );
  }

  return value;
}

export function parsePlayerProviderConfig(
  env: ProviderConfigEnv,
): PlayerProviderConfig {
  // Parse both values eagerly so any invalid configuration fails before the server listens.
  const mode = parseMode(env);
  const timeoutMs = parseTimeoutMs(env.NBA_STATS_TIMEOUT_MS);

  return { mode, timeoutMs };
}
