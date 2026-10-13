import { z } from 'zod';
import {
  ComparisonMetricSchema,
  ComparisonResponseSchema,
  ComparisonSelectionSchema,
} from './research.js';

export const AnalyticsMetricSchema = z.enum([
  ...ComparisonMetricSchema.options,
  'trueShooting',
  'effectiveFieldGoal',
  'assistTurnover',
  'pointsPer36',
]);
export type AnalyticsMetric = z.infer<typeof AnalyticsMetricSchema>;
const weight = z
  .string()
  .regex(/^-?\d(?:\.\d{1,2})?$/)
  .transform(Number)
  .pipe(z.number().min(-5).max(5));
export const CohortQuerySchema = z
  .object({
    players: z.string().max(55),
    seasons: z.string().max(31),
    x: AnalyticsMetricSchema.default('pointsPerGame'),
    y: AnalyticsMetricSchema.default('reboundsPerGame'),
    weightX: weight.prefault('1'),
    weightY: weight.prefault('1'),
    minGames: z
      .string()
      .regex(/^\d{1,2}$/)
      .transform(Number)
      .pipe(z.number().int().min(0).max(82))
      .prefault('10'),
  })
  .strict()
  .refine(
    (q) => {
      const players = q.players.split(',');
      const seasons = q.seasons.split(',');
      return (
        players.length === seasons.length &&
        ComparisonSelectionSchema.safeParse(
          players.map((playerId, i) => ({ playerId, season: seasons[i] })),
        ).success
      );
    },
    { message: 'Choose 2–4 distinct NBA IDs with aligned seasons.' },
  );
export type CohortQuery = z.infer<typeof CohortQuerySchema>;
export const CohortResponseSchema = ComparisonResponseSchema.extend({
  analysis: z
    .object({
      x: AnalyticsMetricSchema,
      y: AnalyticsMetricSchema,
      weightX: z.number().min(-5).max(5),
      weightY: z.number().min(-5).max(5),
      minGames: z.number().int().nonnegative(),
      rows: z
        .array(
          z
            .object({
              playerId: z.string(),
              x: z.number().finite(),
              y: z.number().finite(),
              zX: z.number().finite(),
              zY: z.number().finite(),
              score: z.number().finite(),
              rank: z.number().int().positive(),
            })
            .strict(),
        )
        .max(4),
      excluded: z
        .array(z.object({ playerId: z.string(), reason: z.string() }).strict())
        .max(4),
      sample: z.number().int().min(0).max(4),
      correlation: z.number().finite().min(-1).max(1).nullable(),
    })
    .strict(),
}).strict();
export type CohortResponse = z.infer<typeof CohortResponseSchema>;
