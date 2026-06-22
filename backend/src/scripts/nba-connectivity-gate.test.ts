import { describe, expect, it } from 'vitest';

import type { NbaStatsHttpClient } from '../features/players/nba-stats/nba-stats-http-client.js';
import { parseDirectory } from '../features/players/nba-stats/nba-stats-mappers.js';
import {
  buildGateChecks,
  gateExitCode,
  runConnectivityGate,
  type GateResult,
} from './nba-connectivity-gate.js';

const SEASON = '2023-24';

// Minimal, sanitized payload builders mirroring NBA.com's tabular envelope.
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

// Valid bodies that the real production mappers accept.
const validDirectory = envelope(
  resultSet('CommonAllPlayers', DIRECTORY_HEADERS, [
    rowFor(DIRECTORY_HEADERS, {
      PERSON_ID: 2544,
      DISPLAY_LAST_COMMA_FIRST: 'James, LeBron',
      DISPLAY_FIRST_LAST: 'LeBron James',
      ROSTERSTATUS: 1,
      TEAM_ID: 1610612747,
      TEAM_ABBREVIATION: 'LAL',
    }),
  ]),
);
const validProfile = envelope(
  resultSet('CommonPlayerInfo', PROFILE_HEADERS, [
    rowFor(PROFILE_HEADERS, {
      PERSON_ID: 2544,
      DISPLAY_FIRST_LAST: 'LeBron James',
      TEAM_ID: 1610612747,
      TEAM_ABBREVIATION: 'LAL',
      TEAM_CITY: 'Los Angeles',
      TEAM_NAME: 'Lakers',
      POSITION: 'Forward',
    }),
  ]),
  resultSet('AvailableSeasons', ['SEASON_ID'], []),
);
const validCareer = envelope(
  resultSet('SeasonTotalsRegularSeason', CAREER_HEADERS, [
    rowFor(CAREER_HEADERS, {
      PLAYER_ID: 2544,
      SEASON_ID: '2022-23',
      LEAGUE_ID: '00',
      TEAM_ID: 1610612747,
      TEAM_ABBREVIATION: 'LAL',
      GP: 55,
      MIN: 35,
      FG_PCT: 0.5,
      FG3_PCT: 0.32,
      FT_PCT: 0.77,
      REB: 8,
      AST: 7,
      STL: 1,
      BLK: 0.6,
      TOV: 3,
      PTS: 28.9,
    }),
  ]),
);
const validGameLog = envelope(
  resultSet('PlayerGameLog', GAME_LOG_HEADERS, [
    ['2023-24', 2544, '0022300001', 'OCT 24, 2023', 'LAL vs. DEN', 'L', 29, 8, 6, 21],
  ]),
);

const allValidBodies: Record<string, unknown> = {
  commonallplayers: validDirectory,
  commonplayerinfo: validProfile,
  playercareerstats: validCareer,
  playergamelog: validGameLog,
};

function clientReturning(bodies: Record<string, unknown>): NbaStatsHttpClient {
  return {
    fetchEndpoint: async (endpoint) => {
      if (!(endpoint in bodies)) {
        throw new Error(`no fake body for ${endpoint}`);
      }
      return bodies[endpoint];
    },
  };
}

// Run only the named endpoint check against a single body.
async function runSingle(name: string, body: unknown): Promise<GateResult> {
  const checks = buildGateChecks(SEASON).filter((check) => check.name === name);
  const client = clientReturning({ [name]: body });
  const [result] = await runConnectivityGate(client, checks);
  if (!result) {
    throw new Error(`expected a gate result for ${name}`);
  }
  return result;
}

describe('buildGateChecks', () => {
  it('probes exactly the four approved endpoints with the season applied', () => {
    const checks = buildGateChecks(SEASON);

    expect(checks.map((check) => check.endpoint)).toEqual([
      'commonallplayers',
      'commonplayerinfo',
      'playercareerstats',
      'playergamelog',
    ]);
    expect(checks[0]?.params.Season).toBe(SEASON);
    expect(checks[3]?.params.SeasonType).toBe('Regular Season');
  });

  it('attaches a production parser/mapper to every check', () => {
    for (const check of buildGateChecks(SEASON)) {
      expect(typeof check.validate).toBe('function');
    }
  });
});

