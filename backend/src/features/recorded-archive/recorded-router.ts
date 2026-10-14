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
  RecordedProfilesQuerySchema,
  RecordedTeamRankingsQuerySchema,
  RecordedTeamSeasonQuerySchema,
  RecordedStandingsRaceQuerySchema,
} from '@nba-performance-explorer/contracts';
import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import type { RecordedArchiveProvider } from './recorded-provider.js';
export function createRecordedRouter(provider: RecordedArchiveProvider | undefined) {
  const router = Router();
  router.get('/team-rankings', (req, res) => {
    const q = RecordedTeamRankingsQuerySchema.safeParse(req.query);
    if (!q.success)
      return sendApiError(
        res,
        400,
        'INVALID_RECORDED_TEAM_RANKINGS',
        'Choose a recorded team metric, qualification, conference and coverage filter.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'RECORDED_ARCHIVE_DISABLED',
        'Recorded dataset disabled.',
      );
    return res.json(provider.teamRankings(q.data));
  });
  router.all('/team-rankings', methodNotAllowedHandler);
  router.get('/profiles', (req, res) => {
    const q = RecordedProfilesQuerySchema.safeParse(req.query);
    if (!q.success)
      return sendApiError(
        res,
        400,
        'INVALID_RECORDED_PROFILES',
        'Choose one to four unique player IDs, three to six unique supported categories and a GP minimum.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'RECORDED_ARCHIVE_DISABLED',
        'Recorded dataset disabled.',
      );
    return res.json(provider.profiles(q.data));
  });
  router.all('/profiles', methodNotAllowedHandler);
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
        'Choose recorded 2023-24 metric/team, ordered calendar window and daily sample threshold.',
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
  router.get('/team-season', (req, res) => {
    const q = RecordedTeamSeasonQuerySchema.safeParse(req.query);
    if (!q.success || Object.values(req.query).some(Array.isArray))
      return sendApiError(
        res,
        400,
        'INVALID_RECORDED_TEAM_SEASON',
        'Choose one namespaced team ID for the recorded 2023-24 season.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'RECORDED_ARCHIVE_DISABLED',
        'Recorded dataset disabled.',
      );
    const season = provider.teamSeason(q.data);
    if (!season)
      return sendApiError(
        res,
        404,
        'TEAM_NOT_FOUND',
        'Team not found in recorded source.',
      );
    return res.json(season);
  });
  router.all('/team-season', methodNotAllowedHandler);
  router.get('/standings-race', (req, res) => {
    const q = RecordedStandingsRaceQuerySchema.safeParse(req.query);
    if (!q.success || Object.values(req.query).some(Array.isArray))
      return sendApiError(
        res,
        400,
        'INVALID_RECORDED_STANDINGS_RACE',
        'Choose the recorded 2023-24 season and optionally one conference (East or West).',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'RECORDED_ARCHIVE_DISABLED',
        'Recorded dataset disabled.',
      );
    return res.json(provider.standingsRace(q.data));
  });
  router.all('/standings-race', methodNotAllowedHandler);
  return router;
}
