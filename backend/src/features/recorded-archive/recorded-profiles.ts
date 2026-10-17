import type {
  ArchiveRankingResponse,
  ProfileMetric,
} from '@nba-performance-explorer/contracts';
import { distribution } from './recorded-statistics.js';
type Column = {
  metric: ProfileMetric;
  rows: readonly Pick<
    ArchiveRankingResponse['rows'][number],
    'playerId' | 'name' | 'gamesPlayed' | 'value'
  >[];
};
export function normalizeRecordedProfiles(
  columns: readonly Column[],
  players: readonly string[],
) {
  const maps = columns.map((c) => new Map(c.rows.map((r) => [r.playerId, r])));
  const common = (columns[0]?.rows ?? []).filter((r) =>
    maps.every((m) => m.has(r.playerId)),
  );
  const values = columns.map((_, i) =>
    common.map((r) => maps[i]!.get(r.playerId)!.value),
  );
  const stats = values.map(distribution);
  const population = common.length;
  return {
    population,
    metricPopulations: columns.map((c, i) => ({
      metric: c.metric,
      qualified: c.rows.length,
      mean: stats[i]!.mean,
      standardDeviation: stats[i]!.standardDeviation,
    })),
    profiles: players.map((playerId) => {
      const row = common.find((r) => r.playerId === playerId);
      if (!row)
        return {
          playerId,
          name: null,
          gamesPlayed: null,
          available: false,
          categories: [],
        };
      return {
        playerId,
        name: row.name,
        gamesPlayed: row.gamesPlayed,
        available: true,
        categories: columns.map((c, i) => {
          const value = maps[i]!.get(playerId)!.value,
            axis = values[i]!,
            d = stats[i]!;
          const lower = axis.filter((v) => v < value).length,
            equal = axis.filter((v) => v === value).length;
          return {
            metric: c.metric,
            value,
            rank: 1 + axis.filter((v) => v > value).length,
            percentile: (100 * (lower + equal * 0.5)) / population,
            zScore: d.standardDeviation ? (value - d.mean!) / d.standardDeviation : 0,
          };
        }),
      };
    }),
  };
}
