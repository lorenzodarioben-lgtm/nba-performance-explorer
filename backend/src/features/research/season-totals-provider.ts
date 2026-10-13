import {
  SeasonIdSchema,
  SeasonTotalsSchema,
  type SeasonTotals,
  type SeasonScope,
} from '@nba-performance-explorer/contracts';

import type { NbaStatsHttpClient } from '../players/nba-stats/nba-stats-http-client.js';
import { NbaStatsCache } from '../players/nba-stats/nba-stats-cache.js';
import {
  optionalFiniteNumber,
  requireFiniteNumber,
  requireString,
  selectResultSet,
  validateMapped,
} from '../players/nba-stats/nba-stats-response.js';
import { providerInvalidResponse } from '../players/provider-error.js';

export interface SeasonTotalsProvider {
  getCareerTotals?(
    playerId: string,
    scope?: SeasonScope,
  ): Promise<{
    records: SeasonTotals[];
    retrievedAt: string;
  }>;
  getSeasonTotals(
    playerId: string,
    season: string,
    scope?: SeasonScope,
  ): Promise<{ totals: SeasonTotals | null; retrievedAt: string }>;
}

const columns = [
  'PLAYER_ID',
  'LEAGUE_ID',
  'SEASON_ID',
  'TEAM_ID',
  'TEAM_ABBREVIATION',
  'GP',
  'MIN',
  'PTS',
  'REB',
  'AST',
  'TOV',
  'FGM',
  'FGA',
  'FG3M',
  'FG3A',
  'FTM',
  'FTA',
];

export function mapSeasonTotals(
  body: unknown,
  expectedPlayerId: string,
  scope: SeasonScope = 'regular-season',
): SeasonTotals[] {
  const table = selectResultSet(
    body,
    scope === 'playoffs' ? 'SeasonTotalsPostSeason' : 'SeasonTotalsRegularSeason',
    columns,
  );
  if (table.rows.length > 150)
    throw providerInvalidResponse('Career totals exceed supported bounds.');
  const groups = new Map<
    string,
    { record: SeasonTotals; teamId: number; aggregate: boolean }[]
  >();
  const seen = new Set<string>();
  for (const row of table.rows) {
    if (requireString(table, row, 'LEAGUE_ID') !== '00') continue;
    if (String(requireFiniteNumber(table, row, 'PLAYER_ID')) !== expectedPlayerId)
      throw providerInvalidResponse('Player identity mismatch in totals.');
    const season = requireString(table, row, 'SEASON_ID');
    if (!SeasonIdSchema.safeParse(season).success)
      throw providerInvalidResponse('Invalid totals season.');
    const teamId = requireFiniteNumber(table, row, 'TEAM_ID');
    const abbreviation = requireString(table, row, 'TEAM_ABBREVIATION');
    if (!Number.isSafeInteger(teamId) || teamId < 0)
      throw providerInvalidResponse('Invalid totals team identity.');
    const aggregate = teamId === 0 || abbreviation === 'TOT';
    const key = `${season}:${teamId}`;
    if (seen.has(key)) throw providerInvalidResponse('Duplicate totals source row.');
    seen.add(key);
    const number = (column: string) => optionalFiniteNumber(table, row, column) ?? null;
    const record = validateMapped(
      SeasonTotalsSchema,
      {
        playerId: expectedPlayerId,
        season,
        ...(aggregate ? {} : { team: { abbreviation } }),
        gamesPlayed: requireFiniteNumber(table, row, 'GP'),
        minutes: number('MIN'),
        points: number('PTS'),
        rebounds: number('REB'),
        assists: number('AST'),
        turnovers: number('TOV'),
        fieldGoalsMade: number('FGM'),
        fieldGoalsAttempted: number('FGA'),
        threesMade: number('FG3M'),
        threesAttempted: number('FG3A'),
        freeThrowsMade: number('FTM'),
        freeThrowsAttempted: number('FTA'),
      },
      'season totals',
    );
    const group = groups.get(season) ?? [];
    group.push({ record, teamId, aggregate });
    groups.set(season, group);
  }
  return [...groups.values()]
    .map((group) => {
      const representative =
        group.length === 1
          ? group[0]
          : group.filter((r) => r.aggregate).length === 1
            ? group.find((r) => r.aggregate)
            : undefined;
      if (!representative)
        throw providerInvalidResponse('Traded totals require a unique aggregate.');
      return representative.record;
    })
    .sort((a, b) => b.season.localeCompare(a.season));
}

export class NbaSeasonTotalsProvider implements SeasonTotalsProvider {
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
  async getCareerTotals(playerId: string, scope: SeasonScope = 'regular-season') {
    return this.cache.getOrLoad(
      `totals:${playerId}:${scope}`,
      async () => {
        const records = mapSeasonTotals(
          await this.client.fetchEndpoint('playercareerstats', {
            PlayerID: playerId,
            PerMode: 'Totals',
            LeagueID: '00',
          }),
          playerId,
          scope,
        );
        return { records, retrievedAt: this.now().toISOString() };
      },
      (value) => (value.records.length ? 6 * 60 * 60_000 : 60_000),
    );
  }
  async getSeasonTotals(
    playerId: string,
    season: string,
    scope: SeasonScope = 'regular-season',
  ) {
    const data = await this.getCareerTotals(playerId, scope);
    return {
      totals: data.records.find((r) => r.season === season) ?? null,
      retrievedAt: data.retrievedAt,
    };
  }
}
