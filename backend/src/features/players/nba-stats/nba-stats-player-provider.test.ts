import { PlayerSummarySchema } from '@nba-performance-explorer/contracts';
import { describe, expect, it, vi } from 'vitest';

import { ProviderError } from '../provider-error.js';
import { createNbaStatsCache } from './nba-stats-cache.js';
import type {
  DiagnosticReporter,
  ResponseDiagnostic,
} from './nba-stats-diagnostics.js';
import type { NbaStatsHttpClient } from './nba-stats-http-client.js';
import {
  currentNbaSeason,
  NbaStatsPlayerProvider,
} from './nba-stats-player-provider.js';

function resultSet(name: string, headers: string[], rowSet: unknown[][]) {
  return { name, headers, rowSet };
}
function envelope(...sets: ReturnType<typeof resultSet>[]): unknown {
  return { resultSets: sets };
}

function rowFor(
  headers: readonly string[],
  values: Readonly<Record<string, unknown>>,
): unknown[] {
  return headers.map((header) =>
    Object.prototype.hasOwnProperty.call(values, header) ? values[header] : null,
  );
}

type Responder = (params: Record<string, string>) => unknown;

function createFakeClient(handlers: Partial<Record<string, Responder>>) {
  const calls: { endpoint: string; params: Record<string, string> }[] = [];
  const client: NbaStatsHttpClient = {
    fetchEndpoint: async (endpoint, params) => {
      calls.push({ endpoint, params: { ...params } });
      const handler = handlers[endpoint];
      if (!handler) {
        throw new Error(`no fake handler for ${endpoint}`);
      }
      return handler({ ...params });
    },
  };
  return { client, calls };
}

const FIXED_NOW = new Date('2024-03-15T00:00:00Z'); // NBA season 2023-24

function makeProvider(client: NbaStatsHttpClient, reporter?: DiagnosticReporter) {
  const cache = createNbaStatsCache({ now: () => FIXED_NOW.getTime() });
  return new NbaStatsPlayerProvider({
    httpClient: client,
    cache,
    now: () => FIXED_NOW,
    ...(reporter ? { reporter } : {}),
  });
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
const directoryBody = envelope(
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
      PERSON_ID: 201939,
      DISPLAY_LAST_COMMA_FIRST: 'Curry, Stephen',
      DISPLAY_FIRST_LAST: 'Stephen Curry',
      ROSTERSTATUS: 1,
      TEAM_ID: 1610612744,
      TEAM_ABBREVIATION: 'GSW',
    }),
  ]),
);

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
const lebronProfileBody = envelope(
  resultSet('CommonPlayerInfo', PROFILE_HEADERS, [
    rowFor(PROFILE_HEADERS, {
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
  ]),
  resultSet('AvailableSeasons', ['SEASON_ID'], []),
);
const unknownProfileBody = envelope(
  resultSet('CommonPlayerInfo', PROFILE_HEADERS, []),
  resultSet('AvailableSeasons', ['SEASON_ID'], []),
);

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
const careerBody = envelope(
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
    rowFor(CAREER_HEADERS, {
      PLAYER_ID: 2544,
      SEASON_ID: '2023-24',
      LEAGUE_ID: '00',
      TEAM_ID: 1610612747,
      TEAM_ABBREVIATION: 'LAL',
      GP: 71,
      MIN: 35.3,
      FG_PCT: 0.54,
      FG3_PCT: 0.41,
      FT_PCT: 0.75,
      REB: 7.3,
      AST: 8.3,
      STL: 1.3,
      BLK: 0.5,
      TOV: 3.5,
      PTS: 25.7,
    }),
  ]),
);
const invalidCareerBody = envelope(
  resultSet('SeasonTotalsRegularSeason', CAREER_HEADERS, [
    rowFor(CAREER_HEADERS, {
      PLAYER_ID: 2544,
      SEASON_ID: '2023-24',
      LEAGUE_ID: '00',
      TEAM_ID: 1610612747,
      TEAM_ABBREVIATION: 'LAL',
      GP: 71,
      MIN: 35.3,
      FG_PCT: 1.5,
      FG3_PCT: 0.41,
      FT_PCT: 0.75,
      REB: 7.3,
      AST: 8.3,
      STL: 1.3,
      BLK: 0.5,
      TOV: 3.5,
      PTS: 25.7,
    }),
  ]),
);

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
const gameLogBody = envelope(
  resultSet('PlayerGameLog', GAME_LOG_HEADERS, [
    ['2023-24', 2544, '0022300001', 'OCT 24, 2023', 'LAL vs. DEN', 'L', 29, 8, 6, 21],
  ]),
);
const emptyGameLogBody = envelope(resultSet('PlayerGameLog', GAME_LOG_HEADERS, []));

