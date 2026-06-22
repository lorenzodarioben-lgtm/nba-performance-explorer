import { describe, expect, it } from 'vitest';

import { ProviderError } from '../provider-error.js';
import {
  mapAvailableSeasons,
  mapCareerTrends,
  mapGameLog,
  mapPlayerProfile,
  mapSelectedSeasonStats,
  parseDirectory,
} from './nba-stats-mappers.js';

function resultSet(name: string, headers: string[], rowSet: unknown[][]) {
  return { name, headers, rowSet };
}

function envelope(...sets: ReturnType<typeof resultSet>[]): unknown {
  return { resource: 'data', parameters: {}, resultSets: sets };
}

function rowFor(
  headers: readonly string[],
  values: Readonly<Record<string, unknown>>,
): unknown[] {
  return headers.map((header) =>
    Object.prototype.hasOwnProperty.call(values, header) ? values[header] : null,
  );
}

function expectProviderInvalid(fn: () => unknown): void {
  expect(fn).toThrowError(ProviderError);
  let code: string | undefined;
  try {
    fn();
  } catch (error) {
    code = (error as ProviderError).code;
  }
  expect(code).toBe('PROVIDER_INVALID_RESPONSE');
}

const DIRECTORY_HEADERS = [
  'PERSON_ID',
  'DISPLAY_LAST_COMMA_FIRST',
  'DISPLAY_FIRST_LAST',
  'ROSTERSTATUS',
  'FROM_YEAR',
  'TO_YEAR',
  'PLAYERCODE',
  'PLAYER_SLUG',
  'TEAM_ID',
  'TEAM_CITY',
  'TEAM_NAME',
  'TEAM_ABBREVIATION',
  'TEAM_CODE',
  'TEAM_SLUG',
  'GAMES_PLAYED_FLAG',
  'OTHERLEAGUE_EXPERIENCE_CH',
];

describe('parseDirectory', () => {
  it('maps active and inactive players, omitting missing teams and nameless rows', () => {
    const players = parseDirectory(
      envelope(
        resultSet('CommonAllPlayers', DIRECTORY_HEADERS, [
          rowFor(DIRECTORY_HEADERS, {
            PERSON_ID: 2544,
            DISPLAY_LAST_COMMA_FIRST: 'James, LeBron',
            DISPLAY_FIRST_LAST: 'LeBron James',
            ROSTERSTATUS: 1,
            TEAM_ID: 1610612747,
            TEAM_ABBREVIATION: 'LAL',
          }),
          rowFor(DIRECTORY_HEADERS, {
            PERSON_ID: 977,
            DISPLAY_LAST_COMMA_FIRST: 'Bryant, Kobe',
            DISPLAY_FIRST_LAST: 'Kobe Bryant',
            ROSTERSTATUS: 0,
            TEAM_ID: 0,
            TEAM_ABBREVIATION: '',
          }),
          rowFor(DIRECTORY_HEADERS, {
            PERSON_ID: 1,
            DISPLAY_LAST_COMMA_FIRST: 'Unknown, Unknown',
            DISPLAY_FIRST_LAST: '   ',
            ROSTERSTATUS: 0,
            TEAM_ID: 0,
            TEAM_ABBREVIATION: '',
          }),
        ]),
      ),
    );

    expect(players).toEqual([
      {
        personId: '2544',
        fullName: 'LeBron James',
        firstName: 'LeBron',
        surname: 'James',
        isActive: true,
        team: { abbreviation: 'LAL' },
      },
      {
        personId: '977',
        fullName: 'Kobe Bryant',
        firstName: 'Kobe',
        surname: 'Bryant',
        isActive: false,
      },
    ]);
  });

  it('requires every committed commonallplayers column', () => {
    const headers = DIRECTORY_HEADERS.filter((header) => header !== 'PLAYERCODE');
    expectProviderInvalid(() =>
      parseDirectory(
        envelope(resultSet('CommonAllPlayers', headers, [rowFor(headers, {})])),
      ),
    );
  });
});

const PROFILE_HEADERS = [
  'PERSON_ID',
  'FIRST_NAME',
  'LAST_NAME',
  'DISPLAY_FIRST_LAST',
  'BIRTHDATE',
  'SCHOOL',
  'COUNTRY',
  'HEIGHT',
  'WEIGHT',
  'SEASON_EXP',
  'JERSEY',
  'POSITION',
  'ROSTERSTATUS',
  'TEAM_ID',
  'TEAM_NAME',
  'TEAM_ABBREVIATION',
  'TEAM_CODE',
  'TEAM_CITY',
  'FROM_YEAR',
  'TO_YEAR',
  'NBA_FLAG',
  'GAMES_PLAYED_FLAG',
  'DRAFT_YEAR',
  'DRAFT_ROUND',
  'DRAFT_NUMBER',
];

