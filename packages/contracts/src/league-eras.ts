// League environment by season and a transparent league-relative ("era") index for players.
// The index compares a player with the league in the same season; it does not say who was better.
import { z } from 'zod';
import { ResearchPlayerIdSchema } from './research.js';
import { LeagueProvenanceSchema, LeagueSeasonLabelSchema } from './league.js';

const Rate = z.number().nullable();
export const LeagueEnvironmentSchema = z
  .object({
    season: LeagueSeasonLabelSchema,
    teams: z.number().int().positive(),
    teamGames: z.number().int().positive(),
    /** Per team game. */
    points: z.number(),
    fieldGoalAttempts: Rate,
    threePointAttempts: Rate,
    freeThrowAttempts: Rate,
    rebounds: Rate,
    assists: Rate,
    turnovers: Rate,
    fieldGoalPct: Rate,
    threePointPct: Rate,
    freeThrowPct: Rate,
    effectiveFieldGoalPct: Rate,
    trueShootingPct: Rate,
    /** 3PA ÷ FGA and FTA ÷ FGA. */
    threePointRate: Rate,
    freeThrowRate: Rate,
    /** NBA.com's published pace and offensive rating, possession-weighted (1996-97 on). */
    pace: Rate,
    offensiveRating: Rate,
    /** League totals per 36 player-minutes: the denominators of the era index. */
    per36: z
      .object({
        points: z.number(),
        rebounds: Rate,
        assists: Rate,
        steals: Rate,
        blocks: Rate,
        threesMade: Rate,
      })
      .strict(),
  })
  .strict();
export type LeagueEnvironment = z.infer<typeof LeagueEnvironmentSchema>;

export const LeagueErasResponseSchema = z
  .object({
    seasons: z.array(LeagueEnvironmentSchema),
    model: z.string().max(1200),
    caveats: z.array(z.string().max(400)).max(10),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueErasResponse = z.infer<typeof LeagueErasResponseSchema>;

export const ERA_CATEGORIES = [
  'points',
  'rebounds',
  'assists',
  'steals',
  'blocks',
  'threesMade',
] as const;
export const LeagueEraPlayersQuerySchema = z
  .object({
    players: z
      .string()
      .regex(/^[1-9]\d{0,11}(,[1-9]\d{0,11}){0,3}$/)
      .transform((s) => s.split(','))
      .refine((ids) => new Set(ids).size === ids.length, {
        message: 'Duplicate players.',
      }),
    /** Seasons with fewer minutes are listed but left out of the career summary. */
    minMinutes: z
      .string()
      .regex(/^\d{1,4}$/)
      .transform(Number)
      .pipe(z.number().int().min(0).max(3000))
      .prefault('500'),
  })
  .strict();
const PerCategory = z
  .object({
    points: Rate,
    rebounds: Rate,
    assists: Rate,
    steals: Rate,
    blocks: Rate,
    threesMade: Rate,
    trueShooting: Rate,
  })
  .strict();
export const LeagueEraPlayersResponseSchema = z
  .object({
    minMinutes: z.number().int(),
    players: z.array(
      z
        .object({
          playerId: ResearchPlayerIdSchema,
          name: z.string().max(80),
          mayPredateArchive: z.boolean(),
          seasons: z.array(
            z
              .object({
                season: LeagueSeasonLabelSchema,
                teams: z.array(z.string().max(4)),
                gamesPlayed: z.number().int().positive(),
                minutes: z.number().nullable(),
                /** Per game, and TS% as a ratio. */
                raw: PerCategory,
                /** 100 = the league rate that season. */
                index: PerCategory,
                inSummary: z.boolean(),
              })
              .strict(),
          ),
          /** Minutes-weighted means over seasons in the summary, raw per game and index. */
          summary: z
            .object({
              seasons: z.number().int().nonnegative(),
              minutes: z.number(),
              raw: PerCategory,
              index: PerCategory,
            })
            .strict(),
        })
        .strict(),
    ),
    missing: z.array(z.string().max(20)),
    model: z.string().max(1200),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueEraPlayersResponse = z.infer<typeof LeagueEraPlayersResponseSchema>;
