import { GameDateSchema } from '@nba-performance-explorer/contracts';
import type { NbaStatsHttpClient } from '../players/nba-stats/nba-stats-http-client.js';
import { NbaStatsCache } from '../players/nba-stats/nba-stats-cache.js';
import {
  requireFiniteNumber,
  optionalString,
  selectResultSet,
} from '../players/nba-stats/nba-stats-response.js';
import { providerInvalidResponse } from '../players/provider-error.js';
export interface PlayerBioProvider {
  getBirthDate(
    playerId: string,
  ): Promise<{ birthDate: string | null; retrievedAt: string }>;
}
export function mapBirthDate(body: unknown, playerId: string): string | null {
  const table = selectResultSet(body, 'CommonPlayerInfo', ['PERSON_ID', 'BIRTHDATE']);
  if (!table.rows.length) return null;
  if (table.rows.length !== 1)
    throw providerInvalidResponse('Birth date profile cardinality mismatch.');
  const row = table.rows[0]!;
  if (String(requireFiniteNumber(table, row, 'PERSON_ID')) !== playerId)
    throw providerInvalidResponse('Birth date player mismatch.');
  const text = optionalString(table, row, 'BIRTHDATE');
  if (!text) return null;
  const match = /^(\d{4}-\d{2}-\d{2})T00:00:00$/.exec(text);
  if (!match || !GameDateSchema.safeParse(match[1]).success)
    throw providerInvalidResponse('Birth date format invalid.');
  return match[1]!;
}
export class NbaPlayerBioProvider implements PlayerBioProvider {
  private readonly cache: NbaStatsCache;
  constructor(
    private readonly client: NbaStatsHttpClient,
    private readonly now = () => new Date(),
  ) {
    this.cache = new NbaStatsCache({
      maxEntries: 100,
      now: () => this.now().getTime(),
    });
  }
  getBirthDate(playerId: string) {
    return this.cache.getOrLoad(
      `birth:${playerId}`,
      async () => {
        const birthDate = mapBirthDate(
          await this.client.fetchEndpoint('commonplayerinfo', {
            PlayerID: playerId,
            LeagueID: '00',
          }),
          playerId,
        );
        if (birthDate && birthDate > this.now().toISOString().slice(0, 10))
          throw providerInvalidResponse('Future birth date rejected.');
        return { birthDate, retrievedAt: this.now().toISOString() };
      },
      (value) => (value.birthDate ? 6 * 60 * 60_000 : 60_000),
    );
  }
}