describe('currentNbaSeason', () => {
  it('resolves the season at the September/October boundary', () => {
    expect(currentNbaSeason(new Date('2023-10-01T00:00:00Z'))).toBe('2023-24');
    expect(currentNbaSeason(new Date('2023-09-30T23:59:59Z'))).toBe('2022-23');
    expect(currentNbaSeason(new Date('2024-01-15T00:00:00Z'))).toBe('2023-24');
  });
});

describe('NbaStatsPlayerProvider', () => {
  it('searches the directory once across multiple searches', async () => {
    const { client, calls } = createFakeClient({
      commonallplayers: () => directoryBody,
    });
    const provider = makeProvider(client);

    expect((await provider.searchPlayers('lebron', 8)).map((p) => p.id)).toEqual([
      '2544',
    ]);
    await provider.searchPlayers('curry', 8);

    const directoryCalls = calls.filter((c) => c.endpoint === 'commonallplayers');
    expect(directoryCalls).toHaveLength(1);
    expect(directoryCalls[0]?.params.Season).toBe('2023-24');
    expect(directoryCalls[0]?.params.IsOnlyCurrentSeason).toBe('0');
  });

  it('maps a known profile and returns null for an unknown player', async () => {
    const { client } = createFakeClient({
      commonplayerinfo: (params) =>
        params.PlayerID === '2544' ? lebronProfileBody : unknownProfileBody,
    });
    const provider = makeProvider(client);

    expect((await provider.getPlayerById('2544'))?.fullName).toBe('LeBron James');
    expect(await provider.getPlayerById('999999')).toBeNull();
  });

  it('reuses one career response for seasons, selected stats, and trends', async () => {
    const { client, calls } = createFakeClient({ playercareerstats: () => careerBody });
    const provider = makeProvider(client);

    expect((await provider.listPlayerSeasons('2544')).map((s) => s.season)).toEqual([
      '2023-24',
      '2022-23',
    ]);
    expect(
      (await provider.getPlayerSeasonStats('2544', '2023-24'))?.pointsPerGame,
    ).toBe(25.7);
    expect((await provider.listPlayerSeasonStats('2544')).map((s) => s.season)).toEqual(
      ['2022-23', '2023-24'],
    );
    expect(await provider.getPlayerSeasonStats('2544', '2010-11')).toBeNull();

    expect(calls.filter((c) => c.endpoint === 'playercareerstats')).toHaveLength(1);
  });

  it('does not cache a career response that fails domain validation', async () => {
    let attempts = 0;
    const { client, calls } = createFakeClient({
      playercareerstats: () => {
        attempts += 1;
        return attempts === 1 ? invalidCareerBody : careerBody;
      },
    });
    const provider = makeProvider(client);

    await expect(provider.listPlayerSeasons('2544')).rejects.toMatchObject({
      code: 'PROVIDER_INVALID_RESPONSE',
    });
    await expect(provider.listPlayerSeasons('2544')).resolves.toHaveLength(2);
    expect(calls.filter((c) => c.endpoint === 'playercareerstats')).toHaveLength(2);
  });

  it('maps a game log and returns an empty array for a season with no games', async () => {
    const { client } = createFakeClient({
      playergamelog: (params) =>
        params.Season === '2023-24' ? gameLogBody : emptyGameLogBody,
    });
    const provider = makeProvider(client);

    const games = await provider.listPlayerGames('2544', '2023-24');
    expect(games).toHaveLength(1);
    expect(games[0]?.opponent.abbreviation).toBe('DEN');
    expect(await provider.listPlayerGames('2544', '2017-18')).toEqual([]);
  });
});

