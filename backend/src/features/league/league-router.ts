import { Router, type Response } from 'express';
import {
  CanonicalTeamIdSchema,
  LeagueLeadersQuerySchema,
  LeagueTeamQuerySchema,
  LeagueRecordsQuerySchema,
  LeagueTeamRankingsQuerySchema,
  LeagueStandingsQuerySchema,
  LeagueCalendarQuerySchema,
  LeagueGameIdSchema,
  LeagueGamesQuerySchema,
  LeagueMovementQuerySchema,
  LeagueDistributionQuerySchema,
  ResearchPlayerIdSchema,
  LeagueEraPlayersQuerySchema,
  LeaguePlayerSearchQuerySchema,
  LeaguePlayerSearchResponseSchema,
  LeagueLineupsQuerySchema,
} from '@nba-performance-explorer/contracts';
import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import { LeagueRequestError, type LeagueService } from './league-service.js';
import { ProviderError } from '../players/provider-error.js';
import { LeagueTeams } from './league-teams.js';
import { LeagueRecords } from './league-records.js';
import { LeagueGames, leagueStatus } from './league-games.js';
import type { NbaLiveClient } from './league-live.js';
import { LeaguePlayers } from './league-players.js';
import { LeagueEras } from './league-eras.js';
import { LeagueLineups } from './league-lineups.js';
import { LeagueHonours } from './league-honours.js';

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

/** The asynchronous form of respond. */
async function respondAsync(res: Response, run: () => Promise<unknown>) {
  try {
    return res.json(await run());
  } catch (error) {
    if (error instanceof LeagueRequestError)
      return sendApiError(res, error.status, error.code, error.message);
    if (!(error instanceof ProviderError)) {
      // A bug, not an unreachable source: log it and say so.
      console.error('League request failed:', error);
      return sendApiError(
        res,
        500,
        'LEAGUE_INTERNAL_ERROR',
        'The league archive failed to answer.',
      );
    }
    return sendApiError(
      res,
      503,
      'LEAGUE_SOURCE_UNAVAILABLE',
      'An NBA.com source needed for this request could not be reached.',
    );
  }
}

const repeated = (query: Record<string, unknown>) =>
  Object.values(query).some((v) => Array.isArray(v));