function profileEnvelope(values: Readonly<Record<string, unknown>>): unknown {
  return envelope(
    resultSet('CommonPlayerInfo', PROFILE_HEADERS, [rowFor(PROFILE_HEADERS, values)]),
    resultSet('AvailableSeasons', ['SEASON_ID'], []),
  );
}

describe('mapPlayerProfile', () => {
  it('maps a complete active player including parsed height and draft', () => {
    const profile = mapPlayerProfile(
      profileEnvelope({
        PERSON_ID: 2544,
        DISPLAY_FIRST_LAST: 'LeBron James',
        TEAM_ID: 1610612747,
        TEAM_ABBREVIATION: 'LAL',
        TEAM_CITY: 'Los Angeles',
        TEAM_NAME: 'Lakers',
        POSITION: 'Forward',
        JERSEY: '6',
        HEIGHT: '6-9',
        WEIGHT: '250',
        COUNTRY: 'USA',
        DRAFT_YEAR: '2003',
        DRAFT_ROUND: '1',
        DRAFT_NUMBER: '1',
      }),
    );

    expect(profile).toEqual({
      id: '2544',
      fullName: 'LeBron James',
      team: { abbreviation: 'LAL', name: 'Lakers', city: 'Los Angeles' },
      position: 'Forward',
      jerseyNumber: '6',
      heightInches: 81,
      weightPounds: 250,
      country: 'USA',
      draft: { year: 2003, round: 1, pick: 1 },
    });
  });

  it('omits team and draft for an undrafted free agent and skips empty fields', () => {
    const profile = mapPlayerProfile(
      profileEnvelope({
        PERSON_ID: 1630163,
        DISPLAY_FIRST_LAST: 'Free Agent',
        TEAM_ID: 0,
        TEAM_ABBREVIATION: '',
        TEAM_CITY: '',
        TEAM_NAME: '',
        POSITION: '',
        JERSEY: '',
        HEIGHT: '',
        WEIGHT: '',
        COUNTRY: '',
        DRAFT_YEAR: 'Undrafted',
        DRAFT_ROUND: 'Undrafted',
        DRAFT_NUMBER: 'Undrafted',
      }),
    );

    expect(profile).toEqual({ id: '1630163', fullName: 'Free Agent' });
  });

  it('normalizes a valid NBA hybrid position into the existing public contract', () => {
    const profile = mapPlayerProfile(
      profileEnvelope({
        PERSON_ID: 1641705,
        DISPLAY_FIRST_LAST: 'Victor Wembanyama',
        TEAM_ID: 1610612759,
        TEAM_ABBREVIATION: 'SAS',
        TEAM_CITY: 'San Antonio',
        TEAM_NAME: 'Spurs',
        POSITION: 'Forward-Center',
        JERSEY: '1',
        HEIGHT: '7-4',
        WEIGHT: '210',
        COUNTRY: 'France',
        DRAFT_YEAR: '2023',
        DRAFT_ROUND: '1',
        DRAFT_NUMBER: '1',
      }),
    );

    expect(profile?.position).toBe('F-C');
  });

  it('returns null for an unknown player with no rows', () => {
    expect(
      mapPlayerProfile(
        envelope(
          resultSet('CommonPlayerInfo', PROFILE_HEADERS, []),
          resultSet('AvailableSeasons', ['SEASON_ID'], []),
        ),
      ),
    ).toBeNull();
  });

  it('requires AvailableSeasons and every committed commonplayerinfo column', () => {
    expectProviderInvalid(() =>
      mapPlayerProfile(envelope(resultSet('CommonPlayerInfo', PROFILE_HEADERS, []))),
    );

    const headers = PROFILE_HEADERS.filter((header) => header !== 'BIRTHDATE');
    expectProviderInvalid(() =>
      mapPlayerProfile(
        envelope(
          resultSet('CommonPlayerInfo', headers, []),
          resultSet('AvailableSeasons', ['SEASON_ID'], []),
        ),
      ),
    );
  });
});

