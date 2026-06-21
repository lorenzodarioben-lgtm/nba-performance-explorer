import {
  ApiErrorResponseSchema,
  GameDateSchema,
  GameIdSchema,
  PlayerGameLogResponseSchema,
} from '@nba-performance-explorer/contracts';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../../app.js';
import { fixtureGames } from './game-fixtures.js';
import { fixturePlayerProvider } from './fixture-player-provider.js';

describe('GET /api/players/:playerId/seasons/:season/games', () => {
  it('returns a newest-first, contract-valid multi-game log', async () => {
    const response = await request(app)
      .get('/api/players/2544/seasons/2023-24/games')
      .expect(200);
    const body = PlayerGameLogResponseSchema.parse(response.body);

    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(body.season).toBe('2023-24');
    expect(body.games.map((game) => game.date)).toEqual([
      '2024-04-14',
      '2024-04-09',
      '2024-01-15',
      '2023-12-25',
    ]);
    expect(body.games.map((game) => game.id)).toEqual([
      'lal-2024-04-14-nop',
      'lal-2024-04-09-gsw',
      'lal-2024-01-15-den',
      'lal-2023-12-25-bos',
    ]);
  });

  it('maps a complete game record, including home/away, win/loss, and zero values', async () => {
    const response = await request(app)
      .get('/api/players/2544/seasons/2023-24/games')
      .expect(200);
    const { games } = PlayerGameLogResponseSchema.parse(response.body);

    expect(games[0]).toEqual({
      id: 'lal-2024-04-14-nop',
      date: '2024-04-14',
      team: { abbreviation: 'LAL' },
      opponent: { abbreviation: 'NOP' },
      location: 'home',
      result: 'W',
      minutes: 38,
      points: 28,
      rebounds: 11,
      assists: 17,
    });
    // Away loss with a zero-valued statistic.
    expect(games[2]).toMatchObject({
      date: '2024-01-15',
      opponent: { abbreviation: 'DEN' },
      location: 'away',
      result: 'L',
      assists: 0,
    });
  });

  it('returns a single-game log for a one-game season', async () => {
    const response = await request(app)
      .get('/api/players/1641705/seasons/2023-24/games')
      .expect(200);
    const { games } = PlayerGameLogResponseSchema.parse(response.body);

    expect(games).toHaveLength(1);
    expect(games[0]?.id).toBe('sas-2024-04-12-dal');
    expect(games[0]?.team.abbreviation).toBe('SAS');
  });

  it('returns an empty log for a known season with no game records', async () => {
    const response = await request(app)
      .get('/api/players/2544/seasons/2018-19/games')
      .expect(200);

    expect(PlayerGameLogResponseSchema.parse(response.body)).toEqual({
      season: '2018-19',
      games: [],
    });
  });

  it('returns a structured 404 for an unknown player', async () => {
    const response = await request(app)
      .get('/api/players/999999/seasons/2023-24/games')
      .expect(404);

    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'PLAYER_NOT_FOUND',
    );
    expect(JSON.stringify(response.body).toLowerCase()).not.toContain('stack');
  });

  it('returns a structured 404 for an unknown valid season', async () => {
    const response = await request(app)
      .get('/api/players/2544/seasons/2020-21/games')
      .expect(404);

    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'SEASON_NOT_FOUND',
    );
  });

  it('returns a structured 400 for an invalid player id', async () => {
    const response = await request(app)
      .get('/api/players/0/seasons/2023-24/games')
      .expect(400);

    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'INVALID_PLAYER_ID',
    );
  });

  it('returns a structured 400 for an invalid season id', async () => {
    const response = await request(app)
      .get('/api/players/2544/seasons/2023-25/games')
      .expect(400);

    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'INVALID_SEASON_ID',
    );
  });

  it('does not leak provider-private fields and limits the payload to contract fields', async () => {
    const response = await request(app)
      .get('/api/players/2544/seasons/2023-24/games')
      .expect(200);
    const responseText = JSON.stringify(response.body);

    for (const privateField of [
      'playerId',
      'gameId',
      'gameDate',
      'teamCode',
      'opponentCode',
    ]) {
      expect(responseText).not.toContain(privateField);
    }
    expect(Object.keys(response.body)).toEqual(['season', 'games']);
  });

  it('does not mutate the private fixture source when sorting', async () => {
    const before = fixtureGames.map((record) => record.gameId);

    await fixturePlayerProvider.listPlayerGames('2544', '2023-24');

    const after = fixtureGames.map((record) => record.gameId);
    expect(after).toEqual(before);
  });

  it('returns a structured 405 for unsupported methods', async () => {
    const response = await request(app)
      .post('/api/players/2544/seasons/2023-24/games')
      .expect(405);

    expect(response.headers.allow).toBe('GET');
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'METHOD_NOT_ALLOWED',
    );
  });
});

