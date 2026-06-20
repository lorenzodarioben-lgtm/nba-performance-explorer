import { z } from 'zod';

export {
  PlayerSearchResponseSchema,
  PlayerSummarySchema,
  TeamSummarySchema,
  type PlayerSearchResponse,
  type PlayerSummary,
  type TeamSummary,
} from './player-search.js';

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
