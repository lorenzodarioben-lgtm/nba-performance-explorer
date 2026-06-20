import {
  ApiErrorResponseSchema,
  PlayerSearchResponseSchema,
} from '@nba-performance-explorer/contracts';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../../app.js';

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
