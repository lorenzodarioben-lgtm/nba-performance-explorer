import { createApp } from './app.js';
import {
  parsePlayerProviderConfig,
  PlayerProviderConfigError,
  type PlayerProviderConfig,
} from './config/player-provider-config.js';
import { createPlayerProvider } from './features/players/player-provider-factory.js';
import { createNbaStatsHttpClient } from './features/players/nba-stats/nba-stats-http-client.js';
import { NbaSeasonTotalsProvider } from './features/research/season-totals-provider.js';
import { NbaGameResearchProvider } from './features/research/game-research-provider.js';
import { WikidataHistoryProvider } from './features/history/history-provider.js';
import { NbaPlayerBioProvider } from './features/research/player-bio-provider.js';

const defaultPort = 3001;
const configuredPort = Number.parseInt(process.env.PORT ?? `${defaultPort}`, 10);
const port = Number.isNaN(configuredPort) ? defaultPort : configuredPort;

// Parse provider configuration before listening so invalid configuration fails fast and a live
// deployment never silently starts on fixtures. The configuration messages are safe (our own
// text, no secrets).
function loadConfig(): PlayerProviderConfig {
  try {
    return parsePlayerProviderConfig(process.env);
  } catch (error) {
    const message =
      error instanceof PlayerProviderConfigError
        ? error.message
        : 'Invalid player provider configuration.';
    console.error(`Cannot start: ${message}`);
    process.exit(1);
  }
}

const config = loadConfig();
const app = createApp(createPlayerProvider(config), {
  playerSource: config.mode,
  historyProvider: new WikidataHistoryProvider(),
  ...(config.mode === 'nba-stats'
    ? {
        totalsProvider: new NbaSeasonTotalsProvider(
          createNbaStatsHttpClient({ timeoutMs: config.timeoutMs }),
        ),
        bioProvider: new NbaPlayerBioProvider(
          createNbaStatsHttpClient({ timeoutMs: config.timeoutMs }),
        ),
        gamesProvider: new NbaGameResearchProvider(
          createNbaStatsHttpClient({ timeoutMs: config.timeoutMs }),
        ),
      }
    : {}),
});

app.listen(port, () => {
  console.log(
    `NBA Performance Explorer API listening on http://localhost:${port} (provider: ${config.mode})`,
  );
});
