import {
  RawPlayerGameSchema,
  type RawPlayerGame,
  type SeasonScope,
} from '@nba-performance-explorer/contracts';
import { NbaStatsCache } from '../players/nba-stats/nba-stats-cache.js';
import type { NbaStatsHttpClient } from '../players/nba-stats/nba-stats-http-client.js';
import { mapGameLog } from '../players/nba-stats/nba-stats-mappers.js';
import {
  optionalFiniteNumber,
  requireFiniteNumber,
  requireString,
  selectResultSet,
  validateMapped,
} from '../players/nba-stats/nba-stats-response.js';
import { providerInvalidResponse } from '../players/provider-error.js';

export interface GameResearchProvider {
  getGames(
    playerId: string,
    season: string,
    scope: SeasonScope,
  ): Promise<{ games: RawPlayerGame[]; retrievedAt: string }>;
}
const fields = {
  fieldGoalsMade: 'FGM',
  fieldGoalsAttempted: 'FGA',
  threesMade: 'FG3M',
  threesAttempted: 'FG3A',
  freeThrowsMade: 'FTM',
  freeThrowsAttempted: 'FTA',
  steals: 'STL',
  blocks: 'BLK',
  turnovers: 'TOV',
} as const;
export function mapResearchGames(
  body: unknown,
  playerId: string,
  season: string,
  scope: SeasonScope,
): RawPlayerGame[] {
  const table = selectResultSet(body, 'PlayerGameLog', [
    'SEASON_ID',
    'Player_ID',
    'Game_ID',
    ...Object.values(fields),
  ]);
  if (table.rows.length > 150)
    throw providerInvalidResponse('Game count exceeds supported bound.');
  const raw = new Map<string, RawPlayerGame['raw']>();
  for (const row of table.rows) {
    if (
      String(requireFiniteNumber(table, row, 'Player_ID')) !== playerId ||
      requireString(table, row, 'SEASON_ID') !==
        `${scope === 'playoffs' ? '4' : '2'}${season.slice(0, 4)}`
    )
      throw providerInvalidResponse('Player/season/type mismatch in game records.');
    const id = requireString(table, row, 'Game_ID');
    if (raw.has(id)) throw providerInvalidResponse('Duplicate game record.');
    raw.set(
      id,
      Object.fromEntries(
        Object.entries(fields).map(([key, field]) => [
          key,
          optionalFiniteNumber(table, row, field) ?? null,
        ]),
      ) as RawPlayerGame['raw'],
    );
  }
  return mapGameLog(body).map((game) =>
    validateMapped(RawPlayerGameSchema, { game, raw: raw.get(game.id) }, 'raw game'),
  );
}
export class NbaGameResearchProvider implements GameResearchProvider {
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
  getGames(playerId: string, season: string, scope: SeasonScope) {
    return this.cache.getOrLoad(
      `games:${playerId}:${season}:${scope}`,
      async () => ({
        games: mapResearchGames(
          await this.client.fetchEndpoint('playergamelog', {
            PlayerID: playerId,
            Season: season,
            SeasonType: scope === 'playoffs' ? 'Playoffs' : 'Regular Season',
            LeagueID: '00',
          }),
          playerId,
          season,
          scope,
        ),
        retrievedAt: this.now().toISOString(),
      }),
      (value) => (value.games.length ? 5 * 60_000 : 60_000),
    );
  }
}
