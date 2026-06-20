import express, { type Express } from 'express';

import { createPlayersRouter } from './features/players/players-router.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { healthRouter } from './routes/health.js';

export function createApp(): Express {
  const application = express();

  application.disable('x-powered-by');
  application.use(express.json());
  application.use('/api/health', healthRouter);
  application.use('/api/players', createPlayersRouter());
  application.use(notFoundHandler);
  application.use(errorHandler);

  return application;
}

export const app = createApp();