describe('NbaStatsPlayerProvider diagnostics emission', () => {
  const invalidDirectoryBody = envelope(
    resultSet('CommonAllPlayers', DIRECTORY_HEADERS, [
      rowFor(DIRECTORY_HEADERS, {
        PERSON_ID: 2544,
        DISPLAY_LAST_COMMA_FIRST: 'James, LeBron',
        DISPLAY_FIRST_LAST: 'LeBron James',
        ROSTERSTATUS: 9, // neither 0 nor 1
      }),
    ]),
  );

  function recordingReporter() {
    const reports: ResponseDiagnostic[] = [];
    const reporter: DiagnosticReporter = {
      report: (diagnostic) => {
        reports.push(diagnostic);
      },
    };
    return { reporter, reports };
  }

  it('reports a sanitized diagnostic enriched with the endpoint on an invalid response', async () => {
    const { reporter, reports } = recordingReporter();
    const { client } = createFakeClient({
      commonallplayers: () => invalidDirectoryBody,
    });
    const provider = makeProvider(client, reporter);

    await expect(provider.searchPlayers('lebron', 8)).rejects.toMatchObject({
      code: 'PROVIDER_INVALID_RESPONSE',
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      endpoint: 'commonallplayers',
      stage: 'value-format',
      category: 'invalid-roster-status',
    });
  });

  it('does not report anything on a successful parse', async () => {
    const { reporter, reports } = recordingReporter();
    const { client } = createFakeClient({ commonallplayers: () => directoryBody });
    const provider = makeProvider(client, reporter);

    expect(await provider.searchPlayers('lebron', 8)).toHaveLength(1);
    expect(reports).toHaveLength(0);
  });

  it('emits nothing through console when no reporter is configured', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { client } = createFakeClient({
      commonallplayers: () => invalidDirectoryBody,
    });
    const provider = makeProvider(client); // default no-op reporter

    await expect(provider.searchPlayers('lebron', 8)).rejects.toMatchObject({
      code: 'PROVIDER_INVALID_RESPONSE',
    });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not change whether parsing succeeds or fails when diagnostics are enabled', async () => {
    const { reporter } = recordingReporter();

    const searchWith = (body: unknown, withReporter: boolean) => {
      const { client } = createFakeClient({ commonallplayers: () => body });
      const provider = withReporter
        ? makeProvider(client, reporter)
        : makeProvider(client);
      return provider.searchPlayers('lebron', 8);
    };

    await expect(searchWith(invalidDirectoryBody, true)).rejects.toMatchObject({
      code: 'PROVIDER_INVALID_RESPONSE',
    });
    await expect(searchWith(invalidDirectoryBody, false)).rejects.toMatchObject({
      code: 'PROVIDER_INVALID_RESPONSE',
    });
    expect(await searchWith(directoryBody, true)).toHaveLength(1);
    expect(await searchWith(directoryBody, false)).toHaveLength(1);
  });

  it('never lets a throwing reporter mask the original parser failure', async () => {
    const throwingReporter: DiagnosticReporter = {
      report: () => {
        throw new Error('reporter blew up');
      },
    };
    const { client } = createFakeClient({
      commonallplayers: () => invalidDirectoryBody,
    });
    const provider = makeProvider(client, throwingReporter);

    // The original ProviderError propagates unchanged; the reporter error never surfaces.
    await expect(provider.searchPlayers('lebron', 8)).rejects.toMatchObject({
      code: 'PROVIDER_INVALID_RESPONSE',
    });
  });

  it('a throwing reporter cannot turn a successful parse into a failure', async () => {
    const throwingReporter: DiagnosticReporter = {
      report: () => {
        throw new Error('reporter blew up');
      },
    };
    const { client } = createFakeClient({ commonallplayers: () => directoryBody });
    const provider = makeProvider(client, throwingReporter);

    expect(await provider.searchPlayers('lebron', 8)).toHaveLength(1);
  });

  it('a reporter mutating its copy cannot corrupt the diagnostic stored on the error', async () => {
    const mutatingReporter: DiagnosticReporter = {
      report: (diagnostic) => {
        // Mutate the received copy; the frozen original on the error must be unaffected.
        diagnostic.stage = 'mapped-schema';
        diagnostic.endpoint = 'tampered';
      },
    };
    const { client } = createFakeClient({
      commonallplayers: () => invalidDirectoryBody,
    });
    const provider = makeProvider(client, mutatingReporter);

    const error = await provider.searchPlayers('lebron', 8).then(
      () => {
        throw new Error('expected a rejection');
      },
      (caught: unknown) => caught as ProviderError,
    );

    expect(error.code).toBe('PROVIDER_INVALID_RESPONSE');
    expect(error.diagnostic?.stage).toBe('value-format');
    expect(error.diagnostic?.category).toBe('invalid-roster-status');
  });
});

describe('NbaStatsPlayerProvider directory-name fallback (TASK-010 Stage C)', () => {
  const fallbackDirectoryBody = envelope(
    resultSet('CommonAllPlayers', DIRECTORY_HEADERS, [
      rowFor(DIRECTORY_HEADERS, {
        PERSON_ID: 2544,
        DISPLAY_LAST_COMMA_FIRST: 'Synthetic Mononym', // no usable comma
        DISPLAY_FIRST_LAST: 'Synthetic Mononym',
        ROSTERSTATUS: 1,
        TEAM_ID: 1610612747,
        TEAM_ABBREVIATION: 'LAL',
      }),
    ]),
  );

  it('parses, returns, and contract-validates a fallback-named player through search', async () => {
    const { client } = createFakeClient({
      commonallplayers: () => fallbackDirectoryBody,
    });
    const provider = makeProvider(client);

    const results = await provider.searchPlayers('synthetic', 8);

    // The full display name is preserved and the public search contract is unchanged.
    expect(results).toEqual([
      { id: '2544', fullName: 'Synthetic Mononym', team: { abbreviation: 'LAL' } },
    ]);
    for (const summary of results) {
      expect(() => PlayerSummarySchema.parse(summary)).not.toThrow();
    }

    // Findable by either display-name token through the live-provider directory path.
    expect((await provider.searchPlayers('mononym', 8)).map((p) => p.id)).toEqual([
      '2544',
    ]);
  });
});
