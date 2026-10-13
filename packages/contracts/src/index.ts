import { z } from 'zod';

export * from './research.js';
export * from './local-research.js';
export * from './team-directory.js';
export * from './season-totals.js';
export * from './cohort-analytics.js';
export * from './career-research.js';

export {
  PlayerSearchResponseSchema,
  PlayerSummarySchema,
  TeamSummarySchema,
  type PlayerSearchResponse,
  type PlayerSummary,
  type TeamSummary,
} from './player-search.js';

export {
  DraftInfoSchema,
  PlayerIdSchema,
  PlayerProfileResponseSchema,
  PlayerProfileSchema,
  TeamProfileSchema,
  type DraftInfo,
  type PlayerId,
  type PlayerProfile,
  type PlayerProfileResponse,
  type TeamProfile,
} from './player-profile.js';

export {
  PlayerSeasonSchema,
  PlayerSeasonStatsResponseSchema,
  PlayerSeasonStatsSchema,
  PlayerSeasonsResponseSchema,
  SeasonIdSchema,
  type PlayerSeason,
  type PlayerSeasonStats,
  type PlayerSeasonStatsResponse,
  type PlayerSeasonsResponse,
  type SeasonId,
} from './player-season.js';

export {
  PlayerSeasonTrendsResponseSchema,
  type PlayerSeasonTrendsResponse,
} from './player-season-trends.js';

export {
  GameDateSchema,
  GameIdSchema,
  GameLocationSchema,
  GameResultSchema,
  PlayerGameLogResponseSchema,
  PlayerGameSchema,
  type GameDate,
  type GameId,
  type GameLocation,
  type GameResult,
  type PlayerGame,
  type PlayerGameLogResponse,
} from './player-game-log.js';

export const HealthResponseSchema = z
  .object({
    status: z.literal('ok'),
    timestamp: z.iso.datetime(),
    service: z.literal('nba-performance-explorer-api'),
  })
  .strict();

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ApiErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.string().min(1),
        message: z.string().min(1),
        status: z.number().int().min(400).max(599),
      })
      .strict(),
  })
  .strict();

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
