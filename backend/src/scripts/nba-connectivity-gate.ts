import { pathToFileURL } from 'node:url';

import {
  DEFAULT_NBA_STATS_TIMEOUT_MS,
  MAX_NBA_STATS_TIMEOUT_MS,
  MIN_NBA_STATS_TIMEOUT_MS,
} from '../config/player-provider-config.js';
import { createNbaStatsHttpClient } from '../features/players/nba-stats/nba-stats-http-client.js';
import type { NbaStatsHttpClient } from '../features/players/nba-stats/nba-stats-http-client.js';
import { currentNbaSeason } from '../features/players/nba-stats/nba-stats-player-provider.js';
import { ProviderError } from '../features/players/provider-error.js';

// The deployment-host NBA.com connectivity gate (TASK-009 / ADR-013). It probes only the four
// approved endpoint families from the actual host, using the existing HTTP client — which checks
// status and content type and never exposes upstream URLs, bodies, headers, or cookies. There are
// no retries, proxies, IP rotation, cookie harvesting, or bypass techniques. Output is sanitized
// to a pass flag and the stable provider error category. A nonzero exit code means at least one
// endpoint is unreachable, so live mode must not be enabled.

// A known, stable player id used only to probe reachability (LeBron James). Response bodies are
// never inspected or logged.
const SAMPLE_PLAYER_ID = '2544';

export interface GateCheck {
  name: string;
  endpoint: string;
  params: Record<string, string>;
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
    },
    {
      name: 'commonplayerinfo',
      endpoint: 'commonplayerinfo',
      params: { PlayerID: SAMPLE_PLAYER_ID, LeagueID: '00' },
    },
    {
      name: 'playercareerstats',
      endpoint: 'playercareerstats',
      params: { PlayerID: SAMPLE_PLAYER_ID, PerMode: 'PerGame', LeagueID: '00' },
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
    },
  ];
}

export async function runConnectivityGate(
  client: NbaStatsHttpClient,
  checks: readonly GateCheck[],
): Promise<GateResult[]> {
  const results: GateResult[] = [];
  for (const check of checks) {
    try {
      await client.fetchEndpoint(check.endpoint, check.params);
      results.push({
        name: check.name,
        ok: true,
        detail: 'reachable (HTTP 2xx, JSON)',
      });
    } catch (error) {
      const detail = error instanceof ProviderError ? error.code : 'unexpected error';
      results.push({ name: check.name, ok: false, detail });
    }
  }
  return results;
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

  const allPassed = results.every((result) => result.ok);
  console.log(
    allPassed
      ? 'Connectivity gate PASSED: all four endpoints are reachable from this host.'
      : 'Connectivity gate FAILED: keep fixture mode; do not enable live NBA.com data.',
  );
  process.exitCode = allPassed ? 0 : 1;
}

// Run only when executed directly (not when imported by tests), so no automated test hits the
// network.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
