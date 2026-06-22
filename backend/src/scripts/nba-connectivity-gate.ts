import { pathToFileURL } from 'node:url';

import {
  DEFAULT_NBA_STATS_TIMEOUT_MS,
  MAX_NBA_STATS_TIMEOUT_MS,
  MIN_NBA_STATS_TIMEOUT_MS,
} from '../config/player-provider-config.js';
import { createNbaStatsHttpClient } from '../features/players/nba-stats/nba-stats-http-client.js';
import type { NbaStatsHttpClient } from '../features/players/nba-stats/nba-stats-http-client.js';
import {
  mapGameLog,
  mapPlayerProfile,
  parseCareerSeasons,
  parseDirectory,
} from '../features/players/nba-stats/nba-stats-mappers.js';
import { currentNbaSeason } from '../features/players/nba-stats/nba-stats-player-provider.js';
import { ProviderError } from '../features/players/provider-error.js';

// The deployment-host NBA.com connectivity gate (TASK-009 / ADR-013, strengthened in TASK-010). It
// probes only the four approved endpoint families from the actual host, using the existing HTTP
// client — which checks status and content type and never exposes upstream URLs, bodies, headers,
// or cookies. Crucially, each check then runs the *same* production parser/mapper the application
// uses (player search, profile, career, game log), so a response that is "HTTP 2xx + JSON" but
// would fail strict application validation (PROVIDER_INVALID_RESPONSE) now fails the gate too.
// There are no retries, proxies, IP rotation, cookie harvesting, or bypass techniques. Output is
// sanitized to a pass flag and, on failure, the stable provider error category plus the structural
// diagnostic (stage, schema labels, counts, primitive categories — never payload values). A nonzero
// exit code means at least one endpoint is unreachable or returns an unparseable response, so live
// mode must not be enabled.

// A known, stable player id used only to probe reachability (LeBron James). Response bodies are
// never inspected or logged beyond the sanitized parser diagnostics.
const SAMPLE_PLAYER_ID = '2544';

export interface GateCheck {
  name: string;
  endpoint: string;
  params: Record<string, string>;
  // Runs the real production parser/mapper for this endpoint. It throws a ProviderError when the
  // body would be rejected by the application; a successful return (or a benign `null`, e.g. an
  // unknown profile) means the shape parsed.
  validate: (body: unknown) => void;
}

export interface GateResult {
  name: string;
  ok: boolean;
  detail: string;
}

export function buildGateChecks(season: string): GateCheck[] {
  return [
    {
      name: 'commonallplayers',
      endpoint: 'commonallplayers',
      params: { LeagueID: '00', Season: season, IsOnlyCurrentSeason: '0' },
      // The directory parse that backs player search.
      validate: (body) => {
        parseDirectory(body);
      },
    },
    {
      name: 'commonplayerinfo',
      endpoint: 'commonplayerinfo',
      params: { PlayerID: SAMPLE_PLAYER_ID, LeagueID: '00' },
      // The profile parse/map.
      validate: (body) => {
        mapPlayerProfile(body);
      },
    },
    {
      name: 'playercareerstats',
      endpoint: 'playercareerstats',
      params: { PlayerID: SAMPLE_PLAYER_ID, PerMode: 'PerGame', LeagueID: '00' },
      // The career parse that backs seasons, selected-season stats, and trends.
      validate: (body) => {
        parseCareerSeasons(body);
      },
    },
    {
      name: 'playergamelog',
      endpoint: 'playergamelog',
      params: {
        PlayerID: SAMPLE_PLAYER_ID,
        Season: season,
        SeasonType: 'Regular Season',
        LeagueID: '00',
      },
      // The game-log parse/map.
      validate: (body) => {
        mapGameLog(body);
      },
    },
  ];
}

// Build a sanitized one-line failure detail. The structural diagnostic carries no payload values
// (see nba-stats-diagnostics), so serializing it cannot leak upstream rows, cells, headers, or
// cookies.
function sanitizedFailureDetail(endpoint: string, error: unknown): string {
  if (error instanceof ProviderError) {
    if (error.diagnostic) {
      return `${error.code} ${JSON.stringify({ ...error.diagnostic, endpoint })}`;
    }
    return error.code;
  }
  return 'unexpected error';
}

export async function runConnectivityGate(
  client: NbaStatsHttpClient,
  checks: readonly GateCheck[],
): Promise<GateResult[]> {
  const results: GateResult[] = [];
  for (const check of checks) {
    try {
      const body = await client.fetchEndpoint(check.endpoint, check.params);
      // Exercise the production parser/mapper so a structurally invalid response that the
      // application would reject also fails the gate — not just "HTTP 2xx + JSON".
      check.validate(body);
      results.push({
        name: check.name,
        ok: true,
        detail: 'reachable and parsed (HTTP 2xx, JSON, application schema OK)',
      });
    } catch (error) {
      results.push({
        name: check.name,
        ok: false,
        detail: sanitizedFailureDetail(check.endpoint, error),
      });
    }
  }
  return results;
}

// The process exit code for a set of results: 0 only when every check passed, 1 otherwise.
export function gateExitCode(results: readonly GateResult[]): number {
  return results.every((result) => result.ok) ? 0 : 1;
}

function resolveTimeoutMs(): number {
  const raw = (process.env.NBA_STATS_TIMEOUT_MS ?? '').trim();
  const parsed = /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : Number.NaN;
  if (
    Number.isInteger(parsed) &&
    parsed >= MIN_NBA_STATS_TIMEOUT_MS &&
    parsed <= MAX_NBA_STATS_TIMEOUT_MS
  ) {
    return parsed;
  }
  return DEFAULT_NBA_STATS_TIMEOUT_MS;
}

async function main(): Promise<void> {
  const season = currentNbaSeason(new Date());
  const client = createNbaStatsHttpClient({ timeoutMs: resolveTimeoutMs() });
  const results = await runConnectivityGate(client, buildGateChecks(season));

  for (const result of results) {
    console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}: ${result.detail}`);
  }

  const exitCode = gateExitCode(results);
  console.log(
    exitCode === 0
      ? 'Connectivity gate PASSED: all four endpoints are reachable and parse with the application schema from this host.'
      : 'Connectivity gate FAILED: keep fixture mode; do not enable live NBA.com data.',
  );
  process.exitCode = exitCode;
}

// Run only when executed directly (not when imported by tests), so no automated test hits the
// network.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
