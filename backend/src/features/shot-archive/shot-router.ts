import { Router } from 'express';
import {
  ShotQuerySchema,
  ShotBoxQuerySchema,
} from '@nba-performance-explorer/contracts';
import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import type { ShotArchiveProvider } from './shot-provider.js';
export function createShotRouter(provider: ShotArchiveProvider | undefined) {
  const router = Router();
  router.get('/directory', (req, res) => {
    if (Object.keys(req.query).length)
      return sendApiError(
        res,
        400,
        'INVALID_SHOT_DIRECTORY',
        'Shot directory takes no query parameters.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'SHOT_ARCHIVE_DISABLED',
        'Recorded shot archive disabled.',
      );
    return res.json(provider.directory);
  });
  router.all('/directory', methodNotAllowedHandler);
  router.get('/box', (req, res) => {
    const q = ShotBoxQuerySchema.safeParse(req.query);
    if (!q.success)
      return sendApiError(
        res,
        400,
        'INVALID_SHOOTING_BOX',
        'Choose exact recorded 2018 playoff game and minimum attempts.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'SHOT_ARCHIVE_DISABLED',
        'Recorded shot dataset disabled.',
      );
    if (!provider.directory.games.some((g) => g.id === q.data.game))
      return sendApiError(
        res,
        404,
        'SHOT_GAME_NOT_FOUND',
        'Game absent from recorded shot source.',
      );
    return res.json(provider.shootingBox(q.data.game, q.data.minAttempts));
  });
  router.all('/box', methodNotAllowedHandler);
  router.get('/', (req, res) => {
    const q = ShotQuerySchema.safeParse(req.query);
    if (!q.success)
      return sendApiError(
        res,
        400,
        'INVALID_SHOT_QUERY',
        'Choose the recorded 2017-18 playoff scope and bounded shot filters.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'SHOT_ARCHIVE_DISABLED',
        'Recorded shot archive disabled.',
      );
    if (
      q.data.players?.some(
        (id) => !provider.directory.players.some((p) => p.id === id),
      ) ||
      (q.data.team && !provider.directory.teams.some((t) => t.id === q.data.team)) ||
      (q.data.opponent &&
        !provider.directory.teams.some((t) => t.abbreviation === q.data.opponent)) ||
      (q.data.game && !provider.directory.games.some((g) => g.id === q.data.game))
    )
      return sendApiError(
        res,
        404,
        'SHOT_SELECTION_NOT_FOUND',
        'Identity/game not present in this historical shot dataset.',
      );
    return res.json(provider.analyze(q.data));
  });
  router.all('/', methodNotAllowedHandler);
  return router;
}
