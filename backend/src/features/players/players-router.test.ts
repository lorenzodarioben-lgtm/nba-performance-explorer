import {
  ApiErrorResponseSchema,
  PlayerProfileResponseSchema,
  PlayerProfileSchema,
  PlayerSearchResponseSchema,
} from '@nba-performance-explorer/contracts';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app, createApp } from '../../app.js';
import type { PlayerProvider } from './player-provider.js';
import {
  type ProviderError,
  providerInvalidResponse,
  providerTimeout,
  providerUnavailable,
} from './provider-error.js';

describe('GET /api/players', () => {
  it.each([
    ['a missing search value', '/api/players'],
    ['a blank search value', '/api/players?search=%20%20%20'],
    ['a one-character search value', '/api/players?search=a'],
    ['repeated search values', '/api/players?search=le&search=br'],
  ])('rejects %s with the shared structured error format', async (_label, url) => {
    const response = await request(app).get(url).expect(400);

    expect(ApiErrorResponseSchema.parse(response.body)).toEqual({
      error: {
        code: 'INVALID_SEARCH_QUERY',
        message: 'Search must contain at least two characters.',
        status: 400,
      },
    });
    expect(JSON.stringify(response.body).toLowerCase()).not.toContain('stack');
  });

  it('trims surrounding whitespace before searching', async () => {
    const response = await request(app)
      .get('/api/players')
      .query({ search: '  lebron  ' })
      .expect(200);

    expect(PlayerSearchResponseSchema.parse(response.body).players).toEqual([
      {
        id: '2544',
        fullName: 'LeBron James',
        team: {
          abbreviation: 'LAL',
        },
        position: 'F',
      },
    ]);
  });

  it('matches complete player names case-insensitively', async () => {
    const response = await request(app)
      .get('/api/players')
      .query({ search: 'LEBRON JAMES' })
      .expect(200);

    expect(PlayerSearchResponseSchema.parse(response.body).players[0]?.fullName).toBe(
      'LeBron James',
    );
  });

  it('matches first names', async () => {
    const response = await request(app)
      .get('/api/players')
      .query({ search: 'stephen' })
      .expect(200);

    expect(PlayerSearchResponseSchema.parse(response.body).players[0]?.fullName).toBe(
      'Stephen Curry',
    );
  });

  it('matches last names', async () => {
    const response = await request(app)
      .get('/api/players')
      .query({ search: 'curry' })
      .expect(200);

    expect(PlayerSearchResponseSchema.parse(response.body).players[0]?.fullName).toBe(
      'Stephen Curry',
    );
  });

  it('returns shared contract-compliant data with optional positions', async () => {
    const response = await request(app)
      .get('/api/players')
      .query({ search: 'irving' })
      .expect(200);
    const parsedResponse = PlayerSearchResponseSchema.parse(response.body);

    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(parsedResponse.players).toEqual([
      {
        id: '202681',
        fullName: 'Kyrie Irving',
        team: {
          abbreviation: 'DAL',
        },
      },
    ]);
  });

  it('returns no more than eight players in deterministic order', async () => {
    const firstResponse = await request(app)
      .get('/api/players')
      .query({ search: 'an' })
      .expect(200);
    const secondResponse = await request(app)
      .get('/api/players')
      .query({ search: 'an' })
      .expect(200);
    const firstPlayers = PlayerSearchResponseSchema.parse(firstResponse.body).players;
    const secondPlayers = PlayerSearchResponseSchema.parse(secondResponse.body).players;

    expect(firstPlayers).toHaveLength(8);
    expect(secondPlayers).toEqual(firstPlayers);
    expect(firstPlayers.map((player) => player.fullName)).toEqual([
      'Anthony Edwards',
      'Brandon Ingram',
      'Domantas Sabonis',
      'Donovan Mitchell',
      'Franz Wagner',
      'Giannis Antetokounmpo',
      'Julius Randle',
      'Karl-Anthony Towns',
    ]);
  });

  it('does not expose provider-private fixture fields', async () => {
    const response = await request(app)
      .get('/api/players')
      .query({ search: 'lebron' })
      .expect(200);
    const responseText = JSON.stringify(response.body);

    expect(PlayerSearchResponseSchema.parse(response.body).players).toHaveLength(1);
    expect(responseText).not.toContain('sourceId');
    expect(responseText).not.toContain('givenName');
    expect(responseText).not.toContain('familyName');
    expect(responseText).not.toContain('franchiseCode');
    expect(responseText).not.toContain('listedPosition');
    expect(responseText).not.toContain('sourceSlug');
  });
});

describe('optional team contract', () => {
  it('accepts a player summary and profile without a team', () => {
    // The live NBA.com provider may omit team for free agents / inactive players.
    expect(
      PlayerSearchResponseSchema.safeParse({
        players: [{ id: '2544', fullName: 'LeBron James' }],
      }).success,
    ).toBe(true);
    expect(
      PlayerProfileSchema.safeParse({ id: '2544', fullName: 'LeBron James' }).success,
    ).toBe(true);
  });
});

