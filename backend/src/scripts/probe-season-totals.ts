import { createNbaStatsHttpClient } from '../features/players/nba-stats/nba-stats-http-client.js';
import {
  requireFiniteNumber,
  requireString,
  selectResultSet,
} from '../features/players/nba-stats/nba-stats-response.js';
import { ProviderError } from '../features/players/provider-error.js';

// Opt-in, two-request field-coverage check. Existing approved endpoint only.
const client = createNbaStatsHttpClient({ timeoutMs: 5000 });
const required = [
  'PLAYER_ID',
  'SEASON_ID',
  'TEAM_ID',
  'TEAM_ABBREVIATION',
  'GP',
  'MIN',
  'PTS',
  'FGM',
  'FGA',
  'FG3M',
  'FG3A',
  'FTM',
  'FTA',
  'AST',
  'TOV',
];
for (const id of ['201939', '1629029']) {
  const start = Date.now();
  try {
    const body = await client.fetchEndpoint('playercareerstats', {
      PlayerID: id,
      PerMode: 'Totals',
      LeagueID: '00',
    });
    const table = selectResultSet(body, 'SeasonTotalsRegularSeason', required);
    const rows = table.rows.filter(
      (row) => requireString(table, row, 'SEASON_ID') === '2023-24',
    );
    for (const row of rows) {
      for (const column of required.filter(
        (c) => !['SEASON_ID', 'TEAM_ABBREVIATION'].includes(c),
      ))
        requireFiniteNumber(table, row, column);
    }
    console.log(
      JSON.stringify({
        environment: 'local-engineering-host',
        playerId: id,
        perMode: 'Totals',
        status: 'PARSED',
        rows: table.rows.length,
        selectedSeasonRows: rows.length,
        numericFieldsValidated: true,
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
        productionHostTested: false,
      }),
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        playerId: id,
        status: error instanceof ProviderError ? error.code : 'FAILED',
        latencyMs: Date.now() - start,
      }),
    );
    process.exitCode = 1;
    break;
  }
}
