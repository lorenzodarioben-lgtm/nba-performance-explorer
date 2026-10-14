import { z } from 'zod';
import { ArchiveParticipantStatsSchema } from './team-archive.js';
import { DirectoryTeamSchema } from './team-directory.js';
import { ArchiveSeasonSchema, WikiAttributionSchema } from './wiki-archive.js';
import { DataProvenanceSchema, ResearchPlayerIdSchema } from './research.js';
import { ProfileMetricSchema } from './recorded-profiles.js';

// One player's recorded 2023-24 regular season: the published team rows, cohort percentiles
// and transparent nearest seasons in the same GP-qualified cohort.

export const RecordedPlayerSeasonQuerySchema = z
  .object({
    season: ArchiveSeasonSchema.default('2023-24'),
    player: ResearchPlayerIdSchema,
    minGames: z
      .string()
      .regex(/^\d{1,2}$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(82))
      .prefault('20'),
  })
  .strict();
export type RecordedPlayerSeasonQuery = z.infer<typeof RecordedPlayerSeasonQuerySchema>;

const Category = z
  .object({
    metric: ProfileMetricSchema,
    value: z.number().finite(),
    rank: z.number().int().positive(),
    percentile: z.number().min(0).max(100),
    zScore: z.number().finite(),
  })
  .strict();

export const RecordedPlayerSeasonResponseSchema = z
  .object({
    season: ArchiveSeasonSchema,
    scope: z.literal('regular-season'),
    playerId: ResearchPlayerIdSchema,
    /** Null when no team page lists this NBA identity. */
    name: z.string().min(1).max(100).nullable(),
    /** Each source team row exactly as published (traded players have one per team). */
    stints: z
      .array(
        z
          .object({
            team: DirectoryTeamSchema,
            row: ArchiveParticipantStatsSchema,
            source: WikiAttributionSchema,
          })
          .strict(),
      )
      .max(10),
    minGames: z.number().int().min(1).max(82),
    /** In the common cohort: identity mapped, single supported row and GP at the minimum. */
    qualified: z.boolean(),
    /** Why the player is outside the cohort, when they are. */
    exclusion: z.string().max(240).nullable(),
    population: z.number().int().min(0).max(650),
    metrics: z.array(ProfileMetricSchema).length(6),
    metricPopulations: z
      .array(
        z
          .object({
            metric: ProfileMetricSchema,
            mean: z.number().finite().nullable(),
            standardDeviation: z.number().finite().nonnegative().nullable(),
          })
          .strict(),
      )
      .length(6),
    categories: z.array(Category).max(6),
    similar: z
      .array(
        z
          .object({
            playerId: ResearchPlayerIdSchema,
            name: z.string().min(1).max(100),
            gamesPlayed: z.number().int().nonnegative(),
            teams: z.array(DirectoryTeamSchema).min(1).max(10),
            distance: z.number().finite().nonnegative(),
            /** Their z-score minus this player's, per metric, in metric order. */
            zDifferences: z.array(z.number().finite()).length(6),
          })
          .strict(),
      )
      .max(10),
    snapshotCreatedAt: z.iso.datetime(),
    provenance: DataProvenanceSchema,
  })
  .strict();
export type RecordedPlayerSeasonResponse = z.infer<
  typeof RecordedPlayerSeasonResponseSchema
>;