describe('provider error mapping', () => {
  function failingProvider(error: ProviderError): PlayerProvider {
    const fail = (): Promise<never> => Promise.reject(error);
    return {
      searchPlayers: fail,
      getPlayerById: fail,
      listPlayerSeasons: fail,
      getPlayerSeasonStats: fail,
      listPlayerSeasonStats: fail,
      listPlayerGames: fail,
    };
  }

  it.each([
    ['timeout', providerTimeout(), 504, 'PROVIDER_TIMEOUT'],
    ['unavailable', providerUnavailable(), 503, 'PROVIDER_UNAVAILABLE'],
    ['invalid response', providerInvalidResponse(), 502, 'PROVIDER_INVALID_RESPONSE'],
  ])(
    'maps a provider %s to its stable HTTP status without leaking details',
    async (_label, error, status, code) => {
      const failingApp = createApp(failingProvider(error));
      const response = await request(failingApp)
        .get('/api/players')
        .query({ search: 'le' })
        .expect(status);

      expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(code);
      expect(JSON.stringify(response.body).toLowerCase()).not.toContain('stack');
      expect(JSON.stringify(response.body).toLowerCase()).not.toContain('nba stats');
    },
  );
});

describe('GET /api/players/:playerId', () => {
  it('returns a complete profile that passes the shared contract', async () => {
    const response = await request(app).get('/api/players/2544').expect(200);

    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(PlayerProfileResponseSchema.parse(response.body)).toEqual({
      player: {
        id: '2544',
        fullName: 'LeBron James',
        team: { abbreviation: 'LAL', name: 'Lakers', city: 'Los Angeles' },
        position: 'F',
        jerseyNumber: '23',
        heightInches: 81,
        weightPounds: 250,
        country: 'USA',
        draft: { year: 2003, round: 1, pick: 1 },
      },
    });
  });

  it('omits position when the fixture player has none', async () => {
    const response = await request(app).get('/api/players/202681').expect(200);
    const { player } = PlayerProfileResponseSchema.parse(response.body);

    expect(player.fullName).toBe('Kyrie Irving');
    expect(player).not.toHaveProperty('position');
    expect(player.team).toEqual({
      abbreviation: 'DAL',
      name: 'Mavericks',
      city: 'Dallas',
    });
  });

  it('omits country when the fixture player has none', async () => {
    const response = await request(app).get('/api/players/1627742').expect(200);
    const { player } = PlayerProfileResponseSchema.parse(response.body);

    expect(player.fullName).toBe('Brandon Ingram');
    expect(player).not.toHaveProperty('country');
    expect(player.draft).toEqual({ year: 2016, round: 1, pick: 2 });
  });

  it('omits the draft key when the fixture player has no draft', async () => {
    const response = await request(app).get('/api/players/1629611').expect(200);
    const { player } = PlayerProfileResponseSchema.parse(response.body);

    expect(player.fullName).toBe('Terance Mann');
    expect(player).not.toHaveProperty('draft');
    expect(player.jerseyNumber).toBe('14');
  });

  it('does not expose provider-private fixture fields', async () => {
    const response = await request(app).get('/api/players/2544').expect(200);
    const responseText = JSON.stringify(response.body);

    for (const privateField of [
      'sourceId',
      'givenName',
      'familyName',
      'franchiseCode',
      'listedPosition',
      'sourceSlug',
    ]) {
      expect(responseText).not.toContain(privateField);
    }
  });

  it('limits the payload to the profile contract fields', async () => {
    const response = await request(app).get('/api/players/2544').expect(200);

    // A strict parse throws on extra keys, so an equal round-trip proves the payload
    // carries only the allowed contract fields.
    expect(PlayerProfileResponseSchema.parse(response.body)).toEqual(response.body);
    expect(Object.keys(response.body)).toEqual(['player']);
  });

  it('rejects unknown fields through the strict profile contract', () => {
    const valid = {
      id: '2544',
      fullName: 'LeBron James',
      team: { abbreviation: 'LAL', name: 'Lakers', city: 'Los Angeles' },
    };

    expect(PlayerProfileSchema.safeParse(valid).success).toBe(true);
    expect(PlayerProfileSchema.safeParse({ ...valid, sourceSlug: 'x' }).success).toBe(
      false,
    );
  });

  it.each([
    ['zero', '0'],
    ['a negative-like value', '-1'],
    ['a decimal-like value', '1.5'],
    ['an alphabetic value', 'abc'],
  ])('rejects %s with a structured 400', async (_label, playerId) => {
    const response = await request(app).get(`/api/players/${playerId}`).expect(400);

    expect(ApiErrorResponseSchema.parse(response.body)).toEqual({
      error: {
        code: 'INVALID_PLAYER_ID',
        message: 'Player id is not valid.',
        status: 400,
      },
    });
    expect(JSON.stringify(response.body).toLowerCase()).not.toContain('stack');
  });

  it('returns a structured 404 for an unknown valid id', async () => {
    const response = await request(app).get('/api/players/999999').expect(404);

    expect(ApiErrorResponseSchema.parse(response.body)).toEqual({
      error: {
        code: 'PLAYER_NOT_FOUND',
        message: 'Player not found.',
        status: 404,
      },
    });
    expect(JSON.stringify(response.body).toLowerCase()).not.toContain('stack');
  });

  it('returns a structured 405 for unsupported methods', async () => {
    const response = await request(app).post('/api/players/2544').expect(405);

    expect(response.headers.allow).toBe('GET');
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'METHOD_NOT_ALLOWED',
    );
  });
});
