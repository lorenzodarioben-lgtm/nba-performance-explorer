import { z } from 'zod';
import { SeasonIdSchema } from './player-season.js';
import { TeamSummarySchema } from './player-search.js';
import { DataProvenanceSchema, ResearchPlayerIdSchema } from './research.js';

const count = z.number().int().nonnegative().nullable();
export const SeasonTotalsSchema = z
  .object({
    playerId: ResearchPlayerIdSchema,
    season: SeasonIdSchema,
    team: TeamSummarySchema.optional(),
    gamesPlayed: z.number().int().nonnegative(),
    minutes: z.number().finite().nonnegative().nullable(),
    points: count,
    rebounds: count,
    assists: count,
    turnovers: count,
    fieldGoalsMade: count,
    fieldGoalsAttempted: count,
    threesMade: count,
    threesAttempted: count,
    freeThrowsMade: count,
    freeThrowsAttempted: count,
  })
  .strict()
  .refine(
    (s) =>
      [
        [s.fieldGoalsMade, s.fieldGoalsAttempted],
        [s.threesMade, s.threesAttempted],
        [s.freeThrowsMade, s.freeThrowsAttempted],
        [s.threesMade, s.fieldGoalsMade],
        [s.threesAttempted, s.fieldGoalsAttempted],
      ].every(
        ([made, attempted]) =>
          made === null ||
          attempted === null ||
          made === undefined ||
          attempted === undefined ||
          made <= attempted,
      ),
    { message: 'Shooting totals are inconsistent.' },
  );
export type SeasonTotals = z.infer<typeof SeasonTotalsSchema>;
const metric = z.number().finite().nonnegative().nullable();
export const EfficiencyMetricsSchema = z
  .object({
    trueShooting: metric,
    effectiveFieldGoal: metric,
    assistTurnover: metric,
    pointsPer36: metric,
    fieldGoalPercentage: metric,
    threePointPercentage: metric,
    freeThrowPercentage: metric,
  })
  .strict();
export type EfficiencyMetrics = z.infer<typeof EfficiencyMetricsSchema>;
export const SeasonTotalsResponseSchema = z
  .object({
    status: z.enum(['available', 'season-unavailable', 'unsupported']),
    totals: SeasonTotalsSchema.nullable(),
    metrics: EfficiencyMetricsSchema.nullable(),
    provenance: DataProvenanceSchema,
  })
  .strict()
  .refine(
    (r) =>
      r.status === 'available'
        ? r.totals !== null && r.metrics !== null
        : r.totals === null && r.metrics === null,
    { message: 'Availability must match total/metric values.' },
  );
export type SeasonTotalsResponse = z.infer<typeof SeasonTotalsResponseSchema>;
