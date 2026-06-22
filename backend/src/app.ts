import express, { type Express } from 'express';

import type { PlayerProvider } from './features/players/player-provider.js';
import { createPlayersRouter } from './features/players/players-router.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { healthRouter } from './routes/health.js';

// The provider is injected at the composition root (server.ts). When omitted, the players router
// falls back to the fixture provider, which keeps the exported test `app` deterministic.
export function createApp(playerProvider?: PlayerProvider): Express {
  const application = express();

  application.disable('x-powered-by');
  application.use(express.json());
  application.use('/api/health', healthRouter);
  application.use('/api/players', createPlayersRouter(playerProvider));
  application.use(notFoundHandler);
  application.use(errorHandler);

  return application;
}

export const app = createApp();
