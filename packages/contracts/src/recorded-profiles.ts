import { z } from 'zod';
import { ArchiveRankingQuerySchema } from './recorded-archive.js';
import { DataProvenanceSchema, ResearchPlayerIdSchema } from './research.js';
import { WikiAttributionSchema } from './wiki-archive.js';
export const ProfileMetricSchema = z.enum([
  'pointsPerGame',
  'reboundsPerGame',
  'assistsPerGame',
  'stealsPerGame',
  'blocksPerGame',
  'minutesPerGame',
]);
export type ProfileMetric = z.infer<typeof ProfileMetricSchema>;
export const RecordedProfilesQuerySchema = ArchiveRankingQuerySchema.pick({
  season: true,
  scope: true,
  minGames: true,
})
  .extend({
    metrics: z
      .string()
      .max(150)
      .transform((s) => s.split(','))
      .pipe(
        z
          .array(ProfileMetricSchema)
          .min(3)
          .max(6)
          .refine((a) => new Set(a).size === a.length),
      )
      .prefault(
        'pointsPerGame,reboundsPerGame,assistsPerGame,stealsPerGame,blocksPerGame',
      ),
    players: z
      .string()
      .max(60)
      .transform((s) => s.split(','))
      .pipe(
        z
          .array(ResearchPlayerIdSchema)
          .min(1)
          .max(4)
          .refine((a) => new Set(a).size === a.length),
      )
      .prefault('201939'),
  })
  .strict();
export type RecordedProfilesQuery = z.infer<typeof RecordedProfilesQuerySchema>;
const category = z
  .object({
    metric: ProfileMetricSchema,
    value: z.number().finite(),
    rank: z.number().int().positive(),
    percentile: z.number().min(0).max(100),
    zScore: z.number().finite(),
  })
  .strict();
export const RecordedProfilesResponseSchema = z
  .object({
    season: z.literal('2023-24'),
    scope: z.enum(['regular-season', 'playoffs']),
    minGames: z.number().int().positive(),
    population: z.number().int().min(0).max(650),
    metrics: z.array(ProfileMetricSchema).min(3).max(6),
    metricPopulations: z
      .array(
        z
          .object({
            metric: ProfileMetricSchema,
            qualified: z.number().int().nonnegative(),
            mean: z.number().finite().nullable(),
            standardDeviation: z.number().finite().nonnegative().nullable(),
          })
          .strict(),
      )
      .min(3)
      .max(6),
    profiles: z
      .array(
        z
          .object({
            playerId: ResearchPlayerIdSchema,
            name: z.string().nullable(),
            gamesPlayed: z.number().int().nonnegative().nullable(),
            available: z.boolean(),
            categories: z.array(category).max(6),
          })
          .strict()
          .refine((p) =>
            p.available ? p.categories.length >= 3 : p.categories.length === 0,
          ),
      )
      .min(1)
      .max(4),
    sourceRows: z.number().int().nonnegative(),
    unknownScopeRows: z.number().int().nonnegative(),
    snapshotCreatedAt: z.iso.datetime(),
    attributions: z.array(WikiAttributionSchema).length(30),
    provenance: DataProvenanceSchema,
  })
  .strict();
export type RecordedProfilesResponse = z.infer<typeof RecordedProfilesResponseSchema>;
