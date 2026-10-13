import { z } from 'zod';

import { GameDateSchema, PlayerGameSchema } from './player-game-log.js';
import { PlayerIdSchema, PlayerProfileSchema } from './player-profile.js';
import {
  PlayerSeasonSchema,
  PlayerSeasonStatsSchema,
  SeasonIdSchema,
} from './player-season.js';

export const ResearchPlayerIdSchema = PlayerIdSchema.max(12);
export const DataSourceSchema = z.enum([
  'nba-stats',
  'fixture',
  'unknown',
  'nba-api-static',
]);
export type DataSource = z.infer<typeof DataSourceSchema>;

// The legacy provider does not expose upstream retrieval timestamps. Preserve that unknown
// rather than presenting response-generation time as source freshness.
export const DataProvenanceSchema = z
  .object({
    source: DataSourceSchema,
    servedAt: z.iso.datetime(),
    retrievedAt: z.iso.datetime().nullable(),
    asOf: z.iso.datetime().nullable(),
    isLive: z.literal(false),
    scope: z.enum(['regular-season', 'playoffs', 'directory']),
    coverage: z.string().max(500),
    warnings: z.array(z.string().max(500)).max(20),
  })
  .strict();
export type DataProvenance = z.infer<typeof DataProvenanceSchema>;

const boundedInteger = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d{1,4}$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));

export const InsightQuerySchema = z
  .object({
    season: SeasonIdSchema.optional(),
    window: boundedInteger(1, 20).prefault('5'),
    from: GameDateSchema.optional(),
    to: GameDateSchema.optional(),
    opponent: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    location: z.enum(['home', 'away']).optional(),
    result: z.enum(['W', 'L']).optional(),
    sort: z.enum(['date', 'points', 'rebounds', 'assists', 'minutes']).default('date'),
    order: z.enum(['asc', 'desc']).default('desc'),
    page: boundedInteger(1, 100).prefault('1'),
    pageSize: boundedInteger(1, 50).prefault('20'),
  })
  .strict()
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: 'From date must not follow to date.',
  });
export type InsightQuery = z.infer<typeof InsightQuerySchema>;

export const GameMetricSchema = z.enum(['points', 'rebounds', 'assists', 'minutes']);
export type GameMetric = z.infer<typeof GameMetricSchema>;
const nonnegative = z.number().finite().nonnegative();
const nullableAverage = nonnegative.nullable();
export const GameSummaryStatsSchema = z
  .object({
    sample: z.number().int().nonnegative(),
    points: nullableAverage,
    rebounds: nullableAverage,
    assists: nullableAverage,
    minutes: nullableAverage,
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
    winPercentage: z.number().min(0).max(1).nullable(),
  })
  .strict();
export type GameSummaryStats = z.infer<typeof GameSummaryStatsSchema>;

export const PlayerInsightsResponseSchema = z
  .object({
    player: PlayerProfileSchema,
    seasons: z.array(PlayerSeasonSchema).max(100),
    season: SeasonIdSchema.nullable(),
    stats: PlayerSeasonStatsSchema.nullable(),
    provenance: DataProvenanceSchema,
    observedGames: z.number().int().nonnegative(),
    filteredGames: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().min(1).max(50),
    games: z.array(PlayerGameSchema).max(50),
    summary: GameSummaryStatsSchema,
    recent: GameSummaryStatsSchema,
    window: z.number().int().min(1).max(20),
    rolling: z
      .array(
        z
          .object({
            gameId: z.string(),
            date: GameDateSchema,
            summary: GameSummaryStatsSchema,
          })
          .strict(),
      )
      .max(150),
    splits: z
      .array(
        z
          .object({
            label: z.string(),
            summary: GameSummaryStatsSchema,
          })
          .strict(),
      )
      .max(50),
    extrema: z
      .array(
        z
          .object({
            metric: GameMetricSchema,
            high: nonnegative,
            low: nonnegative,
            highGames: z.array(z.string()).max(150),
            lowGames: z.array(z.string()).max(150),
          })
          .strict(),
      )
      .max(4),
  })
  .strict();
export type PlayerInsightsResponse = z.infer<typeof PlayerInsightsResponseSchema>;

export const ComparisonMetricSchema = z.enum([
  'gamesPlayed',
  'minutesPerGame',
  'pointsPerGame',
  'reboundsPerGame',
  'assistsPerGame',
  'stealsPerGame',
  'blocksPerGame',
  'turnoversPerGame',
  'fieldGoalPercentage',
  'threePointPercentage',
  'freeThrowPercentage',
]);
export type ComparisonMetric = z.infer<typeof ComparisonMetricSchema>;
export const COMPARISON_METRICS: readonly {
  key: ComparisonMetric;
  label: string;
  unit: string;
}[] = [
  { key: 'gamesPlayed', label: 'Games played', unit: 'games' },
  { key: 'minutesPerGame', label: 'Minutes', unit: 'min/game' },
  { key: 'pointsPerGame', label: 'Points', unit: 'points/game' },
  { key: 'reboundsPerGame', label: 'Rebounds', unit: 'rebounds/game' },
  { key: 'assistsPerGame', label: 'Assists', unit: 'assists/game' },
  { key: 'stealsPerGame', label: 'Steals', unit: 'steals/game' },
  { key: 'blocksPerGame', label: 'Blocks', unit: 'blocks/game' },
  { key: 'turnoversPerGame', label: 'Turnovers', unit: 'turnovers/game' },
  { key: 'fieldGoalPercentage', label: 'Field goals', unit: '%' },
  { key: 'threePointPercentage', label: 'Three pointers', unit: '%' },
  { key: 'freeThrowPercentage', label: 'Free throws', unit: '%' },
];

export const ComparisonSelectionSchema = z
  .array(
    z
      .object({
        playerId: ResearchPlayerIdSchema,
        season: SeasonIdSchema,
      })
      .strict(),
  )
  .min(2)
  .max(4)
  .refine((slots) => new Set(slots.map((s) => s.playerId)).size === slots.length, {
    message: 'Choose distinct players.',
  });
export type ComparisonSelection = z.infer<typeof ComparisonSelectionSchema>;
export const ComparisonResponseSchema = z
  .object({
    provenance: DataProvenanceSchema,
    rows: z
      .array(
        z
          .object({
            playerId: ResearchPlayerIdSchema,
            player: PlayerProfileSchema.nullable(),
            season: SeasonIdSchema,
            stats: PlayerSeasonStatsSchema.nullable(),
            status: z.enum([
              'available',
              'player-not-found',
              'season-unavailable',
              'source-unavailable',
            ]),
          })
          .strict(),
      )
      .min(2)
      .max(4),
  })
  .strict();
export type ComparisonResponse = z.infer<typeof ComparisonResponseSchema>;

export const CapabilityResponseSchema = z
  .object({
    playerSource: DataSourceSchema,
    capabilities: z
      .array(
        z
          .object({
            id: z.string(),
            status: z.enum(['available', 'conditional', 'blocked']),
            reason: z.string(),
          })
          .strict(),
      )
      .max(20),
    checkedAt: z.iso.datetime(),
    hostVerified: z.literal(false),
  })
  .strict();
export type CapabilityResponse = z.infer<typeof CapabilityResponseSchema>;