const CAREER_HEADERS = [
  'PLAYER_ID',
  'SEASON_ID',
  'LEAGUE_ID',
  'TEAM_ID',
  'TEAM_ABBREVIATION',
  'PLAYER_AGE',
  'GP',
  'GS',
  'MIN',
  'FGM',
  'FGA',
  'FG_PCT',
  'FG3M',
  'FG3A',
  'FG3_PCT',
  'FTM',
  'FTA',
  'FT_PCT',
  'OREB',
  'DREB',
  'REB',
  'AST',
  'STL',
  'BLK',
  'TOV',
  'PF',
  'PTS',
];

function careerRow(
  season: string,
  teamId: number,
  abbreviation: string,
  overrides: Partial<Record<string, number>> = {},
): unknown[] {
  const base: Record<string, number> = {
    GP: 70,
    MIN: 35,
    FG_PCT: 0.5,
    FG3_PCT: 0.4,
    FT_PCT: 0.8,
    REB: 7,
    AST: 8,
    STL: 1,
    BLK: 0.5,
    TOV: 3,
    PTS: 27,
    ...overrides,
  };
  return rowFor(CAREER_HEADERS, {
    PLAYER_ID: 2544,
    SEASON_ID: season,
    LEAGUE_ID: '00',
    TEAM_ID: teamId,
    TEAM_ABBREVIATION: abbreviation,
    GP: base.GP,
    MIN: base.MIN,
    FG_PCT: base.FG_PCT,
    FG3_PCT: base.FG3_PCT,
    FT_PCT: base.FT_PCT,
    REB: base.REB,
    AST: base.AST,
    STL: base.STL,
    BLK: base.BLK,
    TOV: base.TOV,
    PTS: base.PTS,
  });
}

// 2017-18 single team (CLE), 2022-23 traded (CLE + LAL + TOT), 2023-24 single team (LAL).
function careerEnvelope(): unknown {
  return envelope(
    resultSet('SeasonTotalsRegularSeason', CAREER_HEADERS, [
      careerRow('2017-18', 1610612739, 'CLE', { PTS: 27.5, GP: 82 }),
      careerRow('2022-23', 1610612739, 'CLE', { PTS: 20 }),
      careerRow('2022-23', 1610612747, 'LAL', { PTS: 30 }),
      careerRow('2022-23', 0, 'TOT', { PTS: 25, GP: 55 }),
      careerRow('2023-24', 1610612747, 'LAL', { PTS: 25.7, GP: 71 }),
    ]),
  );
}

describe('mapAvailableSeasons', () => {
  it('lists unique seasons newest-first, omitting the team for a traded season', () => {
    expect(mapAvailableSeasons(careerEnvelope())).toEqual([
      { season: '2023-24', team: { abbreviation: 'LAL' } },
      { season: '2022-23' },
      { season: '2017-18', team: { abbreviation: 'CLE' } },
    ]);
  });

  it('rejects multi-team data without a unique aggregate before returning seasons', () => {
    const body = envelope(
      resultSet('SeasonTotalsRegularSeason', CAREER_HEADERS, [
        careerRow('2020-21', 1610612739, 'CLE'),
        careerRow('2020-21', 1610612747, 'LAL'),
      ]),
    );
    expectProviderInvalid(() => mapAvailableSeasons(body));
  });

  it('requires every committed playercareerstats column', () => {
    const headers = CAREER_HEADERS.filter((header) => header !== 'FGA');
    expectProviderInvalid(() =>
      mapAvailableSeasons(
        envelope(resultSet('SeasonTotalsRegularSeason', headers, [])),
      ),
    );
  });
});

describe('mapSelectedSeasonStats', () => {
  it('maps a single-team season with its team and percentage ratios', () => {
    const stats = mapSelectedSeasonStats(careerEnvelope(), '2017-18');
    expect(stats).toMatchObject({
      season: '2017-18',
      team: { abbreviation: 'CLE' },
      gamesPlayed: 82,
      pointsPerGame: 27.5,
      fieldGoalPercentage: 0.5,
    });
  });

  it('selects the TOT aggregate for a traded season and omits the team', () => {
    const stats = mapSelectedSeasonStats(careerEnvelope(), '2022-23');
    expect(stats?.team).toBeUndefined();
    expect(stats).toMatchObject({
      season: '2022-23',
      gamesPlayed: 55,
      pointsPerGame: 25,
    });
  });

  it('returns null for a season the player did not play', () => {
    expect(mapSelectedSeasonStats(careerEnvelope(), '2019-20')).toBeNull();
  });

  it('rejects a multi-team season with no unique aggregate row', () => {
    const body = envelope(
      resultSet('SeasonTotalsRegularSeason', CAREER_HEADERS, [
        careerRow('2020-21', 1610612739, 'CLE'),
        careerRow('2020-21', 1610612747, 'LAL'),
      ]),
    );
    expectProviderInvalid(() => mapSelectedSeasonStats(body, '2020-21'));
  });

  it('maps a null percentage to zero', () => {
    const body = envelope(
      resultSet('SeasonTotalsRegularSeason', CAREER_HEADERS, [
        rowFor(CAREER_HEADERS, {
          PLAYER_ID: 2544,
          SEASON_ID: '2003-04',
          LEAGUE_ID: '00',
          TEAM_ID: 1610612739,
          TEAM_ABBREVIATION: 'CLE',
          GP: 79,
          MIN: 39.5,
          FG_PCT: 0.417,
          FG3_PCT: null,
          FT_PCT: 0.754,
          REB: 5.5,
          AST: 5.9,
          STL: 1.6,
          BLK: 0.7,
          TOV: 3.5,
          PTS: 20.9,
        }),
      ]),
    );
    expect(mapSelectedSeasonStats(body, '2003-04')?.threePointPercentage).toBe(0);
  });
});

