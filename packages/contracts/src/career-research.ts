import { z } from 'zod';
import { DataProvenanceSchema, ResearchPlayerIdSchema } from './research.js';
import { PlayerProfileSchema } from './player-profile.js';
import { SeasonIdSchema } from './player-season.js';
import { EfficiencyMetricsSchema, SeasonTotalsSchema } from './season-totals.js';

export const CAREER_METRICS = {
  pointsPerGame: 'PTS per game',
  reboundsPerGame: 'REB per game',
  assistsPerGame: 'AST per game',
  trueShooting: 'True shooting %',
  effectiveFieldGoal: 'Effective FG %',
  pointsPer36: 'PTS per 36 minutes',
} as const;
export const SeasonScopeSchema = z.enum(['regular-season', 'playoffs']);
export type SeasonScope = z.infer<typeof SeasonScopeSchema>;
export const CareerMetricSchema = z.enum(
  Object.keys(CAREER_METRICS) as [
    keyof typeof CAREER_METRICS,
    ...(keyof typeof CAREER_METRICS)[],
  ],
);
export type CareerMetric = z.infer<typeof CareerMetricSchema>;
export const CareerQuerySchema = z
  .object({
    metric: CareerMetricSchema.default('pointsPerGame'),
    scope: SeasonScopeSchema.default('regular-season'),
    minGames: z.coerce.number().int().min(1).max(82).default(20),
  })
  .strict();
const value = z.number().finite().nonnegative().nullable();
export const CareerSeasonSchema = z
  .object({
    totals: SeasonTotalsSchema,
    metrics: EfficiencyMetricsSchema,
    pointsPerGame: value,
    reboundsPerGame: value,
    assistsPerGame: value,
  })
  .strict();
export const CareerAggregateSchema = z
  .object({
    seasonsReported: z.number().int().min(1).max(100),
    gamesPlayed: z.number().int().nonnegative(),
    minutes: value,
    points: value,
    rebounds: value,
    assists: value,
    turnovers: value,
    fieldGoalsMade: value,
    fieldGoalsAttempted: value,
    threesMade: value,
    threesAttempted: value,
    freeThrowsMade: value,
    freeThrowsAttempted: value,
    metrics: EfficiencyMetricsSchema,
  })
  .strict();
export const CareerResearchResponseSchema = z
  .object({
    player: PlayerProfileSchema,
    status: z.enum(['available', 'records-unavailable', 'unsupported']),
    seasons: z.array(CareerSeasonSchema).max(100),
    aggregate: CareerAggregateSchema.nullable(),
    milestones: z
      .array(
        z
          .object({
            metric: z.enum(['points', 'rebounds', 'assists']),
            threshold: z.number().int().positive(),
            reportedTotal: value,
            reached: z.boolean().nullable(),
            reachedByReportedSeason: SeasonIdSchema.nullable(),
          })
          .strict(),
      )
      .max(24),
    peak: z
      .object({
        metric: CareerMetricSchema,
        minGames: z.number().int().min(1).max(82),
        qualifiedSeasons: z.number().int().nonnegative().max(100),
        excludedSeasons: z.number().int().nonnegative().max(100),
        value,
        seasons: z.array(SeasonIdSchema).max(100),
      })
      .strict(),
    provenance: DataProvenanceSchema,
  })
  .strict()
  .refine(
    (r) =>
      r.status === 'available'
        ? r.seasons.length > 0 && r.aggregate !== null
        : r.seasons.length === 0 && r.aggregate === null,
    { message: 'Career availability must match records.' },
  );
export type CareerSeason = z.infer<typeof CareerSeasonSchema>;
export type CareerResearchResponse = z.infer<typeof CareerResearchResponseSchema>;
export const CareerComparisonQuerySchema = CareerQuerySchema.extend({
  players: z
    .string()
    .transform((s) => s.split(','))
    .pipe(
      z
        .array(ResearchPlayerIdSchema)
        .min(2)
        .max(4)
        .refine((ids) => new Set(ids).size === ids.length),
    ),
}).strict();
export const CareerComparisonResponseSchema = z
  .object({
    rows: z
      .array(
        z
          .object({
            playerId: ResearchPlayerIdSchema,
            data: CareerResearchResponseSchema.nullable(),
            status: z.enum([
              'available',
              'player-unavailable',
              'records-unavailable',
              'unsupported',
              'source-unavailable',
            ]),
          })
          .strict(),
      )
      .min(2)
      .max(4),
  })
  .strict();
export type CareerComparisonResponse = z.infer<typeof CareerComparisonResponseSchema>;

export function careerMetricValue(
  s: CareerSeason,
  metric: CareerMetric,
): number | null {
  return metric === 'pointsPerGame' ||
    metric === 'reboundsPerGame' ||
    metric === 'assistsPerGame'
    ? s[metric]
    : s.metrics[metric];
}
