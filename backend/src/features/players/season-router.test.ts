import {
  ApiErrorResponseSchema,
  PlayerProfileResponseSchema,
  PlayerSeasonStatsResponseSchema,
  PlayerSeasonStatsSchema,
  PlayerSeasonsResponseSchema,
  SeasonIdSchema,
} from '@nba-performance-explorer/contracts';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../../app.js';

describe('GET /api/players/:playerId/seasons', () => {
  it("returns a known player's seasons newest-first and contract-valid", async () => {
    const response = await request(app).get('/api/players/2544/seasons').expect(200);
    const { seasons } = PlayerSeasonsResponseSchema.parse(response.body);

    expect(seasons.map((entry) => entry.season)).toEqual([
      '2023-24',
      '2018-19',
      '2017-18',
    ]);
    expect(seasons.map((entry) => entry.team.abbreviation)).toEqual([
      'LAL',
      'LAL',
      'CLE',
    ]);
  });

  it('returns a single-season player', async () => {
    const response = await request(app).get('/api/players/1641705/seasons').expect(200);
    const { seasons } = PlayerSeasonsResponseSchema.parse(response.body);

    expect(seasons).toEqual([{ season: '2023-24', team: { abbreviation: 'SAS' } }]);
  });

  it('returns an empty list for a known player with no season data', async () => {
    const response = await request(app).get('/api/players/1629611/seasons').expect(200);

    expect(PlayerSeasonsResponseSchema.parse(response.body)).toEqual({ seasons: [] });
  });

  it('returns a structured 404 for an unknown player', async () => {
    const response = await request(app).get('/api/players/999999/seasons').expect(404);

    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'PLAYER_NOT_FOUND',
    );
    expect(JSON.stringify(response.body).toLowerCase()).not.toContain('stack');
  });

  it('returns a structured 400 for an invalid player id', async () => {
    const response = await request(app).get('/api/players/0/seasons').expect(400);

    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'INVALID_PLAYER_ID',
    );
  });

  it('returns a structured 405 for unsupported methods', async () => {
    const response = await request(app).post('/api/players/2544/seasons').expect(405);

    expect(response.headers.allow).toBe('GET');
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'METHOD_NOT_ALLOWED',
    );
  });
});

describe('GET /api/players/:playerId/seasons/:season/stats', () => {
  it('returns contract-valid statistics for a known player and season', async () => {
    const response = await request(app)
      .get('/api/players/2544/seasons/2023-24/stats')
      .expect(200);

    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(PlayerSeasonStatsResponseSchema.parse(response.body)).toEqual({
      stats: {
        season: '2023-24',
        team: { abbreviation: 'LAL' },
        gamesPlayed: 71,
        minutesPerGame: 35.3,
        pointsPerGame: 25.7,
        reboundsPerGame: 7.3,
        assistsPerGame: 8.3,
        stealsPerGame: 1.3,
        blocksPerGame: 0.5,
        turnoversPerGame: 3.5,
        fieldGoalPercentage: 0.54,
        threePointPercentage: 0.41,
        freeThrowPercentage: 0.75,
      },
    });
  });

  it('reflects a different team in a different season', async () => {
    const response = await request(app)
      .get('/api/players/2544/seasons/2017-18/stats')
      .expect(200);
    const { stats } = PlayerSeasonStatsResponseSchema.parse(response.body);

    expect(stats.team.abbreviation).toBe('CLE');
    expect(stats.gamesPlayed).toBe(82);
  });

  it('supports a valid zero-valued statistic', async () => {
    const response = await request(app)
      .get('/api/players/201939/seasons/2022-23/stats')
      .expect(200);
    const { stats } = PlayerSeasonStatsResponseSchema.parse(response.body);

    expect(stats.blocksPerGame).toBe(0);
  });

  it('returns a structured 404 for an unknown valid season', async () => {
    const response = await request(app)
      .get('/api/players/2544/seasons/2020-21/stats')
      .expect(404);

    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'SEASON_NOT_FOUND',
    );
    expect(JSON.stringify(response.body).toLowerCase()).not.toContain('stack');
  });

  it('returns a structured 400 for invalid season syntax', async () => {
    const response = await request(app)
      .get('/api/players/2544/seasons/2023-25/stats')
      .expect(400);

    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'INVALID_SEASON_ID',
    );
  });

  it('returns a structured 404 for an unknown player', async () => {
    const response = await request(app)
      .get('/api/players/999999/seasons/2023-24/stats')
      .expect(404);

    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'PLAYER_NOT_FOUND',
    );
  });

  it('returns a structured 400 for an invalid player id', async () => {
    const response = await request(app)
      .get('/api/players/0/seasons/2023-24/stats')
      .expect(400);

    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'INVALID_PLAYER_ID',
    );
  });

  it('does not leak provider-private fixture fields', async () => {
    const response = await request(app)
      .get('/api/players/2544/seasons/2023-24/stats')
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
    expect(Object.keys(response.body)).toEqual(['stats']);
  });

  it('returns a structured 405 for unsupported methods', async () => {
    const response = await request(app)
      .post('/api/players/2544/seasons/2023-24/stats')
      .expect(405);

    expect(response.headers.allow).toBe('GET');
    expect(ApiErrorResponseSchema.parse(response.body).error.code).toBe(
      'METHOD_NOT_ALLOWED',
    );
  });
});

