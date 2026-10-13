import { Router } from 'express';
import { z } from 'zod';
import {
  ArchiveGameIdSchema,
  ArchiveGamesResponseSchema,
  ArchiveLeagueResponseSchema,
  ArchiveSeasonSchema,
  CanonicalTeamIdSchema,
  GameDateSchema,
} from '@nba-performance-explorer/contracts';
import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import { SourceWorkBudget } from '../research/source-work-budget.js';
import { staticTeamDirectoryProvider } from '../teams/team-directory-provider.js';
import { ArchiveSourceError } from './wiki-client.js';
import {
  archiveProvenance,
  attribution,
  type ArchiveProvider,
} from './archive-provider.js';
const leagueQuery = z
  .object({ season: ArchiveSeasonSchema.default('2023-24') })
  .strict();
const gamesQuery = leagueQuery
  .extend({ date: GameDateSchema.optional(), team: CanonicalTeamIdSchema.optional() })
  .strict();
export function createArchiveRouter(
  provider: ArchiveProvider | undefined,
  budget: SourceWorkBudget,
) {
  const router = Router();
  const wrap: typeof budget.wrap = (handler) =>
    budget.wrap(async (req, res, next) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        if (!(error instanceof ArchiveSourceError)) throw error;
        const status =
          error.kind === 'invalid' ? 502 : error.kind === 'timeout' ? 504 : 503;
        sendApiError(
          res,
          status,
          `ARCHIVE_SOURCE_${error.kind.toUpperCase()}`,
          'The historical snapshot source is unavailable. No substitute results are shown.',
        );
      }
    });
  const league = wrap(async (req, res) => {
    const query = leagueQuery.safeParse(req.query);
    if (!query.success)
      return sendApiError(
        res,
        400,
        'INVALID_ARCHIVE_SEASON',
        'This source supports the recorded 2023-24 season only.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'ARCHIVE_DISABLED',
        'Historical snapshot provider is disabled.',
      );
    const data = await provider.getLeague();
    res.json(
      ArchiveLeagueResponseSchema.parse({
        season: query.data.season,
        scope: 'regular-season',
        standings: data.standings,
        leaders: data.leaders,
        attribution: attribution(data.page),
        provenance: archiveProvenance(data.page, 'regular-season', provider.source),
      }),
    );
  });
  router.get('/standings', league);
  router.get('/leaders', league);
  router.all('/standings', methodNotAllowedHandler);
  router.all('/leaders', methodNotAllowedHandler);
  const games = wrap(async (req, res) => {
    const query = gamesQuery.safeParse(req.query),
      id = req.params.gameId;
    if (
      !query.success ||
      (id && !ArchiveGameIdSchema.safeParse(id).success) ||
      (id && Object.keys(req.query).some((k) => k !== 'season'))
    )
      return sendApiError(
        res,
        400,
        'INVALID_ARCHIVE_GAMES',
        'Choose a recorded source game/date/team in the 2023-24 playoff snapshot.',
      );
    if (
      query.data.team &&
      !(await staticTeamDirectoryProvider.getTeam(query.data.team))
    )
      return sendApiError(res, 404, 'TEAM_NOT_FOUND', 'Team not found.');
    if (!provider)
      return sendApiError(
        res,
        503,
        'ARCHIVE_DISABLED',
        'Historical snapshot provider is disabled.',
      );
    const data = await provider.getGames();
    const filtered = data.games.filter(
      (g) =>
        (!id || g.id === id) &&
        (!query.data.date || g.date === query.data.date) &&
        (!query.data.team ||
          g.home.id === query.data.team ||
          g.away.id === query.data.team),
    );
    if (id && !filtered.length)
      return sendApiError(
        res,
        404,
        'GAME_NOT_FOUND',
        'Game not found in the recorded snapshot.',
      );
    const dates = data.games.map((g) => g.date).sort();
    res.json(
      ArchiveGamesResponseSchema.parse({
        season: query.data.season,
        scope: 'playoffs',
        games: filtered,
        recordedGames: data.games.length,
        firstDate: dates[0],
        lastDate: dates.at(-1),
        attribution: attribution(data.page),
        provenance: archiveProvenance(data.page, 'playoffs', provider.source),
      }),
    );
  });
  router.get('/games', games);
  router.get('/games/:gameId', games);
  router.all('/games', methodNotAllowedHandler);
  router.all('/games/:gameId', methodNotAllowedHandler);
  return router;
}
