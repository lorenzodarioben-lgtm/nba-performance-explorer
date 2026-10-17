import { Router } from 'express';
import { StudyLineupQuerySchema } from '@nba-performance-explorer/contracts';
import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import type { LineupStudyProvider } from './lineup-study-provider.js';
export function createLineupStudyRouter(provider: LineupStudyProvider | undefined) {
  const router = Router();
  router.get('/directory', (req, res) => {
    if (Object.keys(req.query).length)
      return sendApiError(
        res,
        400,
        'INVALID_STUDY_DIRECTORY',
        'Study directory has no query parameters.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'STUDY_LINEUPS_DISABLED',
        'Research lineup dataset disabled.',
      );
    return res.json(provider.directory());
  });
  router.all('/directory', methodNotAllowedHandler);
  router.get('/', (req, res) => {
    const q = StudyLineupQuerySchema.safeParse(req.query);
    if (!q.success)
      return sendApiError(
        res,
        400,
        'INVALID_STUDY_LINEUP_QUERY',
        'Choose 2017-18 regular research scope, native member IDs and bounded filters.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'STUDY_LINEUPS_DISABLED',
        'Research lineup dataset disabled.',
      );
    if (
      q.data.members?.some((id) => !provider.people.has(id)) ||
      q.data.compare?.some((id) => !provider.lineups.has(id)) ||
      (q.data.team && !provider.hasTeam(q.data.team))
    )
      return sendApiError(
        res,
        404,
        'STUDY_SELECTION_NOT_FOUND',
        'Identity/group/team absent from usable research dataset.',
      );
    return res.json(provider.list(q.data));
  });
  router.all('/', methodNotAllowedHandler);
  return router;
}
