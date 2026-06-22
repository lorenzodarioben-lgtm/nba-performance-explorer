import {
  ApiErrorResponseSchema,
  PlayerSeasonTrendsResponseSchema,
} from '@nba-performance-explorer/contracts';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../../app.js';
import { fixturePlayerProvider } from './fixture-player-provider.js';
import { fixtureSeasons } from './season-fixtures.js';

describe('GET /api/players/:playerId/season-trends', () => {
  it('returns all seasons oldest-first and contract-valid for a multi-season player', async () => {
    const response = await request(app)
      .get('/api/players/2544/season-trends')
      .expect(200);
    const { seasons } = PlayerSeasonTrendsResponseSchema.parse(response.body);

    expect(seasons.map((entry) => entry.season)).toEqual([
      '2017-18',
      '2018-19',
      '2023-24',
    ]);
    // Team changes across seasons are preserved.
    expect(seasons.map((entry) => entry.team.abbreviation)).toEqual([
      'CLE',
      'LAL',
      'LAL',
    ]);
  });

  it('maps complete statistics for an entry', async () => {
    const response = await request(app)
      .get('/api/players/2544/season-trends')
      .expect(200);
    const { seasons } = PlayerSeasonTrendsResponseSchema.parse(response.body);

    expect(seasons[0]).toEqual({
      season: '2017-18',
      team: { abbreviation: 'CLE' },
      gamesPlayed: 82,
      minutesPerGame: 36.9,
      pointsPerGame: 27.5,
      reboundsPerGame: 8.6,
      assistsPerGame: 9.1,
      stealsPerGame: 1.4,
      blocksPerGame: 0.9,
      turnoversPerGame: 4.2,
      fieldGoalPercentage: 0.542,
      threePointPercentage: 0.367,
      freeThrowPercentage: 0.731,
    });
  });

  it('returns a single-entry array for a one-season player', async () => {
    const response = await request(app)
      .get('/api/players/1641705/season-trends')
      .expect(200);
    const { seasons } = PlayerSeasonTrendsResponseSchema.parse(response.body);

    expect(seasons).toHaveLength(1);
    expect(seasons[0]?.season).toBe('2023-24');
    expect(seasons[0]?.team.abbreviation).toBe('SAS');
  });

  it('returns an empty array for a known player with no seasons', async () => {
    const response = await request(app)
      .get('/api/players/1629611/season-trends')
      .expect(200);

    expect(PlayerSeasonTrendsResponseSchema.parse(response.body)).toEqual({
      seasons: [],
    });
  });

  it('returns a structured 404 for an unknown player', async () => {
    const response = await request(app)
      .get('/api/players/999999/season-trends')
      .expect(404);

    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'PLAYER_NOT_FOUND',
    );
    expect(JSON.stringify(response.body).toLowerCase()).not.toContain('stack');
  });

  it('returns a structured 400 for an invalid player id', async () => {
    const response = await request(app).get('/api/players/0/season-trends').expect(400);

    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'INVALID_PLAYER_ID',
    );
  });

  it('does not leak provider-private fields and limits the payload to contract fields', async () => {
    const response = await request(app)
      .get('/api/players/2544/season-trends')
      .expect(200);
    const responseText = JSON.stringify(response.body);

    for (const privateField of [
      'playerId',
      'franchiseCode',
      'sourceId',
      'sourceSlug',
    ]) {
      expect(responseText).not.toContain(privateField);
    }
    expect(Object.keys(response.body)).toEqual(['seasons']);
  });

  it('does not mutate the private fixture source when sorting', async () => {
    const before = fixtureSeasons.map(
      (record) => `${record.playerId}:${record.season}`,
    );

    await fixturePlayerProvider.listPlayerSeasonStats('2544');

    const after = fixtureSeasons.map((record) => `${record.playerId}:${record.season}`);
    expect(after).toEqual(before);
  });

  it('returns a structured 405 for unsupported methods', async () => {
    const response = await request(app)
      .post('/api/players/2544/season-trends')
      .expect(405);

    expect(response.headers.allow).toBe('GET');
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'METHOD_NOT_ALLOWED',
    );
  });
});

describe('players router ordering with the trends route', () => {
  it('keeps trends, season list, selected-season stats, profile, search, and health distinct', async () => {
    const trends = await request(app)
      .get('/api/players/2544/season-trends')
      .expect(200);
    const seasons = await request(app).get('/api/players/2544/seasons').expect(200);
    const stats = await request(app)
      .get('/api/players/2544/seasons/2023-24/stats')
      .expect(200);
    const profile = await request(app).get('/api/players/2544').expect(200);

    // Trends and the season list both expose `seasons`, but are distinct routes: trend
    // entries carry full statistics and are oldest-first; season-list entries are summaries
    // and newest-first. This proves no route shadows another.
    expect(trends.body.seasons[0]).toHaveProperty('gamesPlayed');
    expect(trends.body.seasons[0].season).toBe('2017-18');
    expect(seasons.body.seasons[0]).not.toHaveProperty('gamesPlayed');
    expect(seasons.body.seasons[0].season).toBe('2023-24');
    expect(stats.body).toHaveProperty('stats');
    expect(profile.body).toHaveProperty('player');

    await request(app).get('/api/health').expect(200);
    await request(app).get('/api/players').query({ search: 'curry' }).expect(200);
  });
});

describe('season trends contract', () => {
  const team = { abbreviation: 'LAL' };
  const stat = (season: string) => ({
    season,
    team,
    gamesPlayed: 70,
    minutesPerGame: 35,
    pointsPerGame: 25,
    reboundsPerGame: 7,
    assistsPerGame: 8,
    stealsPerGame: 1,
    blocksPerGame: 0.5,
    turnoversPerGame: 3,
    fieldGoalPercentage: 0.5,
    threePointPercentage: 0.4,
    freeThrowPercentage: 0.8,
  });
  const build = (ids: string[]) => ({ seasons: ids.map(stat) });

  it('accepts a trends entry without a team (traded season)', () => {
    const entry = { ...stat('2023-24'), team: undefined };
    expect(
      PlayerSeasonTrendsResponseSchema.safeParse({ seasons: [entry] }).success,
    ).toBe(true);
  });

  it('accepts oldest-first and rejects reversed, duplicate, and unknown-field responses', () => {
    expect(
      PlayerSeasonTrendsResponseSchema.safeParse(build(['2017-18', '2023-24'])).success,
    ).toBe(true);
    expect(
      PlayerSeasonTrendsResponseSchema.safeParse(build(['2023-24', '2017-18'])).success,
    ).toBe(false);
    expect(
      PlayerSeasonTrendsResponseSchema.safeParse(build(['2018-19', '2018-19'])).success,
    ).toBe(false);
    expect(
      PlayerSeasonTrendsResponseSchema.safeParse({
        seasons: [{ ...stat('2023-24'), foo: 1 }],
      }).success,
    ).toBe(false);
  });
});
