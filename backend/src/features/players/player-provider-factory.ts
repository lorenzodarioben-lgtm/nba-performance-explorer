import type { PlayerProviderConfig } from '../../config/player-provider-config.js';
import { fixturePlayerProvider } from './fixture-player-provider.js';
import { createNbaStatsCache } from './nba-stats/nba-stats-cache.js';
import { createNbaStatsHttpClient } from './nba-stats/nba-stats-http-client.js';
import { NbaStatsPlayerProvider } from './nba-stats/nba-stats-player-provider.js';
import type { PlayerProvider } from './player-provider.js';

// The single composition root for selecting a data provider from runtime configuration. Fixture
// mode reuses the shared fixture provider; nba-stats mode constructs a live provider with its own
// HTTP client and a fresh process-local cache. Routes never make this decision.
export function createPlayerProvider(config: PlayerProviderConfig): PlayerProvider {
  if (config.mode === 'nba-stats') {
    return new NbaStatsPlayerProvider({
      httpClient: createNbaStatsHttpClient({ timeoutMs: config.timeoutMs }),
      cache: createNbaStatsCache(),
    });
  }

  return fixturePlayerProvider;
}
