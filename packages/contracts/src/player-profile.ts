import { z } from 'zod';

import { PlayerSummarySchema, TeamSummarySchema } from './player-search.js';

// Public player identifiers are strings of positive decimal digits (no leading zero,
// no signs, decimals, or whitespace). IDs are never coerced to numbers for lookup.
export const PlayerIdSchema = z.string().regex(/^[1-9]\d*$/);

export type PlayerId = z.infer<typeof PlayerIdSchema>;

// Reuse the merged team-summary abbreviation rule and add the profile-only fields.
export const TeamProfileSchema = TeamSummarySchema.extend({
  name: z.string().trim().min(1),
  city: z.string().trim().min(1),
}).strict();

export type TeamProfile = z.infer<typeof TeamProfileSchema>;

export const DraftInfoSchema = z
  .object({
    year: z.number().int().positive(),
    round: z.number().int().positive(),
    pick: z.number().int().positive(),
  })
  .strict();

export type DraftInfo = z.infer<typeof DraftInfoSchema>;

// Reuse the merged player-summary identity fields, replace the team with the richer
// profile team, and add the optional profile metadata.
export const PlayerProfileSchema = PlayerSummarySchema.extend({
  team: TeamProfileSchema,
  jerseyNumber: z.string().trim().min(1).optional(),
  heightInches: z.number().int().positive().optional(),
  weightPounds: z.number().int().positive().optional(),
  country: z.string().trim().min(1).optional(),
  draft: DraftInfoSchema.optional(),
}).strict();

export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

export const PlayerProfileResponseSchema = z
  .object({
    player: PlayerProfileSchema,
  })
  .strict();

export type PlayerProfileResponse = z.infer<typeof PlayerProfileResponseSchema>;
