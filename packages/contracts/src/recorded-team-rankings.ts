import { z } from 'zod';
import { ArchiveSeasonSchema, WikiAttributionSchema } from './wiki-archive.js';
import { DirectoryTeamSchema } from './team-directory.js';
import { DataProvenanceSchema } from './research.js';
import { GameDateSchema } from './player-game-log.js';
export const TeamRankingMetricSchema = z.enum([
  'winPercentage',
  'pointsPerGame',
  'opponentPointsPerGame',
  'finalMarginPerGame',
  'lastTenWins',
]);
export const RecordedTeamRankingsQuerySchema = z
  .object({
    season: ArchiveSeasonSchema.default('2023-24'),
    conference: z.enum(['East', 'West']).optional(),
    metric: TeamRankingMetricSchema.default('winPercentage'),
    order: z.enum(['asc', 'desc']).default('desc'),
    minGames: z
      .string()
      .regex(/^\d{1,2}$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(82))
      .prefault('1'),
    completeOnly: z.enum(['true', 'false']).default('false'),
    search: z.string().trim().max(100).optional(),
  })
  .strict();
export type RecordedTeamRankingsQuery = z.infer<typeof RecordedTeamRankingsQuerySchema>;
const record = z
  .object({
    games: z.number().int().nonnegative(),
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
  })
  .strict()
  .refine((r) => r.games === r.wins + r.losses);
export const RecordedTeamSummarySchema = z
  .object({
    team: DirectoryTeamSchema,
    conference: z.enum(['East', 'West']),
    observedGames: z.number().int().min(0).max(82),
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
    completeSeason: z.boolean(),
    missingGameIds: z.array(z.string().regex(/^nba:00223\d{5}$/)).max(82),
    winPercentage: z.number().min(0).max(1).nullable(),
    pointsPerGame: z.number().nonnegative().nullable(),
    opponentPointsPerGame: z.number().nonnegative().nullable(),
    finalMarginPerGame: z.number().nullable(),
    home: record,
    away: record,
    lastTen: z
      .object({
        expectedGames: z.number().int().min(0).max(10),
        observedGames: z.number().int().min(0).max(10),
        complete: z.boolean(),
        wins: z.number().int().nonnegative().nullable(),
        losses: z.number().int().nonnegative().nullable(),
        from: GameDateSchema.nullable(),
        to: GameDateSchema.nullable(),
      })
      .strict(),
    streak: z
      .object({
        kind: z.enum(['W', 'L']).nullable(),
        length: z.number().int().positive().nullable(),
        through: GameDateSchema.nullable(),
      })
      .strict(),
    source: WikiAttributionSchema,
  })
  .strict()
  .refine(
    (r) =>
      r.observedGames === r.wins + r.losses &&
      r.home.games + r.away.games === r.observedGames &&
      r.completeSeason === (r.observedGames === 82 && r.missingGameIds.length === 0),
  );
export type RecordedTeamSummary = z.infer<typeof RecordedTeamSummarySchema>;
export const RecordedTeamRankingsResponseSchema = z
  .object({
    season: ArchiveSeasonSchema,
    scope: z.literal('regular-season'),
    officialStandings: z.literal(false),
    metric: TeamRankingMetricSchema,
    order: z.enum(['asc', 'desc']),
    minGames: z.number().int().positive(),
    completeOnly: z.boolean(),
    conference: z.enum(['East', 'West']).nullable(),
    rows: z
      .array(
        RecordedTeamSummarySchema.safeExtend({
          rank: z.number().int().positive(),
          value: z.number().finite(),
        }),
      )
      .max(30),
    rankingPopulation: z.number().int().min(0).max(30),
    belowMinimumTeams: z.number().int().nonnegative(),
    incompleteExcludedTeams: z.number().int().nonnegative(),
    missingMetricTeams: z.number().int().nonnegative(),
    reconciledGames: z.number().int().nonnegative(),
    quarantinedGameIds: z.array(z.string()).max(100),
    snapshotCreatedAt: z.iso.datetime(),
    attributions: z.array(WikiAttributionSchema).length(30),
    conferenceSource: WikiAttributionSchema,
    provenance: DataProvenanceSchema,
  })
  .strict();
export type RecordedTeamRankingsResponse = z.infer<
  typeof RecordedTeamRankingsResponseSchema
>;
