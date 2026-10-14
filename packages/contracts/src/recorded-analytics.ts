import { z } from 'zod';
import {
  ArchiveRankingMetricSchema,
  ArchiveRankingQuerySchema,
  ArchiveRankingRowSchema,
} from './recorded-archive.js';
import { DataProvenanceSchema, ResearchPlayerIdSchema } from './research.js';
import { WikiAttributionSchema } from './wiki-archive.js';
const weight = z
  .string()
  .regex(/^-?\d(?:\.\d{1,2})?$/)
  .transform(Number)
  .pipe(z.number().min(-5).max(5));
export const RecordedAnalyticsQuerySchema = ArchiveRankingQuerySchema.omit({
  metric: true,
  search: true,
  page: true,
  pageSize: true,
  team: true,
})
  .extend({
    x: ArchiveRankingMetricSchema.default('pointsPerGame'),
    y: ArchiveRankingMetricSchema.default('reboundsPerGame'),
    target: ResearchPlayerIdSchema.optional(),
    weightX: weight.prefault('1'),
    weightY: weight.prefault('1'),
  })
  .strict()
  .refine((q) => q.x !== q.y);
export type RecordedAnalyticsQuery = z.infer<typeof RecordedAnalyticsQuerySchema>;
export const DistributionSchema = z
  .object({
    sample: z.number().int().nonnegative(),
    min: z.number().nullable(),
    max: z.number().nullable(),
    mean: z.number().nullable(),
    standardDeviation: z.number().nonnegative().nullable(),
    q25: z.number().nullable(),
    median: z.number().nullable(),
    q75: z.number().nullable(),
    bins: z
      .array(
        z
          .object({
            from: z.number(),
            to: z.number(),
            count: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .max(12),
  })
  .strict();
export type Distribution = z.infer<typeof DistributionSchema>;
export const RecordedAnalyticsResponseSchema = z
  .object({
    season: z.literal('2023-24'),
    scope: z.enum(['regular-season', 'playoffs']),
    x: ArchiveRankingMetricSchema,
    y: ArchiveRankingMetricSchema,
    minGames: z.number().int().positive(),
    weightX: z.number(),
    weightY: z.number(),
    rows: z
      .array(
        z
          .object({
            playerId: ResearchPlayerIdSchema,
            name: z.string(),
            gamesPlayed: z.number().int().nonnegative(),
            x: z.number(),
            y: z.number(),
            zX: z.number(),
            zY: z.number(),
            score: z.number(),
            rank: z.number().int().positive(),
            xPercentile: z.number().min(0).max(100),
            yPercentile: z.number().min(0).max(100),
          })
          .strict(),
      )
      .max(650),
    xDistribution: DistributionSchema,
    yDistribution: DistributionSchema,
    correlation: z.number().min(-1).max(1).nullable(),
    target: ResearchPlayerIdSchema.nullable(),
    targetAvailable: z.boolean(),
    singleMetricQualifiedX: z.number().int().nonnegative(),
    singleMetricQualifiedY: z.number().int().nonnegative(),
    sourceRows: z.number().int().nonnegative(),
    unknownScopeRows: z.number().int().nonnegative(),
    snapshotCreatedAt: z.iso.datetime(),
    attributions: z.array(WikiAttributionSchema).length(30),
    provenance: DataProvenanceSchema,
  })
  .strict();
export type RecordedAnalyticsResponse = z.infer<typeof RecordedAnalyticsResponseSchema>;
export type RecordedAnalyticsValue = z.infer<typeof ArchiveRankingRowSchema>;
