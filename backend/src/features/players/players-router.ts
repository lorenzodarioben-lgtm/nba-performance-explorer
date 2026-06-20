import {
  PlayerProfileResponseSchema,
  PlayerSearchResponseSchema,
  type PlayerSearchResponse,
} from '@nba-performance-explorer/contracts';
import { Router } from 'express';

import { methodNotAllowedHandler, sendApiError } from '../../middleware/errors.js';
import { fixturePlayerProvider } from './fixture-player-provider.js';
import { parsePlayerIdParam } from './player-id-param.js';
import { parsePlayerSearchQuery } from './player-search-query.js';
import type { PlayerProvider } from './player-provider.js';

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