describe('runConnectivityGate exercises the production parser', () => {
  it('passes only when the real mapper accepts the body for all four endpoints', async () => {
    const results = await runConnectivityGate(
      clientReturning(allValidBodies),
      buildGateChecks(SEASON),
    );

    expect(results).toHaveLength(4);
    expect(results.every((result) => result.ok)).toBe(true);
  });

  it('fails every endpoint for HTTP 2xx JSON that the parser rejects (empty resultSets)', async () => {
    // The previous gate accepted `{ resultSets: [] }`; the strengthened gate must reject it for
    // all four endpoints because each required result set is absent.
    const bodies: Record<string, unknown> = {
      commonallplayers: { resultSets: [] },
      commonplayerinfo: { resultSets: [] },
      playercareerstats: { resultSets: [] },
      playergamelog: { resultSets: [] },
    };

    const results = await runConnectivityGate(
      clientReturning(bodies),
      buildGateChecks(SEASON),
    );

    expect(results.every((result) => !result.ok)).toBe(true);
  });

  it('fails on a malformed envelope (HTTP 2xx + JSON, no resultSets)', async () => {
    expect((await runSingle('commonallplayers', {})).ok).toBe(false);
  });

  it('fails on a missing target result set', async () => {
    const body = envelope(resultSet('SomethingElse', ['A'], []));
    expect((await runSingle('commonallplayers', body)).ok).toBe(false);
  });

  it('fails on missing required columns', async () => {
    const headers = DIRECTORY_HEADERS.filter((header) => header !== 'PLAYER_SLUG');
    const body = envelope(resultSet('CommonAllPlayers', headers, []));
    expect((await runSingle('commonallplayers', body)).ok).toBe(false);
  });

  it('fails on a row-width mismatch', async () => {
    const body = envelope(resultSet('CommonAllPlayers', DIRECTORY_HEADERS, [[2544]]));
    expect((await runSingle('commonallplayers', body)).ok).toBe(false);
  });

  it('fails on an invalid cell value/format', async () => {
    const body = envelope(
      resultSet('CommonAllPlayers', DIRECTORY_HEADERS, [
        rowFor(DIRECTORY_HEADERS, {
          PERSON_ID: 2544,
          DISPLAY_LAST_COMMA_FIRST: 'James, LeBron',
          DISPLAY_FIRST_LAST: 'LeBron James',
          ROSTERSTATUS: 9, // neither 0 nor 1
        }),
      ]),
    );
    expect((await runSingle('commonallplayers', body)).ok).toBe(false);
  });
});

describe('gate failure output is sanitized', () => {
  it('reports the stable code and structural diagnostic without raw payload values', async () => {
    const SECRET = 'SSN-SENTINEL-DEADBEEF-9000';
    const body = envelope(
      resultSet('CommonAllPlayers', DIRECTORY_HEADERS, [
        rowFor(DIRECTORY_HEADERS, {
          PERSON_ID: 2544,
          DISPLAY_LAST_COMMA_FIRST: 'James, LeBron',
          DISPLAY_FIRST_LAST: SECRET,
          ROSTERSTATUS: 9,
          TEAM_ABBREVIATION: SECRET,
        }),
      ]),
    );

    const result = await runSingle('commonallplayers', body);

    expect(result.ok).toBe(false);
    expect(result.detail).toContain('PROVIDER_INVALID_RESPONSE');
    expect(result.detail).toContain('invalid-roster-status');
    expect(result.detail).not.toContain(SECRET);
  });
});

describe('gateExitCode', () => {
  it('is 0 only when every check passed', () => {
    expect(gateExitCode([{ name: 'a', ok: true, detail: '' }])).toBe(0);
  });

  it('is 1 when any check failed', () => {
    expect(
      gateExitCode([
        { name: 'a', ok: true, detail: '' },
        { name: 'b', ok: false, detail: 'PROVIDER_INVALID_RESPONSE' },
      ]),
    ).toBe(1);
  });
});

describe('gate and application agree', () => {
  it('cannot pass a commonallplayers body that the application parser rejects', async () => {
    const rejected = envelope(
      resultSet('CommonAllPlayers', DIRECTORY_HEADERS, [
        rowFor(DIRECTORY_HEADERS, {
          PERSON_ID: 2544,
          DISPLAY_LAST_COMMA_FIRST: 'James, LeBron',
          DISPLAY_FIRST_LAST: 'LeBron James',
          ROSTERSTATUS: 5, // invalid
        }),
      ]),
    );

    // The application parser rejects it...
    expect(() => parseDirectory(rejected)).toThrowError();
    // ...and so must the gate.
    expect((await runSingle('commonallplayers', rejected)).ok).toBe(false);
  });
});
