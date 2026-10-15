import { z } from 'zod';
import { ResearchPlayerIdSchema, DataProvenanceSchema } from './research.js';
import { RecordedSeasonSchema } from './wiki-archive.js';

/** Rate and per-game measures only: totals mostly restate games played. */
export const SimilarityMetricSchema = z.enum([
  'minutesPerGame',
  'pointsPerGame',
  'reboundsPerGame',
  'assistsPerGame',
  'stealsPerGame',
  'blocksPerGame',
  'fieldGoalPercentage',
  'threePointPercentage',
  'freeThrowPercentage',
]);
export type SimilarityMetric = z.infer<typeof SimilarityMetricSchema>;

export const RecordedSimilarityQuerySchema = z
  .object({
    season: RecordedSeasonSchema.default('2023-24'),
    player: ResearchPlayerIdSchema,
    /** Two to nine different metrics, comma-separated, in the reader's order. */
    metrics: z
      .string()
      .max(300)
      .transform((s) => s.split(','))
      .pipe(
        z
          .array(SimilarityMetricSchema)
          .min(2)
          .max(9)
          .refine((m) => new Set(m).size === m.length, {
            message: 'Choose each metric once.',
          }),
      ),
    minGames: z
      .string()
      .regex(/^\d{1,2}$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(82))
      .prefault('20'),
    limit: z
      .string()
      .regex(/^\d{1,2}$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(25))
      .prefault('10'),
  })
  .strict();
export type RecordedSimilarityQuery = z.infer<typeof RecordedSimilarityQuerySchema>;

const player = z
  .object({
    playerId: ResearchPlayerIdSchema,
    name: z.string().min(1).max(100),
    teams: z.array(z.string().regex(/^[A-Z]{2,4}$/)).max(5),
    gamesPlayed: z.number().int().nonnegative(),
    /** One value per metric, in query order. */
    values: z.array(z.number()),
    /** Cohort z-scores (population SD) per metric; zero where the cohort has no spread. */
    zScores: z.array(z.number()),
  })
  .strict();

export const RecordedSimilarityResponseSchema = z
  .object({
    season: RecordedSeasonSchema,
    minGames: z.number().int().positive(),
    metrics: z.array(SimilarityMetricSchema).min(2).max(9),
    /** Players with at least `minGames` games and a value for every chosen metric. */
    cohort: z.number().int().nonnegative(),
    excluded: z
      .object({
        belowMinimum: z.number().int().nonnegative(),
        missingMetric: z.number().int().nonnegative(),
      })
      .strict(),
    target: player.nullable(),
    /** Why the target has no neighbours, when it is outside the cohort. */
    targetStatus: z.enum(['in-cohort', 'below-minimum', 'missing-metric']),
    targetName: z.string().min(1).max(100),
    targetGames: z.number().int().nonnegative(),
    neighbours: z
      .array(
        player.extend({
          rank: z.number().int().positive(),
          /** Root-mean-square of the z differences: comparable across metric counts. */
          distance: z.number().nonnegative(),
          /** Neighbour z minus target z, per metric. */
          differences: z.array(z.number()),
          closest: SimilarityMetricSchema,
          furthest: SimilarityMetricSchema,
        }),
      )
      .max(25),
    snapshotCreatedAt: z.iso.datetime(),
    provenance: DataProvenanceSchema,
  })
  .strict();
export type RecordedSimilarityResponse = z.infer<
  typeof RecordedSimilarityResponseSchema
>;
