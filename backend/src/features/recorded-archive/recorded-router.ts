import { Router } from 'express';
import {
  ArchiveRankingQuerySchema,
  RecordedRecordsQuerySchema,
} from '@nba-performance-explorer/contracts';
import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import type { RecordedArchiveProvider } from './recorded-provider.js';
export function createRecordedRouter(provider: RecordedArchiveProvider | undefined) {
  const router = Router();
  router.get('/leaders', (req, res) => {
    const query = ArchiveRankingQuerySchema.safeParse(req.query);
    if (!query.success)
      return sendApiError(
        res,
        400,
        'INVALID_RECORDED_RANKING',
        'Choose supported historical scope, metric, qualification and page controls.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'RECORDED_ARCHIVE_DISABLED',
        'Recorded historical dataset disabled.',
      );
    if (
      query.data.team &&
      !provider.dataset.snapshots.some((s) => s.team.id === query.data.team)
    )
      return sendApiError(
        res,
        404,
        'TEAM_NOT_FOUND',
        'Team not found in recorded source.',
      );
    return res.json(provider.rank(query.data));
  });
  router.all('/leaders', methodNotAllowedHandler);
  router.get('/records', (req, res) => {
    const query = RecordedRecordsQuerySchema.safeParse(req.query);
    if (!query.success)
      return sendApiError(
        res,
        400,
        'INVALID_RECORDED_RECORD',
        'Choose supported historical metric/team filters.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'RECORDED_ARCHIVE_DISABLED',
        'Recorded historical dataset disabled.',
      );
    if (
      query.data.team &&
      !provider.dataset.snapshots.some((s) => s.team.id === query.data.team)
    )
      return sendApiError(
        res,
        404,
        'TEAM_NOT_FOUND',
        'Team not found in recorded source.',
      );
    return res.json(provider.records(query.data));
  });
  router.all('/records', methodNotAllowedHandler);
  return router;
}
