import {
  PlayerGameLogResponseSchema,
  PlayerProfileResponseSchema,
  PlayerSearchResponseSchema,
  PlayerSeasonStatsResponseSchema,
  PlayerSeasonTrendsResponseSchema,
  PlayerSeasonsResponseSchema,
  type PlayerSearchResponse,
} from '@nba-performance-explorer/contracts';
import { Router } from 'express';

import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import { fixturePlayerProvider } from './fixture-player-provider.js';
import { parsePlayerIdParam } from './player-id-param.js';
import { parsePlayerSearchQuery } from './player-search-query.js';
import type { PlayerProvider } from './player-provider.js';
import { parseSeasonParam } from './season-param.js';

const maximumSearchResults = 8;

export function createPlayersRouter(
  playerProvider: PlayerProvider = fixturePlayerProvider,
) {
  const playersRouter = Router();

  playersRouter.get('/', async (request, response) => {
    const parsedQuery = parsePlayerSearchQuery(request.query);

    if (!parsedQuery.success) {
      return sendApiError(
        response,
        400,
        'INVALID_SEARCH_QUERY',
        'Search must contain at least two characters.',
      );
    }

    const players = await playerProvider.searchPlayers(
      parsedQuery.data.search,
      maximumSearchResults,
    );
    const responseBody: PlayerSearchResponse = {
      players,
    };

    return response.status(200).json(PlayerSearchResponseSchema.parse(responseBody));
  });

  playersRouter.all('/', methodNotAllowedHandler);

  playersRouter.get('/:playerId/season-trends', async (request, response) => {
    const parsedParams = parsePlayerIdParam(request.params);

    if (!parsedParams.success) {
      return sendApiError(
        response,
        400,
        'INVALID_PLAYER_ID',
        'Player id is not valid.',
      );
    }

    const { playerId } = parsedParams.data;
    const profile = await playerProvider.getPlayerById(playerId);

    if (!profile) {
      return sendApiError(response, 404, 'PLAYER_NOT_FOUND', 'Player not found.');
    }

    const seasons = await playerProvider.listPlayerSeasonStats(playerId);

    return response
      .status(200)
      .json(PlayerSeasonTrendsResponseSchema.parse({ seasons }));
  });

  playersRouter.all('/:playerId/season-trends', methodNotAllowedHandler);

  playersRouter.get('/:playerId/seasons/:season/games', async (request, response) => {
    const parsedId = parsePlayerIdParam(request.params);

    if (!parsedId.success) {
      return sendApiError(
        response,
        400,
        'INVALID_PLAYER_ID',
        'Player id is not valid.',
      );
    }

    const parsedSeason = parseSeasonParam(request.params);

    if (!parsedSeason.success) {
      return sendApiError(
        response,
        400,
        'INVALID_SEASON_ID',
        'Season id is not valid.',
      );
    }

    const { playerId } = parsedId.data;
    const { season } = parsedSeason.data;
    const profile = await playerProvider.getPlayerById(playerId);

    if (!profile) {
      return sendApiError(response, 404, 'PLAYER_NOT_FOUND', 'Player not found.');
    }

    const stats = await playerProvider.getPlayerSeasonStats(playerId, season);

    if (!stats) {
      return sendApiError(response, 404, 'SEASON_NOT_FOUND', 'Season not found.');
    }

    const games = await playerProvider.listPlayerGames(playerId, season);

    return response
      .status(200)
      .json(PlayerGameLogResponseSchema.parse({ season, games }));
  });

  playersRouter.all('/:playerId/seasons/:season/games', methodNotAllowedHandler);

  playersRouter.get('/:playerId/seasons/:season/stats', async (request, response) => {
    const parsedId = parsePlayerIdParam(request.params);

    if (!parsedId.success) {
      return sendApiError(
        response,
        400,
        'INVALID_PLAYER_ID',
        'Player id is not valid.',
      );
    }

    const parsedSeason = parseSeasonParam(request.params);

    if (!parsedSeason.success) {
      return sendApiError(
        response,
        400,
        'INVALID_SEASON_ID',
        'Season id is not valid.',
      );
    }

    const { playerId } = parsedId.data;
    const profile = await playerProvider.getPlayerById(playerId);

    if (!profile) {
      return sendApiError(response, 404, 'PLAYER_NOT_FOUND', 'Player not found.');
    }

    const stats = await playerProvider.getPlayerSeasonStats(
      playerId,
      parsedSeason.data.season,
    );

    if (!stats) {
      return sendApiError(response, 404, 'SEASON_NOT_FOUND', 'Season not found.');
    }

    return response.status(200).json(PlayerSeasonStatsResponseSchema.parse({ stats }));
  });

  playersRouter.all('/:playerId/seasons/:season/stats', methodNotAllowedHandler);

  playersRouter.get('/:playerId/seasons', async (request, response) => {
    const parsedParams = parsePlayerIdParam(request.params);

    if (!parsedParams.success) {
      return sendApiError(
        response,
        400,
        'INVALID_PLAYER_ID',
        'Player id is not valid.',
      );
    }

    const { playerId } = parsedParams.data;
    const profile = await playerProvider.getPlayerById(playerId);

    if (!profile) {
      return sendApiError(response, 404, 'PLAYER_NOT_FOUND', 'Player not found.');
    }

    const seasons = await playerProvider.listPlayerSeasons(playerId);

    return response.status(200).json(PlayerSeasonsResponseSchema.parse({ seasons }));
  });

  playersRouter.all('/:playerId/seasons', methodNotAllowedHandler);

  playersRouter.get('/:playerId', async (request, response) => {
    const parsedParams = parsePlayerIdParam(request.params);

    if (!parsedParams.success) {
      return sendApiError(
        response,
        400,
        'INVALID_PLAYER_ID',
        'Player id is not valid.',
      );
    }

    const profile = await playerProvider.getPlayerById(parsedParams.data.playerId);

    if (!profile) {
      return sendApiError(response, 404, 'PLAYER_NOT_FOUND', 'Player not found.');
    }

    return response
      .status(200)
      .json(PlayerProfileResponseSchema.parse({ player: profile }));
  });

  playersRouter.all('/:playerId', methodNotAllowedHandler);

  return playersRouter;
}
