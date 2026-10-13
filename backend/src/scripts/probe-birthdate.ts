import { GameDateSchema } from '@nba-performance-explorer/contracts';
import { createNbaStatsHttpClient } from '../features/players/nba-stats/nba-stats-http-client.js';
import {
  requireFiniteNumber,
  requireString,
  selectResultSet,
} from '../features/players/nba-stats/nba-stats-response.js';
import { ProviderError } from '../features/players/provider-error.js';
const client = createNbaStatsHttpClient({ timeoutMs: 5000 });
for (const playerId of ['201939', '2544']) {
  const start = Date.now();
  try {
    const table = selectResultSet(
      await client.fetchEndpoint('commonplayerinfo', {
        PlayerID: playerId,
        LeagueID: '00',
      }),
      'CommonPlayerInfo',
      ['PERSON_ID', 'BIRTHDATE'],
    );
    if (table.rows.length !== 1) throw new Error('Profile cardinality invalid.');
    const row = table.rows[0]!;
    if (String(requireFiniteNumber(table, row, 'PERSON_ID')) !== playerId)
      throw new Error('Player identity mismatch.');
    const date = requireString(table, row, 'BIRTHDATE');
    if (
      !/^\d{4}-\d{2}-\d{2}T00:00:00$/.test(date) ||
      !GameDateSchema.safeParse(date.slice(0, 10)).success
    )
      throw new Error('Birth date format invalid.');
    console.log(
      JSON.stringify({
        playerId,
        status: 'PARSED',
        requiredFieldsValidated: true,
        sourceDateFormat: 'YYYY-MM-DDT00:00:00',
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
        productionHostTested: false,
      }),
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        playerId,
        status: error instanceof ProviderError ? error.code : 'FAILED',
        latencyMs: Date.now() - start,
      }),
    );
    process.exitCode = 1;
    break;
  }
}
