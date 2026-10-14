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