describe('players router ordering with the games route', () => {
  it('keeps every nested and top-level route independently reachable and distinct', async () => {
    const games = await request(app)
      .get('/api/players/2544/seasons/2023-24/games')
      .expect(200);
    const stats = await request(app)
      .get('/api/players/2544/seasons/2023-24/stats')
      .expect(200);
    const seasonsList = await request(app).get('/api/players/2544/seasons').expect(200);
    const trends = await request(app)
      .get('/api/players/2544/season-trends')
      .expect(200);
    const profile = await request(app).get('/api/players/2544').expect(200);

    // `games` is not intercepted by `stats`, the season list, or the profile route.
    expect(games.body).toHaveProperty('games');
    expect(games.body).not.toHaveProperty('stats');
    expect(games.body).not.toHaveProperty('player');
    expect(stats.body).toHaveProperty('stats');
    expect(seasonsList.body.seasons[0]).not.toHaveProperty('gamesPlayed'); // summary entries
    expect(trends.body.seasons[0]).toHaveProperty('gamesPlayed'); // full stats entries
    expect(profile.body).toHaveProperty('player');

    await request(app).get('/api/health').expect(200);
    await request(app).get('/api/players').query({ search: 'curry' }).expect(200);
  });
});

describe('game-log contract invariants', () => {
  const team = { abbreviation: 'LAL' };
  const game = (id: string, date: string) => ({
    id,
    date,
    team,
    opponent: { abbreviation: 'NOP' },
    location: 'home',
    result: 'W',
    minutes: 30,
    points: 20,
    rebounds: 5,
    assists: 5,
  });
  const build = (entries: [string, string][]) => ({
    season: '2023-24',
    games: entries.map(([id, date]) => game(id, date)),
  });

  it('validates real dates and rejects invalid calendar dates', () => {
    expect(GameDateSchema.safeParse('2024-04-14').success).toBe(true);
    expect(GameDateSchema.safeParse('2024-02-29').success).toBe(true); // leap day
    expect(GameDateSchema.safeParse('2023-02-29').success).toBe(false);
    expect(GameDateSchema.safeParse('2024-13-01').success).toBe(false);
    expect(GameDateSchema.safeParse('2024-04-31').success).toBe(false);
    expect(GameDateSchema.safeParse('04/14/2024').success).toBe(false);
  });

  it('validates game ids', () => {
    expect(GameIdSchema.safeParse('game-2024-04-14-lal-nop').success).toBe(true);
    expect(GameIdSchema.safeParse('-game-1').success).toBe(false);
    expect(GameIdSchema.safeParse('game/1').success).toBe(false);
    expect(GameIdSchema.safeParse('Game1').success).toBe(false);
  });

  it('rejects duplicate ids, equal dates, and ascending order', () => {
    expect(
      PlayerGameLogResponseSchema.safeParse(
        build([
          ['a', '2024-04-14'],
          ['b', '2024-04-09'],
        ]),
      ).success,
    ).toBe(true);
    expect(
      PlayerGameLogResponseSchema.safeParse(
        build([
          ['a', '2024-04-14'],
          ['a', '2024-04-09'],
        ]),
      ).success,
    ).toBe(false); // duplicate id
    expect(
      PlayerGameLogResponseSchema.safeParse(
        build([
          ['a', '2024-04-14'],
          ['b', '2024-04-14'],
        ]),
      ).success,
    ).toBe(false); // equal dates
    expect(
      PlayerGameLogResponseSchema.safeParse(
        build([
          ['a', '2024-04-09'],
          ['b', '2024-04-14'],
        ]),
      ).success,
    ).toBe(false); // ascending
  });

  it('rejects unknown fields', () => {
    expect(
      PlayerGameLogResponseSchema.safeParse({
        ...build([['a', '2024-04-14']]),
        extra: 1,
      }).success,
    ).toBe(false);
  });
});
