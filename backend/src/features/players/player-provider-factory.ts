import type { PlayerProviderConfig } from '../../config/player-provider-config.js';
import { fixturePlayerProvider } from './fixture-player-provider.js';
import { createNbaStatsCache } from './nba-stats/nba-stats-cache.js';
import {
  createConsoleDiagnosticReporter,
  noopDiagnosticReporter,
} from './nba-stats/nba-stats-diagnostics.js';
import { createNbaStatsHttpClient } from './nba-stats/nba-stats-http-client.js';
import { NbaStatsPlayerProvider } from './nba-stats/nba-stats-player-provider.js';
import type { PlayerProvider } from './player-provider.js';

// The single composition root for selecting a data provider from runtime configuration. Fixture
// mode reuses the shared fixture provider; nba-stats mode constructs a live provider with its own
// HTTP client and a fresh process-local cache. Routes never make this decision. Sanitized response
// diagnostics are wired here: a console reporter only when explicitly enabled, a no-op otherwise.
export function createPlayerProvider(config: PlayerProviderConfig): PlayerProvider {
  if (config.mode === 'nba-stats') {
    return new NbaStatsPlayerProvider({
      httpClient: createNbaStatsHttpClient({ timeoutMs: config.timeoutMs }),
      cache: createNbaStatsCache(),
      reporter: config.diagnostics
        ? createConsoleDiagnosticReporter()
        : noopDiagnosticReporter,
    });
  }

  return fixturePlayerProvider;
}
