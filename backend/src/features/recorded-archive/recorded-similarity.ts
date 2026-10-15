import type {
  ArchiveRankingResponse,
  RecordedSimilarityResponse,
  SimilarityMetric,
} from '@nba-performance-explorer/contracts';
import { zScores } from './recorded-workbench.js';

type Row = ArchiveRankingResponse['rows'][number];
type Built = Pick<
  RecordedSimilarityResponse,
  | 'cohort'
  | 'excluded'
  | 'target'
  | 'targetStatus'
  | 'targetName'
  | 'targetGames'
  | 'neighbours'
>;

/**
 * Nearest players on the reader's chosen metrics. The cohort is every player with at least
 * `minGames` games and a value for every metric; each metric is standardised inside that cohort
 * (population SD), and distance is the root-mean-square of the z differences, so two metrics and
 * nine metrics give distances on one scale. Every metric weighs the same. Returns null when the
 * player is not in the recorded source at all.
 */
export function buildSimilarity(
  everyone: readonly Row[],
  columns: readonly { metric: SimilarityMetric; rows: readonly Row[] }[],
  playerId: string,
  minGames: number,
  limit: number,
): Built | null {
  const self = everyone.find((r) => r.playerId === playerId);
  if (!self) return null;
  const byMetric = columns.map(
    ({ rows }) =>
      new Map(rows.filter((r) => r.value !== null).map((r) => [r.playerId, r.value!])),
  );
  const enough = everyone.filter((r) => r.gamesPlayed >= minGames);
  const members = enough.filter((r) => byMetric.every((m) => m.has(r.playerId)));
  const z = byMetric.map((m) => zScores(members.map((r) => m.get(r.playerId)!)));
  const profile = (r: Row, i: number) => ({
    playerId: r.playerId,
    name: r.name,
    teams: r.teams.map((t) => t.abbreviation),
    gamesPlayed: r.gamesPlayed,
    values: byMetric.map((m) => m.get(r.playerId)!),
    zScores: z.map((col) => col[i]!),
  });
  const at = members.findIndex((r) => r.playerId === playerId);
  const base = {
    cohort: members.length,
    excluded: {
      belowMinimum: everyone.length - enough.length,
      missingMetric: enough.length - members.length,
    },
    targetName: self.name,
    targetGames: self.gamesPlayed,
  };
  if (at < 0)
    return {
      ...base,
      target: null,
      targetStatus: self.gamesPlayed < minGames ? 'below-minimum' : 'missing-metric',
      neighbours: [],
    };
  const target = profile(members[at]!, at);
  const metrics = columns.map((c) => c.metric);
  const neighbours = members
    .flatMap((r, i) => {
      if (i === at) return [];
      const p = profile(r, i);
      const differences = p.zScores.map((v, k) => v - target.zScores[k]!);
      const distance = Math.sqrt(
        differences.reduce((sum, d) => sum + d * d, 0) / differences.length,
      );
      const order = differences
        .map((d, k) => [Math.abs(d), k] as const)
        .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      return [
        {
          ...p,
          distance,
          differences,
          closest: metrics[order[0]![1]]!,
          furthest: metrics[order.at(-1)![1]]!,
        },
      ];
    })
    // Ties keep a stable, documented order: distance, then name, then ID.
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        a.name.localeCompare(b.name) ||
        a.playerId.localeCompare(b.playerId),
    )
    .slice(0, limit)
    .map((n, i) => ({ ...n, rank: i + 1 }));
  return { ...base, target, targetStatus: 'in-cohort', neighbours };
}
