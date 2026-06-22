import { describe, expect, it } from 'vitest';

import type { NbaStatsHttpClient } from '../features/players/nba-stats/nba-stats-http-client.js';
import { providerUnavailable } from '../features/players/provider-error.js';
import { buildGateChecks, runConnectivityGate } from './nba-connectivity-gate.js';

describe('buildGateChecks', () => {
  it('probes exactly the four approved endpoints with the season applied', () => {
    const checks = buildGateChecks('2023-24');

    expect(checks.map((check) => check.endpoint)).toEqual([
      'commonallplayers',
      'commonplayerinfo',
      'playercareerstats',
      'playergamelog',
    ]);
    expect(checks[0]?.params.Season).toBe('2023-24');
    expect(checks[3]?.params.SeasonType).toBe('Regular Season');
  });
});

describe('runConnectivityGate', () => {
  it('reports PASS for every reachable endpoint', async () => {
    const client: NbaStatsHttpClient = {
      fetchEndpoint: async () => ({ resultSets: [] }),
    };

    const results = await runConnectivityGate(client, buildGateChecks('2023-24'));

    expect(results).toHaveLength(4);
    expect(results.every((result) => result.ok)).toBe(true);
  });

  it('reports FAIL with the sanitized provider code when an endpoint is blocked', async () => {
    const client: NbaStatsHttpClient = {
      fetchEndpoint: async (endpoint) => {
        if (endpoint === 'playergamelog') {
          throw providerUnavailable('raw upstream blocked detail');
        }
        return { resultSets: [] };
      },
    };

    const results = await runConnectivityGate(client, buildGateChecks('2023-24'));
    const gameLog = results.find((result) => result.name === 'playergamelog');

    expect(gameLog?.ok).toBe(false);
    expect(gameLog?.detail).toBe('PROVIDER_UNAVAILABLE');
    expect(results.every((result) => result.ok)).toBe(false);
    // Only the stable category leaks out — never the raw upstream message.
    expect(gameLog?.detail).not.toContain('blocked');
  });
});
