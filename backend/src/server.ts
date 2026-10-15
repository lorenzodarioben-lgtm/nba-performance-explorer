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
import { WikipediaArchiveProvider } from './features/wiki-archive/archive-provider.js';
import {
  WikipediaTeamArchiveProvider,
  recordedTeamArchive,
} from './features/wiki-archive/team-archive-provider.js';
import { WikiArchiveClient } from './features/wiki-archive/wiki-client.js';
import { RecordedArchiveProvider } from './features/recorded-archive/recorded-provider.js';
import { createShotArchiveProvider } from './features/shot-archive/shot-provider.js';
import { WikipediaAwardsProvider } from './features/history/history-awards-provider.js';
import { createLineupStudyProvider } from './features/lineup-study/lineup-study-provider.js';
import { WikipediaDraftProvider } from './features/history/history-draft-provider.js';

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
// WIKI_ARCHIVE_MODE=bundled serves the 2023-24 league and 2024 playoff tables from the committed
// snapshot and never contacts Wikipedia (local demonstrations, offline checks). The default,
// live, fetches and falls back to the same snapshot when Wikipedia cannot be reached.
const archiveMode = process.env.WIKI_ARCHIVE_MODE ?? 'live';
if (archiveMode !== 'live' && archiveMode !== 'bundled') {
  console.error('Cannot start: WIKI_ARCHIVE_MODE must be live or bundled.');
  process.exit(1);
}
const wikiClient =
  archiveMode === 'bundled'
    ? new WikiArchiveClient(() =>
        Promise.reject(new TypeError('Wikipedia disabled: bundled mode')),
      )
    : new WikiArchiveClient();
const recordedProvider = new RecordedArchiveProvider();
const app = createApp(createPlayerProvider(config), {
  playerSource: config.mode,
  historyProvider: new WikidataHistoryProvider(),
  archiveProvider: new WikipediaArchiveProvider(wikiClient, archiveMode),
  teamArchiveProvider: new WikipediaTeamArchiveProvider(
    wikiClient,
    undefined,
    (team) => {
      const found = recordedProvider.dataset.snapshots.find(
        (s) => s.team.id === team.id,
      );
      return found
        ? recordedTeamArchive(found, recordedProvider.dataset.createdAt)
        : null;
    },
  ),
  recordedArchiveProvider: recordedProvider,
  shotArchiveProvider: await createShotArchiveProvider(),
  awardsProvider: new WikipediaAwardsProvider(wikiClient),
  lineupStudyProvider: await createLineupStudyProvider(),
  draftProvider: new WikipediaDraftProvider(wikiClient),
  archiveMode,
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
