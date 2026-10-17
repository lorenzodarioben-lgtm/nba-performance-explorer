import { z } from 'zod';
import { DirectoryTeamSchema } from './team-directory.js';
import {
  ArchiveGameSchema,
  ArchiveSeasonSchema,
  WikiAttributionSchema,
} from './wiki-archive.js';
import { DataProvenanceSchema } from './research.js';

// Playoff series and the bracket, derived only from the recorded 2024 playoff finals. A series is
// every recorded game between one pair of teams; a winner is named only when the recorded games
// show a team reaching four wins in its last game.

export const PlayoffBracketQuerySchema = z
  .object({ season: ArchiveSeasonSchema.default('2023-24') })
  .strict();

export const PlayoffSeriesGameSchema = z
  .object({
    game: ArchiveGameSchema,
    /** Order within the series by recorded date (1-7). */
    number: z.number().int().min(1).max(7),
    winner: DirectoryTeamSchema,
    /** Series wins for [teams[0], teams[1]] after this game. */
    after: z.tuple([z.number().int().min(0).max(4), z.number().int().min(0).max(4)]),
  })
  .strict();

export const PlayoffSeriesSchema = z
  .object({
    id: z.string().regex(/^r[1-4]-[A-Z]{3}-[A-Z]{3}$|^unplaced-[A-Z]{3}-[A-Z]{3}$/),
    /** 1 first round … 4 Finals; null when the two teams' series orders disagree. */
    round: z.number().int().min(1).max(4).nullable(),
    conference: z.enum(['East', 'West']).nullable(),
    /** Listed by abbreviation; the order implies nothing about seeding or home court. */
    teams: z.tuple([DirectoryTeamSchema, DirectoryTeamSchema]),
    wins: z.tuple([z.number().int().min(0).max(7), z.number().int().min(0).max(7)]),
    games: z.array(PlayoffSeriesGameSchema).min(1).max(7),
    status: z.enum(['decided', 'incomplete']),
    winner: DirectoryTeamSchema.nullable(),
    /** Series that produced each team in this one, for rounds after the first. */
    feeders: z.tuple([z.string().nullable(), z.string().nullable()]).nullable(),
    /** True when every game's NBA source ID encodes the same round as the derived round. */
    sourceIdRoundAgrees: z.boolean(),
    totalPoints: z.tuple([
      z.number().int().nonnegative(),
      z.number().int().nonnegative(),
    ]),
    overtimeGames: z.number().int().min(0).max(7),
    homeWins: z.number().int().min(0).max(7),
    /** Conference seeds for [teams[0], teams[1]] as published in the source's series headings. */
    seeds: z
      .tuple([z.number().int().min(1).max(10), z.number().int().min(1).max(10)])
      .nullable(),
  })
  .strict();
export type PlayoffSeries = z.infer<typeof PlayoffSeriesSchema>;

export const PlayoffBracketResponseSchema = z
  .object({
    season: ArchiveSeasonSchema,
    scope: z.literal('playoffs'),
    series: z.array(PlayoffSeriesSchema).max(20),
    /** True only when 15 decided series form a complete four-round tree. */
    complete: z.boolean(),
    champion: DirectoryTeamSchema.nullable(),
    recordedGames: z.number().int().min(0).max(150),
    issues: z.array(z.string().max(300)).max(30),
    /** Seeds come only from the source page's series headings and pass consistency checks. */
    seedsPublished: z.boolean(),
    attribution: WikiAttributionSchema,
    conferenceSource: WikiAttributionSchema,
    provenance: DataProvenanceSchema,
  })
  .strict();
export type PlayoffBracketResponse = z.infer<typeof PlayoffBracketResponseSchema>;

// ------------------------------------------------------------------ series film room

export const PlayoffSeriesIdSchema = z.string().regex(/^r[1-4]-[A-Z]{3}-[A-Z]{3}$/);

const pair = z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]);

/** One recorded game seen from the series: every number is from teams[0]'s side first. */
export const SeriesGameAnalysisSchema = z
  .object({
    gameId: z.string(),
    number: z.number().int().min(1).max(7),
    /** teams[0] points minus teams[1] points. */
    margin: z.number().int(),
    total: z.number().int().nonnegative(),
    homeTeamId: z.string(),
    winnerId: z.string(),
    /** Points per period and the running margin at the end of each period (teams[0] side). */
    periods: z
      .array(
        z
          .object({
            period: z.number().int().min(1).max(8),
            points: pair,
            cumulativeMargin: z.number().int(),
          })
          .strict(),
      )
      .min(4)
      .max(8),
    halves: z.object({ first: pair, second: pair, overtime: pair.nullable() }).strict(),
    /** The team ahead after three quarters went on to lose (quarter totals only). */
    wonFromBehindAfterThree: z.boolean(),
    clinching: z.boolean(),
  })
  .strict();
export type SeriesGameAnalysis = z.infer<typeof SeriesGameAnalysisSchema>;

export const SeriesAnalysisSchema = z
  .object({
    games: z.array(SeriesGameAnalysisSchema).min(1).max(7),
    /** Points by period across every recorded game; overtime periods combined. */
    periodTotals: z
      .array(
        z
          .object({ period: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'OT']), points: pair })
          .strict(),
      )
      .min(4)
      .max(5),
    pointsPerGame: z.tuple([z.number().nonnegative(), z.number().nonnegative()]),
    averageMargin: z.number(),
    averageTotal: z.number().nonnegative(),
    /** Smallest absolute final margin; every game that shares it. */
    closest: z
      .object({
        margin: z.number().int().nonnegative(),
        gameIds: z.array(z.string()).min(1),
      })
      .strict(),
    /** Largest absolute final margin; the earliest game when tied. */
    largest: z
      .object({
        margin: z.number().int().nonnegative(),
        gameId: z.string(),
        winnerId: z.string(),
      })
      .strict(),
    /** The period with the widest combined scoring gap across the series (teams[0] side); descriptive, not causal. */
    widestPeriod: z
      .object({
        period: z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'OT']),
        margin: z.number().int(),
      })
      .strict(),
    comebacksAfterThree: z.number().int().min(0).max(7),
  })
  .strict();
export type SeriesAnalysis = z.infer<typeof SeriesAnalysisSchema>;

export const PlayoffSeriesFilmRoomResponseSchema = z
  .object({
    season: ArchiveSeasonSchema,
    scope: z.literal('playoffs'),
    series: PlayoffSeriesSchema,
    analysis: SeriesAnalysisSchema,
    /** The series each team arrived from, and the one the winner went on to. */
    previous: z.tuple([z.string().nullable(), z.string().nullable()]),
    next: z.string().nullable(),
    champion: DirectoryTeamSchema.nullable(),
    seedsPublished: z.boolean(),
    attribution: WikiAttributionSchema,
    conferenceSource: WikiAttributionSchema,
    provenance: DataProvenanceSchema,
  })
  .strict();
export type PlayoffSeriesFilmRoomResponse = z.infer<
  typeof PlayoffSeriesFilmRoomResponseSchema
>;
