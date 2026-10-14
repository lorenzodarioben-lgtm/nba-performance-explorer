import type {
  ArchiveRankingResponse,
  ProfileMetric,
  RecordedDataset,
} from '@nba-performance-explorer/contracts';
import { normalizeRecordedProfiles } from './recorded-profiles.js';

type Column = {
  metric: ProfileMetric;
  rows: readonly ArchiveRankingResponse['rows'][number][];
};

/** How many nearest seasons the card lists. */
export const SIMILAR_SEASONS = 8;

/**
 * One player's recorded season: the team rows as published, the player's place in the common
 * GP-qualified cohort and the nearest seasons by equally weighted z-score distance. Every number
 * comes from the same columns the percentile profiles use, so the two pages always agree.
 */
export function buildPlayerSeason(
  dataset: RecordedDataset,
  columns: readonly Column[],
  playerId: string,
  minGames: number,
) {
  const stints = dataset.snapshots.flatMap((s) =>
    s.statistics['regular-season']
      .filter((row) => row.nbaPlayerId === playerId)
      .map((row) => ({ team: s.team, row, source: s.attribution })),
  );
  const name = stints[0]?.row.name ?? null;
  const maps = columns.map((c) => new Map(c.rows.map((r) => [r.playerId, r])));
  const cohortIds = (columns[0]?.rows ?? [])
    .filter((r) => maps.every((m) => m.has(r.playerId)))
    .map((r) => r.playerId);
  const all = normalizeRecordedProfiles(columns, cohortIds);
  const self = all.profiles.find((p) => p.playerId === playerId);
  const gamesPlayed = stints.reduce((s, x) => s + x.row.gamesPlayed, 0);
  const exclusion = self
    ? null
    : !stints.length
      ? 'No 2023-24 team page in the archive lists this NBA identity.'
      : gamesPlayed < minGames
        ? `Played ${gamesPlayed} recorded games, below the ${minGames}-game minimum.`
        : 'A category cannot be computed: rows from more than one team combine only from raw totals, and at least one of this player’s team rows lacks them.';
  const similar = self
    ? all.profiles
        .filter((p) => p.playerId !== playerId)
        .map((p) => {
          const zDifferences = p.categories.map(
            (c, i) => c.zScore - self.categories[i]!.zScore,
          );
          return {
            playerId: p.playerId,
            name: p.name!,
            gamesPlayed: p.gamesPlayed!,
            teams: maps[0]!.get(p.playerId)!.teams,
            distance: Math.sqrt(zDifferences.reduce((s, d) => s + d * d, 0)),
            zDifferences,
          };
        })
        .sort((a, b) => a.distance - b.distance || a.playerId.localeCompare(b.playerId))
        .slice(0, SIMILAR_SEASONS)
    : [];
  return {
    name,
    stints,
    qualified: Boolean(self),
    exclusion,
    population: all.population,
    metricPopulations: all.metricPopulations.map((m) => ({
      metric: m.metric,
      mean: m.mean,
      standardDeviation: m.standardDeviation,
    })),
    categories: self?.categories ?? [],
    similar,
  };
}
