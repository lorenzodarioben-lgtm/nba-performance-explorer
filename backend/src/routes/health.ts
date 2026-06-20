import {
  HealthResponseSchema,
  type HealthResponse,
} from '@nba-performance-explorer/contracts';
import { Router } from 'express';

import { methodNotAllowedHandler } from '../middleware/errors.js';

export const healthRouter = Router();

healthRouter.get('/', (_request, response) => {
  const responseBody: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'nba-performance-explorer-api',
  };

  response.status(200).json(HealthResponseSchema.parse(responseBody));
});

healthRouter.all('/', methodNotAllowedHandler);
