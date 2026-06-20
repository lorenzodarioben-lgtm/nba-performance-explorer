import { z } from 'zod';

export const TeamSummarySchema = z
  .object({
    abbreviation: z.string().regex(/^[A-Z]{3}$/),
  })
  .strict();

export type TeamSummary = z.infer<typeof TeamSummarySchema>;

export const PlayerSummarySchema = z
  .object({
    id: z.string().trim().min(1),
    fullName: z.string().trim().min(1),
    team: TeamSummarySchema,
    position: z.string().trim().min(1).max(10).optional(),
  })
  .strict();

export type PlayerSummary = z.infer<typeof PlayerSummarySchema>;

export const PlayerSearchResponseSchema = z
  .object({
    players: z.array(PlayerSummarySchema).max(8),
  })
  .strict();

export type PlayerSearchResponse = z.infer<typeof PlayerSearchResponseSchema>;