export function createLeagueRouter(
  service: LeagueService | undefined,
  live?: NbaLiveClient,
) {
  const router = Router();
  const teams = service ? new LeagueTeams(service) : undefined;
  const records = service ? new LeagueRecords(service) : undefined;
  const games = service ? new LeagueGames(service, live) : undefined;
  const players = service ? new LeaguePlayers(service) : undefined;
  const eras = service ? new LeagueEras(service) : undefined;
  const lineups = service ? new LeagueLineups(service, live) : undefined;
  const honours = service ? new LeagueHonours(service) : undefined;
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
  router.get('/standings/current', (req, res) => {
    if (Object.keys(req.query).length)
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_STANDINGS',
        'This endpoint takes no parameters.',
      );
    return respondAsync(res, () => games!.currentStandings());
  });
  router.all('/standings/current', methodNotAllowedHandler);
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
  router.get('/records', (req, res) => {
    const q = LeagueRecordsQuerySchema.safeParse(req.query);
    if (!q.success || repeated(req.query))
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_RECORDS',
        'Choose a scope, record kind, category and mode from the supported values.',
      );
    return respond(res, () => records!.records(q.data));
  });
  router.all('/records', methodNotAllowedHandler);
  router.get('/team-rankings', (req, res) => {
    const q = LeagueTeamRankingsQuerySchema.safeParse(req.query);
    if (!q.success || repeated(req.query))
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_TEAM_RANKINGS',
        'Choose a season, scope and team measure from the supported values.',
      );
    return respond(res, () =>
      records!.teamRankings(q.data.season, q.data.scope, q.data.metric),
    );
  });
  router.all('/team-rankings', methodNotAllowedHandler);
  router.get('/games', (req, res) => {
    const q = LeagueGamesQuerySchema.safeParse(req.query);
    if (!q.success || repeated(req.query))
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_GAMES',
        'Choose a date (YYYY-MM-DD) and an optional team ID.',
      );
    return respondAsync(res, () => games!.games(q.data.date, q.data.team));
  });
  router.all('/games', methodNotAllowedHandler);
  router.get('/snapshot', (req, res) => {
    if (Object.keys(req.query).length)
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_SNAPSHOT',
        'This endpoint takes no parameters.',
      );
    return respondAsync(res, () => games!.snapshot());
  });
  router.all('/snapshot', methodNotAllowedHandler);
  router.get('/calendar', (req, res) => {
    const q = LeagueCalendarQuerySchema.safeParse(req.query);
    if (!q.success || repeated(req.query))
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_CALENDAR',
        'Choose a month as YYYY-MM.',
      );
    return respondAsync(res, () => games!.calendar(q.data.month));
  });
  router.all('/calendar', methodNotAllowedHandler);
  router.get('/games/:gameId', (req, res) => {
    const id = LeagueGameIdSchema.safeParse(req.params.gameId);
    if (!id.success || Object.keys(req.query).length)
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_GAME',
        'Use a game ID such as nba:0022300001.',
      );
    return respondAsync(res, () => games!.detail(id.data));
  });
  router.all('/games/:gameId', methodNotAllowedHandler);
  router.get('/games/:gameId/play-by-play', (req, res) => {
    const id = LeagueGameIdSchema.safeParse(req.params.gameId);
    if (!id.success || Object.keys(req.query).length)
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_GAME',
        'Use a game ID such as nba:0022300001.',
      );
    return respondAsync(res, () => games!.playByPlay(id.data));
  });
  router.all('/games/:gameId/play-by-play', methodNotAllowedHandler);
  router.get('/status', (req, res) => {
    if (Object.keys(req.query).length)
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_STATUS',
        'This endpoint takes no parameters.',
      );
    return respondAsync(res, () => leagueStatus(service!, live));
  });
  router.all('/status', methodNotAllowedHandler);
  router.get('/player-search', (req, res) => {
    const q = LeaguePlayerSearchQuerySchema.safeParse(req.query);
    if (!q.success || repeated(req.query))
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_PLAYER_SEARCH',
        'Type at least two letters of a name.',
      );
    return respond(res, () =>
      LeaguePlayerSearchResponseSchema.parse({ results: players!.search(q.data.q) }),
    );
  });
  router.all('/player-search', methodNotAllowedHandler);
  router.get('/players/:playerId', (req, res) => {
    const id = ResearchPlayerIdSchema.safeParse(req.params.playerId);
    if (!id.success || Object.keys(req.query).length)
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_PLAYER',
        'Use a numeric NBA player ID.',
      );
    return respond(res, () => players!.player(id.data));
  });
  router.all('/players/:playerId', methodNotAllowedHandler);
  router.get('/movement', (req, res) => {
    const q = LeagueMovementQuerySchema.safeParse(req.query);
    if (!q.success || repeated(req.query))
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_MOVEMENT',
        'Choose a season, scope, measure, mode and an optional date.',
      );
    return respond(res, () => players!.movement(q.data));
  });
  router.all('/movement', methodNotAllowedHandler);
  router.get('/distribution', (req, res) => {
    const q = LeagueDistributionQuerySchema.safeParse(req.query);
    if (!q.success || repeated(req.query))
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_DISTRIBUTION',
        'Choose a season, scope, measure and an optional player ID.',
      );
    return respond(res, () => players!.distribution(q.data));
  });
  router.all('/distribution', methodNotAllowedHandler);
  router.get('/lineups', (req, res) => {
    const q = LeagueLineupsQuerySchema.safeParse(req.query);
    if (!q.success || repeated(req.query))
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_LINEUPS',
        'Choose a season, a team ID and an optional minutes minimum.',
      );
    return respondAsync(res, () =>
      lineups!.lineups(q.data.season, q.data.team, q.data.minMinutes),
    );
  });
  router.all('/lineups', methodNotAllowedHandler);
  router.get('/honours', (req, res) => {
    if (Object.keys(req.query).length)
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_HONOURS',
        'This endpoint takes no parameters.',
      );
    return respond(res, () => honours!.honours());
  });
  router.all('/honours', methodNotAllowedHandler);
  router.get('/eras', (req, res) => {
    if (Object.keys(req.query).length)
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_ERAS',
        'This endpoint takes no parameters.',
      );
    return respond(res, () => eras!.eras());
  });
  router.all('/eras', methodNotAllowedHandler);
  router.get('/era-players', (req, res) => {
    const q = LeagueEraPlayersQuerySchema.safeParse(req.query);
    if (!q.success || repeated(req.query))
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_ERA_PLAYERS',
        'Choose one to four unique NBA player IDs and an optional minutes minimum.',
      );
    return respond(res, () => eras!.players(q.data.players, q.data.minMinutes));
  });
  router.all('/era-players', methodNotAllowedHandler);
  router.get('/teams/:teamId', (req, res) => {
    const id = CanonicalTeamIdSchema.safeParse(req.params.teamId);
    const q = LeagueTeamQuerySchema.safeParse(req.query);
    if (!id.success || !q.success || repeated(req.query))
      return sendApiError(
        res,
        400,
        'INVALID_LEAGUE_TEAM',
        'Use a team ID such as nba:1610612738 and an optional season label.',
      );
    return respond(res, () => teams!.team(id.data, q.data.season));
  });
  router.all('/teams/:teamId', methodNotAllowedHandler);
  return router;
}
