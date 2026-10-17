import { z } from 'zod';
import { DataProvenanceSchema } from './research.js';
import { DirectoryTeamSchema, CanonicalTeamIdSchema } from './team-directory.js';
import { GameDateSchema } from './player-game-log.js';
export const StudyPersonIdSchema = z.string().regex(/^br:[a-z]{2,8}\d{2}$/);
export const StudyLineupIdSchema = z.string().regex(/^study:[A-Z]{3}_2017_\d{1,5}$/);
const gameId = z.string().regex(/^nba:00217\d{5}$/);
export const StudySourceSchema = z
  .object({
    doi: z.literal('10.57745/9NVFIQ'),
    creator: z.literal('Arnaud Odet'),
    title: z.string(),
    licence: z.literal('Etalab Open License 2.0'),
    licenceUrl: z.literal('https://spdx.org/licenses/etalab-2.0.html'),
    datasetVersion: z.literal('1.0'),
    sourceUpdatedAt: z.iso.datetime().nullable(),
    sourceReleasedAt: z.iso.datetime().nullable(),
    retrievedAt: z.iso.datetime(),
    archiveMd5: z.literal('dee0454ff932339714192c4031006972'),
    statisticsFile: z.literal('data/preproc_data/stats/2017-18.csv'),
    statisticsSha256: z.literal(
      '8a3f45fe2a241aa1ae0586bacd6b72b2ef2d74dfb756904ddbcdb230a7d598a6',
    ),
    gameIdentityFile: z.literal('data/preproc_data/starting_lineups/2017-18.csv'),
    gameIdentitySha256: z.literal(
      '6bdf0095602897595a1a292203d8f0de559a6c261420f9b874372c6b2051c283',
    ),
    reportedQuarterRows: z.literal(50237),
    sourceRegularGames: z.literal(1230),
    sourceLineups: z.literal(13869),
    verifiedQuarterSideGroups: z.number().int().positive(),
  })
  .strict();
const person = z
  .object({
    id: StudyPersonIdSchema,
    aliases: z.array(z.string().min(1).max(80)).min(1).max(10),
  })
  .strict();
const game = z
  .object({
    id: gameId,
    sourceKey: z.string().regex(/^\d{4}-\d{2}-\d{2}_[A-Z]{3}_vs_[A-Z]{3}$/),
    date: GameDateSchema,
    home: z.string().regex(/^[A-Z]{3}$/),
    away: z.string().regex(/^[A-Z]{3}$/),
    url: z
      .string()
      .regex(
        /^https:\/\/www\.nba\.com\/game\/[a-z]{3}-vs-[a-z]{3}-00217\d{5}\/box-score$/,
      ),
    periods: z.number().int().min(4).max(10),
    durationSeconds: z.number().int().positive(),
  })
  .strict()
  .refine(
    (g) =>
      g.home !== g.away &&
      g.durationSeconds === 2880 + 300 * (g.periods - 4) &&
      g.sourceKey === `${g.date}_${g.home}_vs_${g.away}` &&
      g.url.includes(g.id.slice(4)),
  );
const nativeLineup = z
  .object({
    id: StudyLineupIdSchema,
    sourceId: z.string(),
    team: z.string().regex(/^[A-Z]{3}$/),
    members: z
      .array(StudyPersonIdSchema)
      .length(5)
      .refine((a) => new Set(a).size === 5),
    seconds: z.number().int().positive(),
    plusMinus: z.number().int(),
    quarterRows: z.number().int().positive(),
    games: z
      .array(gameId)
      .min(1)
      .max(82)
      .refine((a) => new Set(a).size === a.length),
  })
  .strict()
  .refine(
    (r) => r.id === `study:${r.sourceId}` && r.sourceId.startsWith(`${r.team}_2017_`),
  );