describe('mapCareerTrends', () => {
  it('returns every season strictly oldest-first', () => {
    expect(mapCareerTrends(careerEnvelope()).map((entry) => entry.season)).toEqual([
      '2017-18',
      '2022-23',
      '2023-24',
    ]);
  });
});

const GAME_LOG_HEADERS = [
  'SEASON_ID',
  'Player_ID',
  'Game_ID',
  'GAME_DATE',
  'MATCHUP',
  'WL',
  'MIN',
  'REB',
  'AST',
  'PTS',
];

function gameLogEnvelope(rows: unknown[][]): unknown {
  return envelope(resultSet('PlayerGameLog', GAME_LOG_HEADERS, rows));
}

describe('mapGameLog', () => {
  it('maps home/away, win/loss, and stats sorted newest-first', () => {
    const games = mapGameLog(
      gameLogEnvelope([
        [
          '2023-24',
          2544,
          '0022300001',
          'OCT 24, 2023',
          'LAL vs. DEN',
          'L',
          29,
          8,
          6,
          21,
        ],
        ['2023-24', 2544, '0022300050', 'NOV 10, 2023', 'LAL @ HOU', 'W', 35, 7, 8, 30],
      ]),
    );

    expect(games).toEqual([
      {
        id: '0022300050',
        date: '2023-11-10',
        team: { abbreviation: 'LAL' },
        opponent: { abbreviation: 'HOU' },
        location: 'away',
        result: 'W',
        minutes: 35,
        points: 30,
        rebounds: 7,
        assists: 8,
      },
      {
        id: '0022300001',
        date: '2023-10-24',
        team: { abbreviation: 'LAL' },
        opponent: { abbreviation: 'DEN' },
        location: 'home',
        result: 'L',
        minutes: 29,
        points: 21,
        rebounds: 8,
        assists: 6,
      },
    ]);
  });

  it('returns an empty array for a season with no games', () => {
    expect(mapGameLog(gameLogEnvelope([]))).toEqual([]);
  });

  it('rejects a malformed matchup', () => {
    expectProviderInvalid(() =>
      mapGameLog(
        gameLogEnvelope([
          [
            '2023-24',
            2544,
            '0022300001',
            'OCT 24, 2023',
            'LAL ~ DEN',
            'W',
            10,
            1,
            1,
            2,
          ],
        ]),
      ),
    );
  });

  it('rejects duplicate game ids', () => {
    expectProviderInvalid(() =>
      mapGameLog(
        gameLogEnvelope([
          [
            '2023-24',
            2544,
            '0022300001',
            'OCT 24, 2023',
            'LAL vs. DEN',
            'W',
            10,
            1,
            1,
            2,
          ],
          [
            '2023-24',
            2544,
            '0022300001',
            'OCT 26, 2023',
            'LAL @ DEN',
            'L',
            12,
            2,
            2,
            4,
          ],
        ]),
      ),
    );
  });

  it('rejects an invalid win/loss value', () => {
    expectProviderInvalid(() =>
      mapGameLog(
        gameLogEnvelope([
          [
            '2023-24',
            2544,
            '0022300001',
            'OCT 24, 2023',
            'LAL vs. DEN',
            'T',
            10,
            1,
            1,
            2,
          ],
        ]),
      ),
    );
  });

  it('requires every committed playergamelog column', () => {
    const headers = GAME_LOG_HEADERS.filter((header) => header !== 'SEASON_ID');
    expectProviderInvalid(() =>
      mapGameLog(envelope(resultSet('PlayerGameLog', headers, []))),
    );
  });
});
