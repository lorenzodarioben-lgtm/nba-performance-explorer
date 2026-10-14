import { z } from 'zod';
import { CanonicalTeamIdSchema, DirectoryTeamSchema } from './team-directory.js';
import { ArchiveSeasonSchema, WikiAttributionSchema } from './wiki-archive.js';
import { DataProvenanceSchema } from './research.js';
import { GameDateSchema } from './player-game-log.js';

// Team-season intelligence and the standings race: both are derived only from the committed
// recorded 2023-24 regular-season archive, using games whose final score both team pages agree on.

export const RecordedTeamSeasonQuerySchema = z
  .object({
    season: ArchiveSeasonSchema.default('2023-24'),
    team: CanonicalTeamIdSchema,
  })
  .strict();
export type RecordedTeamSeasonQuery = z.infer<typeof RecordedTeamSeasonQuerySchema>;

const Conference = z.enum(['East', 'West']);
const count = z.number().int().min(0).max(82);

/** One entry of a team's source-listed 82-game schedule, in source calendar order. */
export const TeamSeasonGameSchema = z
  .object({
    gameNumber: z.number().int().min(1).max(82),
    id: z.string().regex(/^nba:00223\d{5}$/),
    date: GameDateSchema,
    opponent: DirectoryTeamSchema,
    opponentConference: Conference,
    location: z.enum(['home', 'away']),
    /** False when the two source team pages disagree or one page lacks the game. */
    verified: z.boolean(),
    teamScore: z.number().int().nonnegative().nullable(),
    opponentScore: z.number().int().nonnegative().nullable(),
    result: z.enum(['W', 'L']).nullable(),
    margin: z.number().int().nullable(),
    /** Overtime periods listed on this team's own source row. */
    overtime: z.number().int().min(0).max(6),
    /** Calendar days since the previous source-listed game; null for the first game. */
    restDays: z.number().int().min(0).max(30).nullable(),
    /** Observed record through this game, counting verified games only. */
    observedWins: z.number().int().min(0).max(82),
    observedLosses: z.number().int().min(0).max(82),
    /** Mean final margin over the last ten schedule games; null unless all ten are verified. */
    rollingMargin: z.number().finite().nullable(),
    recapUrl: z.string().url(),
  })
  .strict();
export type TeamSeasonGame = z.infer<typeof TeamSeasonGameSchema>;

export const TeamSeasonSplitKeySchema = z.enum([
  'all',
  'home',
  'away',
  'vs-east',
  'vs-west',
  'vs-winning',
  'vs-losing',
  'back-to-back',
  'one-day-rest',
  'two-plus-rest',
  'close',
  'decisive',
  'overtime',
  'month-10',
  'month-11',
  'month-12',
  'month-01',
  'month-02',
  'month-03',
  'month-04',
]);
export type TeamSeasonSplitKey = z.infer<typeof TeamSeasonSplitKeySchema>;

export const TeamSeasonSplitSchema = z
  .object({
    key: TeamSeasonSplitKeySchema,
    group: z.enum(['overall', 'venue', 'opponent', 'rest', 'margin', 'month']),
    label: z.string().max(60),
    definition: z.string().max(240),
    games: z.number().int().min(0).max(82),
    wins: z.number().int().min(0).max(82),
    losses: z.number().int().min(0).max(82),
    winPercentage: z.number().min(0).max(1).nullable(),
    pointsFor: z.number().finite().nullable(),
    pointsAgainst: z.number().finite().nullable(),
    marginPerGame: z.number().finite().nullable(),
    /** Fewer than five verified games: shown, but flagged as a small sample. */
    smallSample: z.boolean(),
  })
  .strict();
export type TeamSeasonSplit = z.infer<typeof TeamSeasonSplitSchema>;

export const TeamSeasonStreakSchema = z
  .object({
    kind: z.enum(['W', 'L']),
    length: z.number().int().min(1).max(82),
    fromGame: z.number().int().min(1).max(82),
    toGame: z.number().int().min(1).max(82),
    from: GameDateSchema,
    to: GameDateSchema,
  })
  .strict();

