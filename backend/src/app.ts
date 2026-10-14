import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import express, { type Express } from 'express';
import type { DataSource } from '@nba-performance-explorer/contracts';

import type { PlayerProvider } from './features/players/player-provider.js';
import { fixturePlayerProvider } from './features/players/fixture-player-provider.js';
import { createResearchRouter } from './features/research/research-router.js';
import { createTeamsRouter } from './features/teams/teams-router.js';
import type { SeasonTotalsProvider } from './features/research/season-totals-provider.js';
import { createCohortRouter } from './features/research/cohort-router.js';
import { SourceWorkBudget } from './features/research/source-work-budget.js';
import { createCareerRouter } from './features/research/career-router.js';
import { createGameResearchRouter } from './features/research/game-research-router.js';
import type { GameResearchProvider } from './features/research/game-research-provider.js';
import { createHistoryRouter } from './features/history/history-router.js';
import type { HistoryProvider } from './features/history/history-provider.js';
import type { PlayerBioProvider } from './features/research/player-bio-provider.js';
import { createArchiveRouter } from './features/wiki-archive/archive-router.js';
import type { ArchiveProvider } from './features/wiki-archive/archive-provider.js';
import { createTeamArchiveRouter } from './features/wiki-archive/team-archive-router.js';
import type { TeamArchiveProvider } from './features/wiki-archive/team-archive-provider.js';
import { createPlayersRouter } from './features/players/players-router.js';
import { createRecordedRouter } from './features/recorded-archive/recorded-router.js';
import type { RecordedArchiveProvider } from './features/recorded-archive/recorded-provider.js';
import type { ShotArchiveProvider } from './features/shot-archive/shot-provider.js';
import { createShotRouter } from './features/shot-archive/shot-router.js';
import { createAwardsRouter } from './features/history/history-awards-router.js';
import type { HistoricalAwardsProvider } from './features/history/history-awards-provider.js';
import type { LineupStudyProvider } from './features/lineup-study/lineup-study-provider.js';
import { createLineupStudyRouter } from './features/lineup-study/lineup-study-router.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { healthRouter } from './routes/health.js';

// Optional same-origin static hosting for the built frontend. When `FRONTEND_DIST` points to a
// built frontend, serve its assets and an SPA fallback from the same origin as the API; this is
// how the single Render web service serves both the app and `/api` (ADR-014). Unset (tests and
// local dev) leaves the app API-only, so existing behaviour is unchanged. A configured but
// missing directory throws so a misconfigured production deploy fails before serving traffic.
function configureFrontend(application: Express): void {
  const configured = process.env.FRONTEND_DIST?.trim();
  if (!configured) {
    return;
  }

  const distDir = resolve(configured);
  const indexHtml = join(distDir, 'index.html');
  if (!existsSync(indexHtml)) {
    throw new Error(
      `FRONTEND_DIST is set to "${configured}" but no built frontend (index.html) was found there.`,
    );
  }

  application.use(express.static(distDir));

  // SPA fallback: a GET/HEAD request for a non-API path that matched no static file returns
  // index.html so client-side routes load on refresh. API paths are excluded so unknown `/api`
  // routes keep returning the structured 404.
  application.use((request, response, next) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      next();
      return;
    }
    if (request.path.startsWith('/api/')) {
      next();
      return;
    }
    response.sendFile(indexHtml);
  });
}

// The provider is injected at the composition root (server.ts). When omitted, the players router
// falls back to the fixture provider, which keeps the exported test `app` deterministic.
export function createApp(
  playerProvider?: PlayerProvider,
  options: {
    playerSource?: DataSource;
    totalsProvider?: SeasonTotalsProvider;
    gamesProvider?: GameResearchProvider;
    historyProvider?: HistoryProvider;
    bioProvider?: PlayerBioProvider;
    archiveProvider?: ArchiveProvider;
    teamArchiveProvider?: TeamArchiveProvider;
    recordedArchiveProvider?: RecordedArchiveProvider;
    shotArchiveProvider?: ShotArchiveProvider;
    awardsProvider?: HistoricalAwardsProvider;
    lineupStudyProvider?: LineupStudyProvider;
  } = {},
): Express {
  const application = express();
  const researchBudget = new SourceWorkBudget();

  application.disable('x-powered-by');
  application.use(express.json());
  application.use('/api/health', healthRouter);
  application.use('/api/shots', createShotRouter(options.shotArchiveProvider));
  application.use(
    '/api/research-lineups',
    createLineupStudyRouter(options.lineupStudyProvider),
  );
  application.use(
    '/api/history',
    createAwardsRouter(options.awardsProvider, researchBudget),
  );
  application.use(
    '/api/recorded',
    createRecordedRouter(options.recordedArchiveProvider),
  );
  application.use('/api/players', createPlayersRouter(playerProvider));
  application.use('/api/teams', createTeamsRouter());
  application.use(
    '/api/teams',
    createTeamArchiveRouter(options.teamArchiveProvider, researchBudget),
  );
  application.use('/api', createArchiveRouter(options.archiveProvider, researchBudget));
  application.use(
    '/api/history',
    createHistoryRouter(options.historyProvider, researchBudget),
  );
  application.use(
    '/api',
    createGameResearchRouter(
      playerProvider ?? fixturePlayerProvider,
      options.playerSource ?? (playerProvider ? 'unknown' : 'fixture'),
      options.gamesProvider,
      options.totalsProvider,
      researchBudget,
    ),
  );
  application.use(
    '/api',
    createCareerRouter(
      playerProvider ?? fixturePlayerProvider,
      options.playerSource ?? (playerProvider ? 'unknown' : 'fixture'),
      options.totalsProvider,
      researchBudget,
      options.bioProvider,
    ),
  );
  application.use(
    '/api/analytics/cohort',
    createCohortRouter(
      playerProvider ?? fixturePlayerProvider,
      options.playerSource ?? (playerProvider ? 'unknown' : 'fixture'),
      options.totalsProvider,
      researchBudget,
    ),
  );
  application.use(
    '/api',
    createResearchRouter(
      playerProvider ?? fixturePlayerProvider,
      options.playerSource ?? (playerProvider ? 'unknown' : 'fixture'),
      options.totalsProvider,
      researchBudget,
      {
        history: !!options.historyProvider,
        games: !!options.gamesProvider,
        archive: !!options.archiveProvider,
        teamArchive: !!options.teamArchiveProvider,
        shots: !!options.shotArchiveProvider,
      },
    ),
  );
  configureFrontend(application);
  application.use(notFoundHandler);
  application.use(errorHandler);

  return application;
}

export const app = createApp();
