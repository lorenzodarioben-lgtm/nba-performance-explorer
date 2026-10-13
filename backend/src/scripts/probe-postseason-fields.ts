import { createNbaStatsHttpClient } from '../features/players/nba-stats/nba-stats-http-client.js';
import {
  requireFiniteNumber,
  selectResultSet,
} from '../features/players/nba-stats/nba-stats-response.js';
import { ProviderError } from '../features/players/provider-error.js';
const client = createNbaStatsHttpClient({ timeoutMs: 5000 });
const checks = [
  {
    endpoint: 'playercareerstats',
    params: { PlayerID: '201939', PerMode: 'Totals', LeagueID: '00' },
    table: 'SeasonTotalsPostSeason',
    columns: [
      'PLAYER_ID',
      'SEASON_ID',
      'TEAM_ID',
      'GP',
      'MIN',
      'PTS',
      'FGM',
      'FGA',
      'FG3M',
      'FG3A',
      'FTM',
      'FTA',
      'STL',
      'BLK',
      'TOV',
      'PLAYER_AGE',
    ],
  },
  {
    endpoint: 'playergamelog',
    params: {
      PlayerID: '201939',
      Season: '2022-23',
      SeasonType: 'Playoffs',
      LeagueID: '00',
    },
    table: 'PlayerGameLog',
    columns: [
      'Player_ID',
      'Game_ID',
      'GAME_DATE',
      'MATCHUP',
      'WL',
      'MIN',
      'PTS',
      'REB',
      'AST',
      'FGM',
      'FGA',
      'FG3M',
      'FG3A',
      'FTM',
      'FTA',
      'STL',
      'BLK',
      'TOV',
    ],
  },
] as const;
for (const check of checks) {
  const start = Date.now();
  try {
    const table = selectResultSet(
      await client.fetchEndpoint(check.endpoint, check.params),
      check.table,
      check.columns,
    );
    for (const row of table.rows)
      for (const field of check.columns.filter(
        (f) => !['SEASON_ID', 'Game_ID', 'GAME_DATE', 'MATCHUP', 'WL'].includes(f),
      ))
        requireFiniteNumber(table, row, field);
    console.log(
      JSON.stringify({
        endpoint: check.endpoint,
        resultSet: check.table,
        rows: table.rows.length,
        requiredFieldsValidated: true,
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
        host: 'local-engineering',
        productionHostTested: false,
      }),
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        endpoint: check.endpoint,
        status: error instanceof ProviderError ? error.code : 'FAILED',
        latencyMs: Date.now() - start,
      }),
    );
    process.exitCode = 1;
    break;
  }
}
