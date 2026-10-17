import { z } from 'zod';
import {
  ArchiveRankingQuerySchema,
  ArchiveRankingMetricSchema,
  VerifiedRecordedGameSchema,
} from './recorded-archive.js';
import { ResearchPlayerIdSchema, DataProvenanceSchema } from './research.js';
import { WikiAttributionSchema, RecordedSeasonSchema } from './wiki-archive.js';
import { DistributionSchema } from './recorded-analytics.js';
import { CanonicalTeamIdSchema } from './team-directory.js';
import { GameDateSchema } from './player-game-log.js';
const threshold = z
  .string()
  .regex(/^\d{1,8}(?:\.\d{1,3})?$/)
  .transform(Number)
  .pipe(z.number().min(0).max(10_000_000));
export const RecordedDiscoveryQuerySchema = ArchiveRankingQuerySchema.omit({
  metric: true,
  search: true,
  team: true,
  page: true,
  pageSize: true,
})
  .extend({
    x: ArchiveRankingMetricSchema.default('pointsPerGame'),
    y: ArchiveRankingMetricSchema.default('reboundsPerGame'),
    mode: z.enum(['neighbors', 'thresholds']).default('neighbors'),
    target: ResearchPlayerIdSchema.optional(),
    maxX: threshold.prefault('15'),
    minY: threshold.prefault('8'),
    limit: z
      .string()
      .regex(/^\d{1,2}$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(50))
      .prefault('20'),
  })
  .strict()
  .refine((q) => q.x !== q.y);
export type RecordedDiscoveryQuery = z.infer<typeof RecordedDiscoveryQuerySchema>;
const base = z
  .object({
    playerId: ResearchPlayerIdSchema,
    name: z.string(),
    gamesPlayed: z.number().int().nonnegative(),
    x: z.number(),
    y: z.number(),
    zX: z.number(),
    zY: z.number(),
  })
  .strict();
export const RecordedDiscoveryResponseSchema = z
  .object({
    season: RecordedSeasonSchema,
    scope: z.enum(['regular-season', 'playoffs']),
    mode: z.enum(['neighbors', 'thresholds']),
    x: ArchiveRankingMetricSchema,
    y: ArchiveRankingMetricSchema,
    minGames: z.number().int().positive(),
    maxX: z.number(),
    minY: z.number(),
    limit: z.number().int().positive(),
    target: ResearchPlayerIdSchema.nullable(),
    targetAvailable: z.boolean(),
    targetRow: base.nullable(),
    rows: z
      .array(
        base.extend({
          rank: z.number().int().positive(),
          distance: z.number().nonnegative().nullable(),
          xSquaredDifference: z.number().nonnegative().nullable(),
          ySquaredDifference: z.number().nonnegative().nullable(),
        }),
      )
      .max(50),
    totalMatches: z.number().int().nonnegative(),
    eligiblePool: z
      .array(z.object({ playerId: ResearchPlayerIdSchema, name: z.string() }).strict())
      .max(650),
    xDistribution: DistributionSchema,
    yDistribution: DistributionSchema,
    sourceRows: z.number().int().nonnegative(),
    unknownScopeRows: z.number().int().nonnegative(),
    snapshotCreatedAt: z.iso.datetime(),
    attributions: z.array(WikiAttributionSchema).length(30),
    provenance: DataProvenanceSchema,
  })
  .strict();
export type RecordedDiscoveryResponse = z.infer<typeof RecordedDiscoveryResponseSchema>;
export const MonthDaySchema = z
  .string()
  .regex(/^\d{2}-\d{2}$/)
  .refine((day) => GameDateSchema.safeParse(`2000-${day}`).success);
export const RecordedCalendarQuerySchema = z
  .object({
    season: RecordedSeasonSchema.default('2023-24'),
    day: MonthDaySchema,
    team: CanonicalTeamIdSchema.optional(),
  })
  .strict();
export type RecordedCalendarQuery = z.infer<typeof RecordedCalendarQuerySchema>;
export const RecordedCalendarResponseSchema = z
  .object({
    season: RecordedSeasonSchema,
    day: MonthDaySchema,
    team: CanonicalTeamIdSchema.nullable(),
    games: z.array(VerifiedRecordedGameSchema).max(30),
    reconciledGames: z.number().int().nonnegative(),
    quarantinedGameIds: z.array(z.string()).max(100),
    snapshotCreatedAt: z.iso.datetime(),
    attributions: z.array(WikiAttributionSchema).length(30),
    provenance: DataProvenanceSchema,
  })
  .strict();
export type RecordedCalendarResponse = z.infer<typeof RecordedCalendarResponseSchema>;