export const LineupStudyDatasetSchema = z
  .object({
    version: z.literal(1),
    kind: z.literal('researcher-reconstructed-quarter-lineups'),
    season: z.literal('2017-18'),
    scope: z.literal('regular-season'),
    source: StudySourceSchema,
    people: z.array(person).length(540),
    games: z.array(game).length(1229),
    lineups: z.array(nativeLineup).length(13867),
    quarantinedGames: z
      .array(
        z
          .object({
            id: gameId,
            sourceKey: z.string(),
            reportedPeriods: z.array(z.number().int()),
            reason: z.literal('missing-contiguous-source-periods'),
          })
          .strict(),
      )
      .length(1),
    quarantinedOnlyLineupIds: z.array(StudyLineupIdSchema).length(2),
  })
  .strict();
export type LineupStudyDataset = z.infer<typeof LineupStudyDatasetSchema>;
const integer = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d{1,4}$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));
export const StudyLineupQuerySchema = z
  .object({
    season: z.literal('2017-18').default('2017-18'),
    scope: z.literal('regular-season').default('regular-season'),
    team: CanonicalTeamIdSchema.optional(),
    members: z
      .string()
      .max(100)
      .transform((s) => s.split(','))
      .pipe(
        z
          .array(StudyPersonIdSchema)
          .min(1)
          .max(5)
          .refine((a) => new Set(a).size === a.length),
      )
      .optional(),
    minMinutes: integer(0, 2000).prefault('30'),
    sort: z
      .enum(['minutes', 'plusMinus', 'plusMinusPer48', 'games'])
      .default('minutes'),
    order: z.enum(['asc', 'desc']).default('desc'),
    page: integer(1, 1000).prefault('1'),
    pageSize: integer(1, 50).prefault('25'),
    compare: z
      .string()
      .max(100)
      .transform((s) => s.split(','))
      .pipe(
        z
          .array(StudyLineupIdSchema)
          .length(2)
          .refine((a) => a[0] !== a[1]),
      )
      .optional(),
  })
  .strict();
export type StudyLineupQuery = z.infer<typeof StudyLineupQuerySchema>;
export const StudyLineupRowSchema = z
  .object({
    id: StudyLineupIdSchema,
    team: DirectoryTeamSchema,
    members: z
      .array(
        person.extend({
          nbaPlayerId: z.null(),
          sourceUrl: z
            .string()
            .regex(
              /^https:\/\/www\.basketball-reference\.com\/players\/[a-z]\/[a-z]{2,8}\d{2}\.html$/,
            ),
        }),
      )
      .length(5),
    secondsTogether: z.number().int().positive(),
    minutesTogether: z.number().positive(),
    plusMinus: z.number().int(),
    plusMinusPer48: z.number().nullable(),
    observedGames: z.number().int().positive(),
    games: z
      .array(
        z.object({ id: gameId, date: GameDateSchema, url: game.shape.url }).strict(),
      )
      .min(1)
      .max(82),
    reportedQuarterRows: z.number().int().positive(),
    qualified: z.boolean(),
    possessions: z.null(),
    offensiveRating: z.null(),
    defensiveRating: z.null(),
    netRating: z.null(),
    basis: z.literal(
      'researcher-reconstructed from substitution records; source quarter reports, not official independently verified lineup events',
    ),
  })
  .strict();
export type StudyLineupRow = z.infer<typeof StudyLineupRowSchema>;
export const StudyDirectorySchema = z
  .object({
    season: z.literal('2017-18'),
    people: z.array(person).length(540),
    teams: z.array(DirectoryTeamSchema).length(30),
    source: StudySourceSchema,
  })
  .strict();
export const StudyLineupResponseSchema = z
  .object({
    season: z.literal('2017-18'),
    scope: z.literal('regular-season'),
    rows: z.array(StudyLineupRowSchema).max(50),
    comparison: z.array(StudyLineupRowSchema).max(2),
    total: z.number().int().nonnegative(),
    minMinutes: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    usableGames: z.literal(1229),
    usableLineups: z.literal(13867),
    source: StudySourceSchema,
    quarantinedGames: LineupStudyDatasetSchema.shape.quarantinedGames,
    quarantinedOnlyLineupIds: LineupStudyDatasetSchema.shape.quarantinedOnlyLineupIds,
    provenance: DataProvenanceSchema,
  })
  .strict();
export type StudyLineupResponse = z.infer<typeof StudyLineupResponseSchema>;
