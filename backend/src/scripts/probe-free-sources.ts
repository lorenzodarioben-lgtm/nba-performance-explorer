import { pathToFileURL } from 'node:url';

import { createNbaStatsHttpClient } from '../features/players/nba-stats/nba-stats-http-client.js';
import { createNbaStatsCache } from '../features/players/nba-stats/nba-stats-cache.js';
import { NbaStatsPlayerProvider } from '../features/players/nba-stats/nba-stats-player-provider.js';
import { ProviderError } from '../features/players/provider-error.js';

export interface SourceProbeCheck {
  name: string;
  run: () => Promise<number>;
}

export async function runSourceProbe(checks: readonly SourceProbeCheck[]) {
  const results: {
    name: string;
    status: string;
    rows: number | null;
    latencyMs: number;
  }[] = [];
  let consecutiveFailures = 0;
  for (const check of checks.slice(0, 12)) {
    const start = Date.now();
    try {
      const rows = await check.run();
      results.push({
        name: check.name,
        status: rows > 0 ? 'PARSED_NONEMPTY' : 'PARSED_EMPTY',
        rows,
        latencyMs: Date.now() - start,
      });
      consecutiveFailures = 0;
    } catch (error) {
      results.push({
        name: check.name,
        status: error instanceof ProviderError ? error.code : 'FAILED',
        rows: null,
        latencyMs: Date.now() - start,
      });
      consecutiveFailures++;
      if (consecutiveFailures >= 2) break;
    }
  }
  return {
    environment: 'local-engineering-host',
    checkedAt: new Date().toISOString(),
    timeoutMs: 5000,
    retryCount: 0,
    results,
    stoppedEarly: results.length < Math.min(checks.length, 12),
    productionHostTested: false,
    newFeedsEnabled: false,
  };
}

async function main() {
  const provider = new NbaStatsPlayerProvider({
    httpClient: createNbaStatsHttpClient({ timeoutMs: 5000 }),
    cache: createNbaStatsCache(),
  });
  const checks: SourceProbeCheck[] = [
    {
      name: 'commonallplayers:Curry-search',
      run: async () => (await provider.searchPlayers('Curry', 8)).length,
    },
  ];
  for (const [id, role] of [
    ['201939', 'active-star'],
    ['2544', 'known-career-missing'],
    ['1641705', 'young-player'],
    ['893', 'historical-player'],
    ['1629029', 'traded-player'],
  ] as const) {
    checks.push({
      name: `commonplayerinfo:${role}:${id}`,
      run: async () => ((await provider.getPlayerById(id)) ? 1 : 0),
    });
    checks.push({
      name: `playercareerstats:${role}:${id}`,
      run: async () => (await provider.listPlayerSeasons(id)).length,
    });
  }
  checks.push({
    name: 'playergamelog:active-star:201939:2023-24',
    run: async () => (await provider.listPlayerGames('201939', '2023-24')).length,
  });
  const report = await runSourceProbe(checks);
  console.log(JSON.stringify(report, null, 2));
  if (report.results.some((r) => r.rows === null)) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
