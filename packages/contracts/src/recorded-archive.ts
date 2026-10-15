import { z } from 'zod';
import {
  ArchiveRosterMemberSchema,
  ArchiveParticipantStatsSchema,
  ArchiveTeamResultSchema,
} from './team-archive.js';
import { DirectoryTeamSchema, CanonicalTeamIdSchema } from './team-directory.js';
import {
  RecordedSeasonSchema,
  WikiAttributionSchema,
  regularGamePrefix,
} from './wiki-archive.js';
import { DataProvenanceSchema, ResearchPlayerIdSchema } from './research.js';
export const RecordedTeamSchema = z
  .object({
    team: DirectoryTeamSchema,
    season: RecordedSeasonSchema,
    roster: z.array(ArchiveRosterMemberSchema).min(1).max(40),
    statistics: z
      .object({
        'regular-season': z.array(ArchiveParticipantStatsSchema).max(40),
        playoffs: z.array(ArchiveParticipantStatsSchema).max(40),
        'source-unspecified': z.array(ArchiveParticipantStatsSchema).max(40),
      })
      .strict(),
    results: z.array(ArchiveTeamResultSchema).length(82),
    attribution: WikiAttributionSchema,
    retrievedAt: z.iso.datetime(),
  })
  .strict()
  .refine(
    (d) =>
      new Set(d.results.map((g) => g.sourceId)).size === 82 &&
      d.results.every((g) => g.opponent.id !== d.team.id) &&
      // Every game ID must belong to the snapshot's own season (00222… for 2022-23).
      d.results.every((g) => g.sourceId.startsWith(regularGamePrefix(d.season))),
  );
export const RecordedDatasetSchema = z
  .object({
    kind: z.literal('genuine-recorded-wikipedia-data'),
    season: RecordedSeasonSchema,
    createdAt: z.iso.datetime(),
    sourcePolicy: z.string().max(200),
    identityRequests: z.number().int().min(0).max(20),
    articleIdentities: z.number().int().nonnegative(),
    mappedArticleIdentities: z.number().int().nonnegative(),
    snapshots: z.array(RecordedTeamSchema).length(30),
  })
  .strict()
  .refine((d) => new Set(d.snapshots.map((s) => s.team.id)).size === 30);
export type RecordedDataset = z.infer<typeof RecordedDatasetSchema>;
export const ArchiveRankingMetricSchema = z.enum([
  'gamesPlayed',
  'minutesPerGame',
  'pointsPerGame',
  'reboundsPerGame',
  'assistsPerGame',
  'stealsPerGame',
  'blocksPerGame',
  'fieldGoalPercentage',
  'threePointPercentage',
  'freeThrowPercentage',
  'points',
  'rebounds',
  'assists',
  'steals',
  'blocks',
]);
export const ArchiveRankingQuerySchema = z
  .object({
    season: RecordedSeasonSchema.default('2023-24'),
    scope: z.enum(['regular-season', 'playoffs']).default('regular-season'),
    metric: ArchiveRankingMetricSchema.default('pointsPerGame'),
    minGames: z
      .string()
      .regex(/^\d{1,3}$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(150))
      .prefault('20'),
    team: CanonicalTeamIdSchema.optional(),
    search: z.string().max(100).optional(),
    page: z
      .string()
      .regex(/^\d{1,2}$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(99))
      .prefault('1'),
    pageSize: z
      .string()
      .regex(/^\d{1,2}$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(50))
      .prefault('25'),
  })
  .strict();
export type ArchiveRankingQuery = z.infer<typeof ArchiveRankingQuerySchema>;
export const ArchiveRankingRowSchema = z
  .object({
    playerId: ResearchPlayerIdSchema,
    name: z.string().min(1).max(100),
    teams: z.array(DirectoryTeamSchema).min(1).max(10),
    gamesPlayed: z.number().int().nonnegative(),
    value: z.number().finite().nonnegative(),
    rank: z.number().int().positive(),
    percentile: z.number().min(0).max(100),
    sources: z.array(WikiAttributionSchema).min(1).max(10),
  })
  .strict();
export const ArchiveRankingResponseSchema = z
  .object({
    query: z
      .object({
        season: RecordedSeasonSchema,
        scope: z.enum(['regular-season', 'playoffs']),
        metric: ArchiveRankingMetricSchema,
        minGames: z.number().int().positive(),
        team: CanonicalTeamIdSchema.optional(),
        search: z.string().optional(),
        page: z.number().int().positive(),
        pageSize: z.number().int().positive(),
      })
      .strict(),
    rows: z.array(ArchiveRankingRowSchema).max(50),
    total: z.number().int().nonnegative(),
    qualifiedPopulation: z.number().int().nonnegative(),
    sourceRows: z.number().int().nonnegative(),
    sourceTeams: z.number().int().min(0).max(30),
    missingIdentityRows: z.number().int().nonnegative(),
    missingMetricPlayers: z.number().int().nonnegative(),
    belowMinimumPlayers: z.number().int().nonnegative(),
    unknownScopeRows: z.number().int().nonnegative(),
    snapshotCreatedAt: z.iso.datetime(),
    sourceFetchedFrom: z.iso.datetime(),
    sourceFetchedTo: z.iso.datetime(),
    attributions: z.array(WikiAttributionSchema).length(30),
    provenance: DataProvenanceSchema,
  })
  .strict();
export type ArchiveRankingResponse = z.infer<typeof ArchiveRankingResponseSchema>;
export const VerifiedRecordedGameSchema = z
  .object({
    id: z.string().regex(/^nba:002(?:22|23)\d{5}$/),
    date: ArchiveTeamResultSchema.shape.date,
    home: DirectoryTeamSchema,
    away: DirectoryTeamSchema,
    homeScore: z.number().int().nonnegative(),
    awayScore: z.number().int().nonnegative(),
    recapUrl: ArchiveTeamResultSchema.shape.recapUrl,
    sources: z.array(WikiAttributionSchema).length(2),
  })
  .strict();
export const RecordedRecordMetricSchema = z.enum([
  'teamPoints',
  'finalMargin',
  'combinedPoints',
]);
export const RecordedRecordsQuerySchema = z
  .object({
    season: RecordedSeasonSchema.default('2023-24'),
    team: CanonicalTeamIdSchema.optional(),
    metric: RecordedRecordMetricSchema.default('teamPoints'),
  })
  .strict();
export const RecordedRecordsResponseSchema = z
  .object({
    season: RecordedSeasonSchema,
    metric: RecordedRecordMetricSchema,
    team: CanonicalTeamIdSchema.nullable(),
    value: z.number().nonnegative().nullable(),
    games: z.array(VerifiedRecordedGameSchema).max(100),
    matchingSourceGames: z.number().int().nonnegative(),
    reconciledGames: z.number().int().nonnegative(),
    conflictingGameIds: z.array(z.string()).max(100),
    unpairedGameIds: z.array(z.string()).max(100),
    snapshotCreatedAt: z.iso.datetime(),
    attributions: z.array(WikiAttributionSchema).length(30),
    provenance: DataProvenanceSchema,
  })
  .strict();
export type VerifiedRecordedGame = z.infer<typeof VerifiedRecordedGameSchema>;
export type RecordedRecordsResponse = z.infer<typeof RecordedRecordsResponseSchema>;
