// A player across the league archive: dated team stints, availability, game highs and lows,
// milestones and percentiles; plus league-wide rank movement and distributions. Every figure
// states the games it rests on, and whether the archive covers the whole career.
import { z } from 'zod';
import { ResearchPlayerIdSchema } from './research.js';
import {
  LeagueLeaderMetricSchema,
  LeagueProvenanceSchema,
  LeagueScopeSchema,
  LeagueSeasonLabelSchema,
  LeagueTeamRefSchema,
} from './league.js';
import { LeagueGameIdSchema } from './league-games.js';

const GameRefSchema = z
  .object({
    id: LeagueGameIdSchema,
    date: z.iso.date(),
    season: LeagueSeasonLabelSchema,
    team: z.string().max(4),
    opponent: z.string().max(4),
    home: z.boolean(),
    won: z.boolean(),
  })
  .strict();
const MarkSchema = z
  .object({
    key: z.string().max(10),
    label: z.string().max(40),
    value: z.number(),
    /** Every game at this mark, newest first (at most five). */
    games: z.array(GameRefSchema).min(1).max(5),
    /** All games at this mark, when more than five. */
    count: z.number().int().positive(),
  })
  .strict();

export const LeaguePlayerResponseSchema = z
  .object({
    playerId: ResearchPlayerIdSchema,
    name: z.string().max(80),
    /** Archive coverage of this career and whether claims can be career-wide. */
    coverage: z
      .object({
        firstSeason: LeagueSeasonLabelSchema,
        lastSeason: LeagueSeasonLabelSchema,
        firstGame: z.iso.date(),
        lastGame: z.iso.date(),
        /** The first archived game falls in the archive's first season: earlier games may exist. */
        mayPredateArchive: z.boolean(),
        /** Archived seasons in which some of this player's team's box scores do not add up. */
        incompleteSeasons: z.array(
          z
            .object({
              season: LeagueSeasonLabelSchema,
              teamGamesAffected: z.number().int().positive(),
            })
            .strict(),
        ),
        /** True when no caveat above applies: the archive holds every box line of the career. */
        wholeCareer: z.boolean(),
      })
      .strict(),
    seasons: z.array(
      z
        .object({
          season: LeagueSeasonLabelSchema,
          age: z.number().nullable(),
          stints: z.array(
            z
              .object({
                team: LeagueTeamRefSchema,
                franchiseId: z.string().max(20),
                firstGame: z.iso.date(),
                lastGame: z.iso.date(),
                gamesPlayed: z.number().int().positive(),
                /** Team games from this stint's first to last appearance. */
                teamGamesInSpan: z.number().int().nonnegative(),
                points: z.number().nullable(),
                rebounds: z.number().nullable(),
                assists: z.number().nullable(),
                minutes: z.number().nullable(),
              })
              .strict(),
          ),
          playoffGames: z.number().int().nonnegative(),
          highs: z.array(MarkSchema),
          lows: z.array(MarkSchema),
        })
        .strict(),
    ),
    /** Archived seasons skipped between the first and last archived season. */
    gaps: z.array(LeagueSeasonLabelSchema),
    careerHighs: z
      .object({ regularSeason: z.array(MarkSchema), playoffs: z.array(MarkSchema) })
      .strict(),
    milestones: z.array(
      z
        .object({
          key: z.string().max(10),
          label: z.string().max(60),
          threshold: z.number().int().positive(),
          game: GameRefSchema,
          /** Counted from the archive's first game for this player, not necessarily the debut. */
          archiveCount: z.boolean(),
        })
        .strict(),
    ),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeaguePlayerResponse = z.infer<typeof LeaguePlayerResponseSchema>;

// ---- Rank movement ------------------------------------------------------------------------
export const LeagueMovementQuerySchema = z
  .object({
    season: LeagueSeasonLabelSchema.optional(),
    scope: LeagueScopeSchema.default('regular-season'),
    metric: z
      .enum(['points', 'rebounds', 'assists', 'steals', 'blocks', 'threesMade'])
      .default('points'),
    mode: z.enum(['totals', 'per-game']).default('per-game'),
    date: z.iso.date().optional(),
  })
  .strict();
export const LeagueMovementResponseSchema = z
  .object({
    query: z
      .object({
        season: LeagueSeasonLabelSchema,
        scope: LeagueScopeSchema,
        metric: z.string().max(20),
        mode: z.enum(['totals', 'per-game']),
        date: z.iso.date(),
      })
      .strict(),
    /** Every game date of the season. */
    dates: z.array(z.iso.date()),
    /** Leaders as of the chosen date, from games played through that date. */
    snapshot: z.array(
      z
        .object({
          rank: z.number().int().positive(),
          playerId: ResearchPlayerIdSchema,
          name: z.string().max(80),
          team: z.string().max(4),
          gamesPlayed: z.number().int().positive(),
          value: z.number(),
          /** Rank on the previous game date, or null if not ranked then. */
          previousRank: z.number().int().positive().nullable(),
        })
        .strict(),
    ),
    /** Rank on each date up to the chosen one, for the top ten on the chosen date. */
    trajectories: z.array(
      z
        .object({
          playerId: ResearchPlayerIdSchema,
          name: z.string().max(80),
          ranks: z.array(z.number().int().positive().nullable()),
        })
        .strict(),
    ),
    qualification: z.string().max(300),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueMovementResponse = z.infer<typeof LeagueMovementResponseSchema>;

// ---- Distributions and percentiles ----------------------------------------------------------
export const LeagueDistributionQuerySchema = z
  .object({
    season: LeagueSeasonLabelSchema.optional(),
    scope: LeagueScopeSchema.default('regular-season'),
    metric: LeagueLeaderMetricSchema.default('points'),
    player: ResearchPlayerIdSchema.optional(),
  })
  .strict();
export const LeagueDistributionResponseSchema = z
  .object({
    query: z
      .object({
        season: LeagueSeasonLabelSchema,
        scope: LeagueScopeSchema,
        metric: LeagueLeaderMetricSchema,
      })
      .strict(),
    definition: z.string().max(400),
    qualification: z.string().max(400),
    n: z.number().int().nonnegative(),
    summary: z
      .object({
        min: z.number(),
        q1: z.number(),
        median: z.number(),
        q3: z.number(),
        max: z.number(),
        mean: z.number(),
      })
      .strict()
      .nullable(),
    bins: z.array(
      z.object({ from: z.number(), to: z.number(), count: z.number().int() }).strict(),
    ),
    marker: z
      .object({
        playerId: ResearchPlayerIdSchema,
        name: z.string().max(80),
        value: z.number().nullable(),
        percentile: z.number().min(0).max(100).nullable(),
        rank: z.number().int().positive().nullable(),
        reason: z.string().max(200).nullable(),
      })
      .strict()
      .nullable(),
    /** The player's percentile in each category within the same qualified cohort. */
    profile: z.array(
      z
        .object({
          metric: LeagueLeaderMetricSchema,
          label: z.string().max(40),
          value: z.number().nullable(),
          percentile: z.number().min(0).max(100).nullable(),
          n: z.number().int().nonnegative(),
        })
        .strict(),
    ),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueDistributionResponse = z.infer<
  typeof LeagueDistributionResponseSchema
>;
