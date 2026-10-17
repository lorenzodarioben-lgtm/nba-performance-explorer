import { Router } from 'express';
import { z } from 'zod';
import {
  ArchiveGameIdSchema,
  ArchiveGamesResponseSchema,
  ArchiveLeagueResponseSchema,
  ArchiveSeasonSchema,
  CanonicalTeamIdSchema,
  GameDateSchema,
  PlayoffBracketQuerySchema,
  PlayoffBracketResponseSchema,
  PlayoffSeriesFilmRoomResponseSchema,
  PlayoffSeriesIdSchema,
} from '@nba-performance-explorer/contracts';
import { recordedConferences } from '../recorded-archive/recorded-team-rankings.js';
import { buildPlayoffBracket, parsePublishedSeeds } from './playoff-series.js';
import { analyzeSeries, seriesNeighbours } from './playoff-film-room.js';
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
  const bracket = wrap(async (req, res) => {
    const query = PlayoffBracketQuerySchema.safeParse(req.query);
    if (!query.success)
      return sendApiError(
        res,
        400,
        'INVALID_PLAYOFF_BRACKET',
        'The playoff bracket supports the recorded 2023-24 season only.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'ARCHIVE_DISABLED',
        'Historical snapshot provider is disabled.',
      );
    res.json(
      PlayoffBracketResponseSchema.parse(
        await loadBracket(provider, query.data.season),
      ),
    );
  });
  const series = wrap(async (req, res) => {
    const id = PlayoffSeriesIdSchema.safeParse(req.params.seriesId);
    if (!id.success || Object.keys(req.query).length)
      return sendApiError(
        res,
        400,
        'INVALID_PLAYOFF_SERIES',
        'Choose a recorded 2024 playoff series, such as r4-BOS-DAL.',
      );
    if (!provider)
      return sendApiError(
        res,
        503,
        'ARCHIVE_DISABLED',
        'Historical snapshot provider is disabled.',
      );
    const bracket = await loadBracket(provider, '2023-24');
    const found = bracket.series.find((s) => s.id === id.data);
    if (!found)
      return sendApiError(
        res,
        404,
        'PLAYOFF_SERIES_NOT_FOUND',
        'No recorded 2024 playoff series has that ID.',
      );
    res.json(
      PlayoffSeriesFilmRoomResponseSchema.parse({
        season: bracket.season,
        scope: 'playoffs',
        series: found,
        analysis: analyzeSeries(found),
        ...seriesNeighbours(found, bracket.series),
        champion: bracket.champion,
        seedsPublished: bracket.seedsPublished,
        attribution: bracket.attribution,
        conferenceSource: bracket.conferenceSource,
        provenance: {
          ...bracket.provenance,
          warnings: [
            ...bracket.provenance.warnings,
            'Series analysis uses final and period scores only: margins, period totals and the score after three quarters. There is no play-by-play, so no runs, lead changes within a period or possessions are described.',
          ],
        },
      }),
    );
  });
  router.get('/games/bracket', bracket);
  router.all('/games/bracket', methodNotAllowedHandler);
  router.get('/games/series/:seriesId', series);
  router.all('/games/series/:seriesId', methodNotAllowedHandler);
  router.get('/games', games);
  router.get('/games/:gameId', games);
  router.all('/games', methodNotAllowedHandler);
  router.all('/games/:gameId', methodNotAllowedHandler);
  return router;
}

/** The bracket as served by /games/bracket; the series film room reads the same object. */
async function loadBracket(provider: ArchiveProvider, season: '2023-24') {
  const data = await provider.getGames();
  const provenance = archiveProvenance(data.page, 'playoffs', provider.source);
  const published =
    data.seeds ??
    parsePublishedSeeds(data.page.html, await staticTeamDirectoryProvider.listTeams());
  const derived = buildPlayoffBracket(data.games, published.seeds);
  return PlayoffBracketResponseSchema.parse({
    season: season,
    scope: 'playoffs',
    ...derived,
    issues: published.issue ? [...derived.issues, published.issue] : derived.issues,
    seedsPublished: published.seeds !== null,
    recordedGames: data.games.length,
    attribution: attribution(data.page),
    conferenceSource: recordedConferences.source,
    provenance: {
      ...provenance,
      coverage:
        'Series and bracket derived from the recorded 2024 playoff finals (2023-24 season). Historical; play-in games are outside this source table.',
      warnings: [
        ...provenance.warnings,
        'A series is every recorded game between two teams; a winner is named only when the recorded games end with a fourth win. Rounds come from each team’s own order of series and are cross-checked against the round digit in NBA game IDs.',
        'Seeds are read only from the source page’s series headings and must be consistent (one seed per team, unique within a conference); otherwise none are shown. Conference alignment uses the sourced 2023-24 facts.',
      ],
    },
  });
}
