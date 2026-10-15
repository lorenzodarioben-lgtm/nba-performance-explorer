import { Router, type Response } from 'express';
import {
  LeagueLeadersQuerySchema,
  LeagueStandingsQuerySchema,
} from '@nba-performance-explorer/contracts';
import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import { LeagueRequestError, type LeagueService } from './league-service.js';

/** Runs a handler and maps league request errors to their documented status codes. */
export function respond(res: Response, run: () => unknown) {
  try {
    return res.json(run());
  } catch (error) {
    if (error instanceof LeagueRequestError)
      return sendApiError(res, error.status, error.code, error.message);
    throw error;
  }
}

const repeated = (query: Record<string, unknown>) =>
  Object.values(query).some((v) => Array.isArray(v));

export function createLeagueRouter(service: LeagueService | undefined) {
  const router = Router();
  router.use((_req, res, next) => {
    if (!service)
      return sendApiError(
        res,
        503,
        'LEAGUE_ARCHIVE_DISABLED',
        'The league archive is not loaded.',
      );
    return next();
  });
  router.get('/seasons', (req, res) => {
    if (Object.keys(req.query).length)
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_SEASONS',
        'This endpoint takes no parameters.',
      );
    return respond(res, () => service!.seasons());
  });
  router.all('/seasons', methodNotAllowedHandler);
  router.get('/standings', (req, res) => {
    const q = LeagueStandingsQuerySchema.safeParse(req.query);
    if (!q.success || repeated(req.query))
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_STANDINGS',
        'Choose one season label such as 2024-25.',
      );
    return respond(res, () => service!.standings(q.data.season));
  });
  router.all('/standings', methodNotAllowedHandler);
  router.get('/leaders', (req, res) => {
    const q = LeagueLeadersQuerySchema.safeParse(req.query);
    if (!q.success || repeated(req.query))
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_LEADERS',
        'Choose a season, scope, metric, mode, team and qualification from the supported values.',
      );
    return respond(res, () => service!.leaders(q.data));
  });
  router.all('/leaders', methodNotAllowedHandler);
  return router;
}
