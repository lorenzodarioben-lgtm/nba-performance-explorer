import { z } from 'zod';
import { ResearchPlayerIdSchema, DataProvenanceSchema } from './research.js';
import { DirectoryTeamSchema, CanonicalTeamIdSchema } from './team-directory.js';
import { ArchiveSeasonSchema, WikiAttributionSchema } from './wiki-archive.js';
import { VerifiedRecordedGameSchema } from './recorded-archive.js';
export const RecordedDirectorySchema = z
  .object({
    season: ArchiveSeasonSchema,
    teams: z.array(DirectoryTeamSchema).length(30),
    players: z
      .array(
        z
          .object({
            playerId: ResearchPlayerIdSchema,
            name: z.string().min(1).max(100),
            teams: z.array(DirectoryTeamSchema).min(1).max(30),
          })
          .strict(),
      )
      .max(650),
    attributions: z.array(WikiAttributionSchema).length(30),
    provenance: DataProvenanceSchema,
  })
  .strict();
export const HypotheticalQuerySchema = z
  .object({
    season: ArchiveSeasonSchema.default('2023-24'),
    scope: z.enum(['regular-season', 'playoffs']).default('regular-season'),
    players: z
      .string()
      .max(69)
      .transform((s) => s.split(','))
      .pipe(
        z
          .array(ResearchPlayerIdSchema)
          .length(5)
          .refine((ids) => new Set(ids).size === 5),
      ),
  })
  .strict();
const value = z.number().finite().nonnegative().nullable();
export const HypotheticalGroupSchema = z
  .object({
    kind: z.literal('hypothetical'),
    season: ArchiveSeasonSchema,
    scope: z.enum(['regular-season', 'playoffs']),
    observedLineup: z.literal(false),
    jointPerformance: z.null(),
    members: z
      .array(
        z
          .object({
            playerId: ResearchPlayerIdSchema,
            name: z.string().nullable(),
            status: z.enum([
              'available',
              'scope-records-unavailable',
              'identity-unavailable',
            ]),
            teams: z.array(DirectoryTeamSchema).max(30),
            gamesPlayed: z.number().int().nonnegative().nullable(),
            pointsPerGame: value,
            reboundsPerGame: value,
            assistsPerGame: value,
            individualRecordedPoints: value,
            sources: z.array(WikiAttributionSchema).max(10),
          })
          .strict(),
      )
      .length(5),
    sumOfIndividualRecordedPoints: value,
    availableMembers: z.number().int().min(0).max(5),
    provenance: DataProvenanceSchema,
  })
  .strict();
export type HypotheticalGroup = z.infer<typeof HypotheticalGroupSchema>;
export const RecordedTeamComparisonQuerySchema = z
  .object({
    season: ArchiveSeasonSchema.default('2023-24'),
    teams: z
      .string()
      .max(57)
      .transform((s) => s.split(','))
      .pipe(
        z
          .array(CanonicalTeamIdSchema)
          .length(2)
          .refine((ids) => new Set(ids).size === 2),
      ),
  })
  .strict();
export const RecordedTeamComparisonSchema = z
  .object({
    season: ArchiveSeasonSchema,
    scope: z.literal('regular-season'),
    rows: z
      .array(
        z
          .object({
            team: DirectoryTeamSchema,
            observedGames: z.number().int().nonnegative(),
            wins: z.number().int().nonnegative(),
            losses: z.number().int().nonnegative(),
            winPercentage: value,
            pointsPerGame: value,
            opponentPointsPerGame: value,
            finalMarginPerGame: z.number().finite().nullable(),
            source: WikiAttributionSchema,
          })
          .strict(),
      )
      .length(2),
    headToHead: z.array(VerifiedRecordedGameSchema).max(10),
    quarantinedGameIds: z.array(z.string()).max(100),
    provenance: DataProvenanceSchema,
  })
  .strict();
export type RecordedTeamComparison = z.infer<typeof RecordedTeamComparisonSchema>;
