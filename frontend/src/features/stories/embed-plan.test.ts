import { describe, expect, it } from 'vitest';

import { embedPlan } from './embed-plan';

describe('story embed plans', () => {
  it('maps each supported tool link to the same API request the tool makes', () => {
    expect(embedPlan('/games/series/r4-BOS-DAL')).toEqual({
      kind: 'series',
      tool: 'Series film room',
      api: '/api/games/series/r4-BOS-DAL',
    });
    expect(embedPlan('/compare/recorded?players=203999,203507').api).toBe(
      '/api/recorded/player-comparison?players=203999,203507',
    );
    expect(
      embedPlan('/discover/similar?player=203999&metrics=pointsPerGame,reboundsPerGame')
        .api,
    ).toBe(
      '/api/recorded/similarity?player=203999&metrics=pointsPerGame%2CreboundsPerGame&minGames=20&limit=10',
    );
    // The workbench's front-end pick never reaches the API.
    expect(embedPlan('/lab/workbench?metric=assistsPerGame&pick=203999').api).toBe(
      '/api/recorded/workbench?metric=assistsPerGame',
    );
    // The shot view is presentation only; the region filter is kept.
    expect(embedPlan('/lab/shots?players=201939&view=zones&region=-8,-6,8,8').api).toBe(
      '/api/shots?players=201939&region=-8%2C-6%2C8%2C8',
    );
    expect(embedPlan('/teams/nba:1610612738/season').api).toBe(
      '/api/recorded/team-season?team=nba%3A1610612738',
    );
  });

  it('falls back to a plain link for other pages and for malformed tool links', () => {
    for (const path of [
      '/games/bracket',
      '/players/203999',
      '/compare/recorded?players=203999',
      '/discover/similar?player=203999&metrics=pointsPerGame',
      '/lab/shots?region=99,0,1,1',
      '/lab/workbench?metric=notAMetric',
    ])
      expect(embedPlan(path), path).toEqual({
        kind: 'link',
        tool: 'Linked research',
        api: null,
      });
  });
});
