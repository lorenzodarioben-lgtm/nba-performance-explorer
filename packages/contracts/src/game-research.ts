import { z } from 'zod';
import { PlayerGameSchema } from './player-game-log.js';
import { PlayerProfileSchema } from './player-profile.js';
import { SeasonIdSchema } from './player-season.js';
import { DataProvenanceSchema, InsightQuerySchema } from './research.js';
import { SeasonScopeSchema } from './career-research.js';
import { EfficiencyMetricsSchema, SeasonTotalsSchema } from './season-totals.js';
const count = z.number().int().nonnegative().nullable();
export const RawGameCountsSchema = z
  .object({
    fieldGoalsMade: count,
    fieldGoalsAttempted: count,
    threesMade: count,
    threesAttempted: count,
    freeThrowsMade: count,
    freeThrowsAttempted: count,
    steals: count,
    blocks: count,
    turnovers: count,
  })
  .strict()
  .refine((s) =>
    [
      [s.fieldGoalsMade, s.fieldGoalsAttempted],
      [s.threesMade, s.threesAttempted],
      [s.freeThrowsMade, s.freeThrowsAttempted],
      [s.threesMade, s.fieldGoalsMade],
      [s.threesAttempted, s.fieldGoalsAttempted],
    ].every(([a, b]) => a == null || b == null || a <= b),
  );
export const RawPlayerGameSchema = z
  .object({ game: PlayerGameSchema, raw: RawGameCountsSchema })
  .strict();
export type RawPlayerGame = z.infer<typeof RawPlayerGameSchema>;
export const RAW_GAME_METRICS = [
  'points',
  'rebounds',
  'assists',
  'minutes',
  'steals',
  'blocks',
  'turnovers',
] as const;
export const GameResearchQuerySchema = z
  .object({
    ...InsightQuerySchema.shape,
    season: SeasonIdSchema,
    scope: SeasonScopeSchema.default('regular-season'),
    minPoints: z.coerce.number().int().min(0).max(200).optional(),
    minRebounds: z.coerce.number().int().min(0).max(100).optional(),
    minAssists: z.coerce.number().int().min(0).max(100).optional(),
    minMinutes: z.coerce.number().min(0).max(100).optional(),
    minSample: z.coerce.number().int().min(1).max(150).default(1),
    sort: z.enum(['date', ...RAW_GAME_METRICS]).default('date'),
  })
  .strict()
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: 'From date must not follow to date.',
  });
export type GameResearchQuery = z.infer<typeof GameResearchQuerySchema>;
const nullableMetric = z.number().finite().nonnegative().nullable();
export const RawGameSummarySchema = z
  .object({
    qualified: z.boolean(),
    minSample: z.number().int().min(1).max(150),
    sample: z.number().int().min(0).max(150),
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
    totals: SeasonTotalsSchema,
    metrics: EfficiencyMetricsSchema,
    perGame: z
      .object({
        points: nullableMetric,
        rebounds: nullableMetric,
        assists: nullableMetric,
        minutes: nullableMetric,
        steals: nullableMetric,
        blocks: nullableMetric,
        turnovers: nullableMetric,
      })
      .strict(),
  })
  .strict();
export const GameResearchResponseSchema = z
  .object({
    player: PlayerProfileSchema,
    season: SeasonIdSchema,
    scope: SeasonScopeSchema,
    status: z.enum(['available', 'records-unavailable', 'unsupported']),
    observedGames: z.number().int().min(0).max(150),
    filteredGames: z.number().int().min(0).max(150),
    reportedSeasonGames: z.number().int().nonnegative().nullable(),
    page: z.number().int().min(1).max(100),
    pageSize: z.number().int().min(1).max(50),
    window: z.number().int().min(1).max(20),
    games: z.array(RawPlayerGameSchema).max(50),
    summary: RawGameSummarySchema,
    recent: RawGameSummarySchema,
    splits: z
      .array(
        z.object({ label: z.string().max(50), summary: RawGameSummarySchema }).strict(),
      )
      .max(50),
    rolling: z
      .array(
        z
          .object({
            gameId: z.string(),
            date: z.string(),
            summary: RawGameSummarySchema,
          })
          .strict(),
      )
      .max(150),
    extrema: z
      .array(
        z
          .object({
            metric: z.enum(RAW_GAME_METRICS),
            high: nullableMetric,
            low: nullableMetric,
            highGames: z.array(PlayerGameSchema).max(150),
            lowGames: z.array(PlayerGameSchema).max(150),
          })
          .strict(),
      )
      .max(7),
    provenance: DataProvenanceSchema,
  })
  .strict();
export type GameResearchResponse = z.infer<typeof GameResearchResponseSchema>;
export const SeasonScopeComparisonResponseSchema = z
  .object({
    player: PlayerProfileSchema,
    season: SeasonIdSchema,
    rows: z
      .array(
        z
          .object({
            scope: SeasonScopeSchema,
            status: z.enum(['available', 'season-unavailable', 'unsupported']),
            totals: SeasonTotalsSchema.nullable(),
            metrics: EfficiencyMetricsSchema.nullable(),
            provenance: DataProvenanceSchema,
          })
          .strict(),
      )
      .length(2),
  })
  .strict();
