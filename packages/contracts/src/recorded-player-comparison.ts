import { z } from 'zod';
import { RecordedSeasonSchema } from './wiki-archive.js';
import { DataProvenanceSchema, ResearchPlayerIdSchema } from './research.js';
import { ProfileMetricSchema } from './recorded-profiles.js';

// Two to four recorded 2023-24 player seasons compared inside one stated cohort: the same
// categories, the same percentile and z-score definitions, and deterministic statements built
// only from those numbers.

export const RecordedPlayerComparisonQuerySchema = z
  .object({
    season: RecordedSeasonSchema.default('2023-24'),
    players: z
      .string()
      .max(60)
      .transform((s) => s.split(','))
      .pipe(
        z
          .array(ResearchPlayerIdSchema)
          .min(2)
          .max(4)
          .refine((a) => new Set(a).size === a.length),
      ),
    minGames: z
      .string()
      .regex(/^\d{1,2}$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(82))
      .prefault('20'),
  })
  .strict();
export type RecordedPlayerComparisonQuery = z.infer<
  typeof RecordedPlayerComparisonQuerySchema
>;

const ratio = z.number().min(0).max(1).nullable();

export const ComparedPlayerSchema = z
  .object({
    playerId: ResearchPlayerIdSchema,
    name: z.string().min(1).max(100).nullable(),
    teams: z.array(z.string().regex(/^[A-Z]{3}$/)).max(10),
    gamesPlayed: z.number().int().nonnegative(),
    qualified: z.boolean(),
    exclusion: z.string().max(240).nullable(),
    /** Per metric, in `metrics` order; null when the player is outside the cohort. */
    values: z.array(z.number().finite().nullable()).length(6),
    percentiles: z.array(z.number().min(0).max(100).nullable()).length(6),
    zScores: z.array(z.number().finite().nullable()).length(6),
    /** Published shooting from a single team row; null for traded players (no combined attempts). */
    shooting: z
      .object({ fieldGoal: ratio, threePoint: ratio, freeThrow: ratio })
      .strict()
      .nullable(),
  })
  .strict();
export type ComparedPlayer = z.infer<typeof ComparedPlayerSchema>;

export const RecordedPlayerComparisonResponseSchema = z
  .object({
    season: RecordedSeasonSchema,
    minGames: z.number().int().min(1).max(82),
    population: z.number().int().min(0).max(650),
    metrics: z.array(ProfileMetricSchema).length(6),
    players: z.array(ComparedPlayerSchema).min(2).max(4),
    /** Metrics ordered by the widest standardised gap among qualified players. */
    gaps: z
      .array(
        z
          .object({
            metric: ProfileMetricSchema,
            leaders: z.array(ResearchPlayerIdSchema).max(4),
            rawSpread: z.number().finite().nonnegative().nullable(),
            zSpread: z.number().finite().nonnegative().nullable(),
          })
          .strict(),
      )
      .length(6),
    statements: z
      .array(
        z
          .object({
            kind: z.enum(['scope', 'leader', 'gap', 'sample', 'missing']),
            text: z.string().max(300),
          })
          .strict(),
      )
      .max(24),
    snapshotCreatedAt: z.iso.datetime(),
    provenance: DataProvenanceSchema,
  })
  .strict();
export type RecordedPlayerComparisonResponse = z.infer<
  typeof RecordedPlayerComparisonResponseSchema
>;
