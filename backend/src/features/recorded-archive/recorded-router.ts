import { Router } from 'express';
import {
  ArchiveRankingQuerySchema,
  RecordedRecordsQuerySchema,
  HypotheticalQuerySchema,
  RecordedTeamComparisonQuerySchema,
  RecordedAnalyticsQuerySchema,
  RecordedDiscoveryQuerySchema,
  RecordedCalendarQuerySchema,
  RecordedProgressionQuerySchema,
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
  router.get('/directory', (req, res) => {
    if (Object.keys(req.query).length)
      return sendApiError(
        res,
        400,
        'INVALID_RECORDED_DIRECTORY',
        'This recorded directory has no query parameters.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'RECORDED_ARCHIVE_DISABLED',
        'Recorded dataset disabled.',
      );
    return res.json(provider.directory());
  });
  router.all('/directory', methodNotAllowedHandler);
  router.get('/hypothetical', (req, res) => {
    const q = HypotheticalQuerySchema.safeParse(req.query);
    if (!q.success)
      return sendApiError(
        res,
        400,
        'INVALID_HYPOTHETICAL_GROUP',
        'Choose exactly five different recorded NBA identities and supported scope.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'RECORDED_ARCHIVE_DISABLED',
        'Recorded dataset disabled.',
      );
    return res.json(provider.hypothetical(q.data.players, q.data.scope));
  });
  router.all('/hypothetical', methodNotAllowedHandler);
  router.get('/team-comparison', (req, res) => {
    const q = RecordedTeamComparisonQuerySchema.safeParse(req.query);
    if (!q.success)
      return sendApiError(
        res,
        400,
        'INVALID_RECORDED_TEAM_COMPARISON',
        'Choose two different source team IDs.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'RECORDED_ARCHIVE_DISABLED',
        'Recorded dataset disabled.',
      );
    if (
      q.data.teams.some(
        (id) => !provider.dataset.snapshots.some((t) => t.team.id === id),
      )
    )
      return sendApiError(
        res,
        404,
        'TEAM_NOT_FOUND',
        'Team not found in recorded data.',
      );
    return res.json(provider.compareTeams(q.data.teams));
  });
  router.all('/team-comparison', methodNotAllowedHandler);
  router.get('/analytics', (req, res) => {
    const q = RecordedAnalyticsQuerySchema.safeParse(req.query);
    if (!q.success)
      return sendApiError(
        res,
        400,
        'INVALID_RECORDED_ANALYTICS',
        'Choose different supported metrics, explicit GP and weights.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'RECORDED_ARCHIVE_DISABLED',
        'Recorded dataset disabled.',
      );
    return res.json(provider.analytics(q.data));
  });
  router.all('/analytics', methodNotAllowedHandler);
  router.get('/discovery', (req, res) => {
    const q = RecordedDiscoveryQuerySchema.safeParse(req.query);
    if (!q.success)
      return sendApiError(
        res,
        400,
        'INVALID_RECORDED_DISCOVERY',
        'Choose different supported axes, qualification and bounded thresholds.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'RECORDED_ARCHIVE_DISABLED',
        'Recorded dataset disabled.',
      );
    return res.json(provider.discovery(q.data));
  });
  router.all('/discovery', methodNotAllowedHandler);
  router.get('/calendar', (req, res) => {
    const q = RecordedCalendarQuerySchema.safeParse(req.query);
    if (!q.success)
      return sendApiError(
        res,
        400,
        'INVALID_RECORDED_CALENDAR',
        'Choose a valid MM-DD calendar label and recorded season/team.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'RECORDED_ARCHIVE_DISABLED',
        'Recorded dataset disabled.',
      );
    if (
      q.data.team &&
      !provider.dataset.snapshots.some((s) => s.team.id === q.data.team)
    )
      return sendApiError(
        res,
        404,
        'TEAM_NOT_FOUND',
        'Team not found in recorded source.',
      );
    return res.json(provider.calendar(q.data));
  });
  router.all('/calendar', methodNotAllowedHandler);
  router.get('/progression', (req, res) => {
    const q = RecordedProgressionQuerySchema.safeParse(req.query);
    if (!q.success)
      return sendApiError(
        res,
        400,
        'INVALID_RECORDED_PROGRESSION',
        'Choose recorded2023-24 metric/team, ordered calendar window and daily sample threshold.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'RECORDED_ARCHIVE_DISABLED',
        'Recorded dataset disabled.',
      );
    if (
      q.data.team &&
      !provider.dataset.snapshots.some((s) => s.team.id === q.data.team)
    )
      return sendApiError(
        res,
        404,
        'TEAM_NOT_FOUND',
        'Team not found in recorded source.',
      );
    return res.json(provider.progression(q.data));
  });
  router.all('/progression', methodNotAllowedHandler);
  return router;
}