export const TeamSeasonOpponentSchema = z
  .object({
    opponent: DirectoryTeamSchema,
    conference: Conference,
    scheduled: z.number().int().min(1).max(5),
    verified: z.number().int().min(0).max(5),
    wins: z.number().int().min(0).max(5),
    losses: z.number().int().min(0).max(5),
    pointsFor: z.number().int().nonnegative(),
    pointsAgainst: z.number().int().nonnegative(),
    gameNumbers: z.array(z.number().int().min(1).max(82)).min(1).max(5),
  })
  .strict();

export const TeamSeasonMarginBinSchema = z
  .object({
    from: z.number().int(),
    to: z.number().int(),
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
  })
  .strict();

export const RecordedTeamSeasonResponseSchema = z
  .object({
    season: ArchiveSeasonSchema,
    scope: z.literal('regular-season'),
    officialStandings: z.literal(false),
    team: DirectoryTeamSchema,
    conference: Conference,
    /** True when every schedule date is distinct, so game order, rest and streaks are known. */
    chronologyKnown: z.boolean(),
    games: z.array(TeamSeasonGameSchema).length(82),
    verifiedGames: z.number().int().min(0).max(82),
    splits: z.array(TeamSeasonSplitSchema).max(TeamSeasonSplitKeySchema.options.length),
    longestWinStreak: TeamSeasonStreakSchema.nullable(),
    longestLosingStreak: TeamSeasonStreakSchema.nullable(),
    /** Streak runs end at an unverified game: a run is never bridged across one. */
    streakRuns: z.array(TeamSeasonStreakSchema).max(82),
    marginBins: z.array(TeamSeasonMarginBinSchema).max(40),
    opponents: z.array(TeamSeasonOpponentSchema).length(29),
    largestWins: z.array(z.number().int().min(1).max(82)).max(82),
    largestLosses: z.array(z.number().int().min(1).max(82)).max(82),
    snapshotCreatedAt: z.iso.datetime(),
    attribution: WikiAttributionSchema,
    conferenceSource: WikiAttributionSchema,
    provenance: DataProvenanceSchema,
  })
  .strict();
export type RecordedTeamSeasonResponse = z.infer<
  typeof RecordedTeamSeasonResponseSchema
>;

export const RecordedStandingsRaceQuerySchema = z
  .object({
    season: ArchiveSeasonSchema.default('2023-24'),
    conference: Conference.optional(),
  })
  .strict();
export type RecordedStandingsRaceQuery = z.infer<
  typeof RecordedStandingsRaceQuerySchema
>;

export const StandingsRaceTeamSchema = z
  .object({
    team: DirectoryTeamSchema,
    conference: Conference,
    /** Observed wins and losses through the end of each race date (same index as `dates`). */
    wins: z.array(count).max(200),
    losses: z.array(count).max(200),
    /** Source-listed games scheduled through each date, verified or not. */
    scheduled: z.array(count).max(200),
    quarantinedGameIds: z.array(z.string()).max(82),
  })
  .strict();

export const RecordedStandingsRaceResponseSchema = z
  .object({
    season: ArchiveSeasonSchema,
    scope: z.literal('regular-season'),
    officialStandings: z.literal(false),
    conference: Conference.nullable(),
    /** Every calendar date on which a verified game was played, ascending. */
    dates: z.array(GameDateSchema).min(1).max(200),
    teams: z.array(StandingsRaceTeamSchema).min(1).max(30),
    reconciledGames: z.number().int().nonnegative(),
    quarantinedGameIds: z.array(z.string()).max(100),
    snapshotCreatedAt: z.iso.datetime(),
    attributions: z.array(WikiAttributionSchema).length(30),
    conferenceSource: WikiAttributionSchema,
    provenance: DataProvenanceSchema,
  })
  .strict();
export type RecordedStandingsRaceResponse = z.infer<
  typeof RecordedStandingsRaceResponseSchema
>;
