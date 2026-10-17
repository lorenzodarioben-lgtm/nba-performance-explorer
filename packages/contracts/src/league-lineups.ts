// A team's five-player lineups and player on/off splits, as NBA.com calculates them from its own
// play-by-play (2007-08 on). Minutes and possessions travel with every rating.
import { z } from 'zod';
import { CanonicalTeamIdSchema } from './team-directory.js';
import { ResearchPlayerIdSchema } from './research.js';
import {
  LeagueProvenanceSchema,
  LeagueSeasonLabelSchema,
  LeagueTeamRefSchema,
} from './league.js';

export const LeagueLineupsQuerySchema = z
  .object({
    season: LeagueSeasonLabelSchema,
    team: CanonicalTeamIdSchema,
    /** Lineups below this many minutes together are counted but not listed. */
    minMinutes: z
      .string()
      .regex(/^\d{1,4}$/)
      .transform(Number)
      .pipe(z.number().int().min(0).max(4000))
      .prefault('50'),
  })
  .strict();
const RatingsSchema = z
  .object({
    minutes: z.number().nonnegative(),
    possessions: z.number().nonnegative(),
    offRating: z.number().nullable(),
    defRating: z.number().nullable(),
    netRating: z.number().nullable(),
  })
  .strict();
export const LeagueLineupsResponseSchema = z
  .object({
    season: LeagueSeasonLabelSchema,
    team: LeagueTeamRefSchema,
    minMinutes: z.number().int(),
    /** All lineups NBA.com lists for the team, and how many met the minutes minimum. */
    totalLineups: z.number().int().nonnegative(),
    lineups: z.array(
      z
        .object({
          id: z.string().regex(/^-?\d+(-\d+){4}-?$/),
          players: z
            .array(
              z
                .object({ playerId: ResearchPlayerIdSchema, name: z.string().max(80) })
                .strict(),
            )
            .length(5),
          gamesPlayed: z.number().int().nonnegative(),
          pace: z.number().nullable(),
          ratings: RatingsSchema,
        })
        .strict(),
    ),
    onOff: z.array(
      z
        .object({
          playerId: ResearchPlayerIdSchema,
          name: z.string().max(80),
          on: RatingsSchema,
          off: RatingsSchema,
          /** On-court net rating minus off-court net rating. */
          netDifference: z.number().nullable(),
        })
        .strict(),
    ),
    definitions: z.array(z.string().max(300)).max(8),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueLineupsResponse = z.infer<typeof LeagueLineupsResponseSchema>;