describe('comparison fixture coverage', () => {
  it('returns three newest-first seasons for Stephen Curry', async () => {
    const response = await request(app).get('/api/players/201939/seasons').expect(200);
    const { seasons } = PlayerSeasonsResponseSchema.parse(response.body);

    // Two of Curry's seasons (2023-24 and 2017-18) overlap LeBron's, enabling a
    // multi-common-season comparison pair.
    expect(seasons.map((entry) => entry.season)).toEqual([
      '2023-24',
      '2022-23',
      '2017-18',
    ]);
    expect(seasons.map((entry) => entry.team.abbreviation)).toEqual([
      'GSW',
      'GSW',
      'GSW',
    ]);
  });

  it('maps Stephen Curry 2017-18 statistics correctly', async () => {
    const response = await request(app)
      .get('/api/players/201939/seasons/2017-18/stats')
      .expect(200);
    const { stats } = PlayerSeasonStatsResponseSchema.parse(response.body);

    expect(stats.season).toBe('2017-18');
    expect(stats.team.abbreviation).toBe('GSW');
    expect(stats.gamesPlayed).toBe(51);
    expect(stats.pointsPerGame).toBe(26.4);
  });

  it('returns a single Brooklyn season for Kevin Durant', async () => {
    const response = await request(app).get('/api/players/201142/seasons').expect(200);
    const { seasons } = PlayerSeasonsResponseSchema.parse(response.body);

    // Durant overlaps no other player's seasons, so any pairing with him exercises the
    // no-common-season state.
    expect(seasons).toEqual([{ season: '2021-22', team: { abbreviation: 'BKN' } }]);
  });

  it('reflects Kevin Durant playing for a team other than his profile team', async () => {
    const profile = await request(app).get('/api/players/201142').expect(200);
    const stats = await request(app)
      .get('/api/players/201142/seasons/2021-22/stats')
      .expect(200);

    expect(
      PlayerProfileResponseSchema.parse(profile.body).player.team.abbreviation,
    ).toBe('PHX');
    expect(
      PlayerSeasonStatsResponseSchema.parse(stats.body).stats.team.abbreviation,
    ).toBe('BKN');
  });
});

describe('players router ordering and regressions', () => {
  it('does not let the profile route intercept nested season routes', async () => {
    const seasons = await request(app).get('/api/players/2544/seasons').expect(200);
    const profile = await request(app).get('/api/players/2544').expect(200);

    expect(seasons.body).toHaveProperty('seasons');
    expect(seasons.body).not.toHaveProperty('player');
    expect(profile.body).toHaveProperty('player');
    expect(profile.body).not.toHaveProperty('seasons');
  });

  it('keeps the existing search, profile, and health endpoints working', async () => {
    await request(app).get('/api/health').expect(200);
    await request(app).get('/api/players').query({ search: 'curry' }).expect(200);
    await request(app).get('/api/players/2544').expect(200);
  });
});

describe('season contracts', () => {
  const validStats = {
    season: '2023-24',
    team: { abbreviation: 'LAL' },
    gamesPlayed: 70,
    minutesPerGame: 35.2,
    pointsPerGame: 27.4,
    reboundsPerGame: 7.1,
    assistsPerGame: 8.3,
    stealsPerGame: 1.2,
    blocksPerGame: 0.6,
    turnoversPerGame: 3.1,
    fieldGoalPercentage: 0.542,
    threePointPercentage: 0,
    freeThrowPercentage: 1,
  };

  it('validates consecutive seasons including century rollover', () => {
    for (const valid of ['2023-24', '1999-00', '2099-00']) {
      expect(SeasonIdSchema.safeParse(valid).success).toBe(true);
    }
    for (const invalid of ['2023-25', '23-24', '2023/24', '']) {
      expect(SeasonIdSchema.safeParse(invalid).success).toBe(false);
    }
  });

  it('rejects duplicate or mis-ordered season lists', () => {
    const team = { abbreviation: 'LAL' };
    const build = (ids: string[]) => ({
      seasons: ids.map((season) => ({ season, team })),
    });

    expect(
      PlayerSeasonsResponseSchema.safeParse(build(['2023-24', '2022-23'])).success,
    ).toBe(true);
    expect(
      PlayerSeasonsResponseSchema.safeParse(build(['2022-23', '2023-24'])).success,
    ).toBe(false);
    expect(
      PlayerSeasonsResponseSchema.safeParse(build(['2023-24', '2023-24'])).success,
    ).toBe(false);
  });

  it('rejects out-of-range, non-finite, and unknown stat fields', () => {
    expect(PlayerSeasonStatsSchema.safeParse(validStats).success).toBe(true);
    expect(
      PlayerSeasonStatsSchema.safeParse({ ...validStats, fieldGoalPercentage: 1.5 })
        .success,
    ).toBe(false);
    expect(
      PlayerSeasonStatsSchema.safeParse({ ...validStats, pointsPerGame: Infinity })
        .success,
    ).toBe(false);
    expect(
      PlayerSeasonStatsSchema.safeParse({ ...validStats, pointsPerGame: Number.NaN })
        .success,
    ).toBe(false);
    expect(
      PlayerSeasonStatsSchema.safeParse({ ...validStats, gamesPlayed: 70.5 }).success,
    ).toBe(false);
    expect(PlayerSeasonStatsSchema.safeParse({ ...validStats, foo: 1 }).success).toBe(
      false,
    );
  });
});
