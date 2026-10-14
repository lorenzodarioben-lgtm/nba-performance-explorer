import { z } from 'zod';
import { GameDateSchema } from './player-game-log.js';
import { ResearchPlayerIdSchema, DataProvenanceSchema } from './research.js';
import { CanonicalTeamIdSchema, DirectoryTeamSchema } from './team-directory.js';
export const ShotZoneSchema = z.enum([
  'Restricted Area',
  'In The Paint (Non-RA)',
  'Mid-Range',
  'Left Corner 3',
  'Right Corner 3',
  'Above the Break 3',
  'Backcourt',
]);
export const ShotGameIdSchema = z.string().regex(/^nba:00417\d{5}$/);
const integer = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d{1,4}$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));
export const ShotQuerySchema = z
  .object({
    season: z.literal('2017-18').default('2017-18'),
    scope: z.literal('playoffs').default('playoffs'),
    players: z
      .string()
      .transform((s) => s.split(','))
      .pipe(
        z
          .array(ResearchPlayerIdSchema)
          .min(1)
          .max(2)
          .refine((a) => new Set(a).size === a.length),
      )
      .optional(),
    team: CanonicalTeamIdSchema.optional(),
    opponent: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    game: ShotGameIdSchema.optional(),
    from: GameDateSchema.optional(),
    to: GameDateSchema.optional(),
    period: integer(1, 10).optional(),
    type: z.enum(['2PT', '3PT']).optional(),
    zone: ShotZoneSchema.optional(),
    result: z.enum(['made', 'missed']).optional(),
    minDistance: integer(0, 90).prefault('0'),
    maxDistance: integer(0, 90).prefault('90'),
    minAttempts: integer(1, 1000).prefault('10'),
    page: integer(1, 500).prefault('1'),
    pageSize: integer(1, 200).prefault('100'),
  })
  .strict()
  .refine(
    (q) => q.minDistance <= q.maxDistance && (!q.from || !q.to || q.from <= q.to),
  );
export type ShotQuery = z.infer<typeof ShotQuerySchema>;
export const ShotAttemptSchema = z
  .object({
    id: z.string().regex(/^nba:00417\d{5}:\d{1,5}$/),
    gameId: ShotGameIdSchema,
    eventId: z.number().int().positive(),
    playerId: ResearchPlayerIdSchema,
    playerName: z.string().min(1).max(100),
    team: DirectoryTeamSchema,
    home: DirectoryTeamSchema,
    away: DirectoryTeamSchema,
    date: GameDateSchema,
    period: z.number().int().min(1).max(10),
    minutesRemaining: z.number().int().min(0).max(12),
    secondsRemaining: z.number().int().min(0).max(59),
    type: z.enum(['2PT', '3PT']),
    made: z.boolean(),
    zone: ShotZoneSchema,
    area: z.string().min(1).max(80),
    range: z.string().min(1).max(80),
    action: z.string().min(1).max(100),
    distanceFeet: z.number().int().min(0).max(90),
    x: z.number().int().min(-250).max(250).nullable(),
    y: z.number().int().min(-53).max(888).nullable(),
  })
  .strict()
  .refine(
    (r) =>
      r.id === `${r.gameId}:${r.eventId}` &&
      r.home.id !== r.away.id &&
      [r.home.id, r.away.id].includes(r.team.id),
  );
export type ShotAttempt = z.infer<typeof ShotAttemptSchema>;
export const ShotSourceSchema = z
  .object({
    title: z.literal('NBA Playoff Shots 2018'),
    creator: z.literal('Boon P'),
    version: z.literal(1),
    url: z.literal(
      'https://www.kaggle.com/datasets/boonpalipatana/nba-playoff-shots-2018',
    ),
    licence: z.literal('CC0: Public Domain'),
    licenceUrl: z.literal('https://creativecommons.org/publicdomain/zero/1.0/'),
    sourceUpdatedAt: z.literal('2018-06-06T22:04:48.633Z'),
    retrievedAt: z.iso.datetime(),
    sha256: z.literal(
      '1e97afe9574d133e3f2e5db20130604605c10a6763b0516a58051aab78274cf6',
    ),
    originalSource: z.literal(
      'stats.nba.com; downloaded from public Kaggle dataset, no new NBA requests',
    ),
  })
  .strict();
const ratio = z.number().min(0).max(1).nullable();
const count = z.number().int().nonnegative();
const SummarySchema = z
  .object({
    attempts: count,
    makes: count,
    fgPercentage: ratio,
    efgPercentage: z.number().min(0).max(1.5).nullable(),
    pointsPerAttempt: z.number().min(0).max(3).nullable(),
  })
  .strict();
export const ShotGroupSchema = SummarySchema.extend({
  playerId: ResearchPlayerIdSchema.nullable(),
  label: z.string(),
  missingCoordinates: count,
  zones: z.array(SummarySchema.extend({ zone: ShotZoneSchema })).max(7),
  cells: z
    .array(
      z
        .object({
          x: z.number(),
          y: z.number(),
          attempts: count,
          makes: count,
          fgPercentage: ratio,
        })
        .strict(),
    )
    .max(250),
}).strict();
export const ShotResponseSchema = z
  .object({
    season: z.literal('2017-18'),
    scope: z.literal('playoffs'),
    source: ShotSourceSchema,
    provenance: DataProvenanceSchema,
    sourceAttempts: count,
    sourceGames: count,
    sourcePlayers: count,
    sourceTeams: count,
    sourceFrom: GameDateSchema,
    sourceTo: GameDateSchema,
    filteredAttempts: count,
    filteredGames: count,
    minAttempts: count,
    page: count,
    pageSize: count,
    shots: z.array(ShotAttemptSchema).max(200),
    groups: z.array(ShotGroupSchema).max(2),
    coordinateSystem: z.literal(
      'basket-origin; x left-to-right, y toward opposite end; 10 source units/foot; no home/away or period flips',
    ),
    coordinateEvidence: z.string().max(500),
  })
  .strict();
export type ShotResponse = z.infer<typeof ShotResponseSchema>;
export const ShotDirectorySchema = z
  .object({
    players: z
      .array(
        z
          .object({ id: ResearchPlayerIdSchema, name: z.string(), attempts: count })
          .strict(),
      )
      .max(250),
    teams: z.array(DirectoryTeamSchema).max(30),
    games: z
      .array(
        z
          .object({
            id: ShotGameIdSchema,
            date: GameDateSchema,
            home: DirectoryTeamSchema,
            away: DirectoryTeamSchema,
            attempts: count,
          })
          .strict(),
      )
      .max(100),
    source: ShotSourceSchema,
  })
  .strict();
export type ShotDirectory = z.infer<typeof ShotDirectorySchema>;
