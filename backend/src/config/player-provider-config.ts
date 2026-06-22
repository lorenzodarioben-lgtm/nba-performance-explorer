// Runtime configuration for selecting and tuning the backend data provider. Parsing is pure
// (it takes an env-like object) so it is deterministic and unit-testable without mutating
// `process.env`. The server calls it once with `process.env` before it starts listening, and a
// thrown `PlayerProviderConfigError` deliberately prevents startup.

export type PlayerProviderMode = 'fixture' | 'nba-stats';

export interface PlayerProviderConfig {
  mode: PlayerProviderMode;
  timeoutMs: number;
  // Sanitized response diagnostics. Off unless explicitly enabled for a controlled diagnostic run.
  diagnostics: boolean;
}

export interface ProviderConfigEnv {
  NBA_DATA_PROVIDER?: string | undefined;
  NBA_STATS_TIMEOUT_MS?: string | undefined;
  NBA_ALLOW_FIXTURE_IN_PRODUCTION?: string | undefined;
  NBA_STATS_DIAGNOSTICS?: string | undefined;
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

function parseAllowFixtureInProduction(raw: string | undefined): boolean {
  if (raw === undefined || raw === 'false') {
    return false;
  }

  if (raw === 'true') {
    return true;
  }

  throw new PlayerProviderConfigError(
    'NBA_ALLOW_FIXTURE_IN_PRODUCTION must be "true" or "false".',
  );
}

// Sanitized response diagnostics are disabled unless explicitly enabled. Only exactly "true" or
// "false" (or omission) is accepted; any other value fails startup, matching the other strict
// boolean switches.
function parseDiagnostics(raw: string | undefined): boolean {
  if (raw === undefined || raw === 'false') {
    return false;
  }

  if (raw === 'true') {
    return true;
  }

  throw new PlayerProviderConfigError(
    'NBA_STATS_DIAGNOSTICS must be "true" or "false".',
  );
}

function parseMode(
  env: ProviderConfigEnv,
  allowFixtureInProduction: boolean,
): PlayerProviderMode {
  const isProduction = env.NODE_ENV === 'production';
  const raw = env.NBA_DATA_PROVIDER;

  // Absent outside production defaults to fixtures. Absent in production remains an error,
  // preventing production from silently selecting fixture data.
  if (raw === undefined) {
    if (isProduction) {
      throw new PlayerProviderConfigError(
        'NBA_DATA_PROVIDER must be set explicitly in production.',
      );
    }

    return 'fixture';
  }

  if (raw === 'fixture') {
    if (isProduction && !allowFixtureInProduction) {
      throw new PlayerProviderConfigError(
        'NBA_DATA_PROVIDER cannot be "fixture" in production unless NBA_ALLOW_FIXTURE_IN_PRODUCTION is set to "true".',
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
  // Parse every value eagerly so invalid configuration fails before the server listens.
  const allowFixtureInProduction = parseAllowFixtureInProduction(
    env.NBA_ALLOW_FIXTURE_IN_PRODUCTION,
  );
  const mode = parseMode(env, allowFixtureInProduction);
  const timeoutMs = parseTimeoutMs(env.NBA_STATS_TIMEOUT_MS);
  const diagnostics = parseDiagnostics(env.NBA_STATS_DIAGNOSTICS);

  return { mode, timeoutMs, diagnostics };
}
