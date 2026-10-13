import { z } from 'zod';
import { DirectoryTeamSchema } from './team-directory.js';
import { GameDateSchema } from './player-game-log.js';
import { DataProvenanceSchema, ResearchPlayerIdSchema } from './research.js';
import { ArchiveSeasonSchema, WikiAttributionSchema } from './wiki-archive.js';
export const WikiArticleUrlSchema = z
  .string()
  .regex(/^https:\/\/en\.wikipedia\.org\/wiki\/[\w%()'.-]+$/);
const playerIdentity = {
  name: z.string().min(1).max(100),
  articleUrl: WikiArticleUrlSchema.nullable(),
  nbaPlayerId: ResearchPlayerIdSchema.nullable(),
  identityUrl: z
    .string()
    .regex(/^https:\/\/www\.wikidata\.org\/wiki\/Q[1-9]\d{0,11}$/)
    .nullable(),
};
export const ArchiveRosterMemberSchema = z
  .object({
    ...playerIdentity,
    position: z.string().regex(/^[A-Z/ -]{1,15}$/),
    number: z.string().max(8).nullable(),
    birthDate: GameDateSchema.nullable(),
    ageOnOctober1: z.number().int().min(0).max(100).nullable(),
  })
  .strict();
const count = z.number().int().min(0).max(82),
  average = z.number().min(0).max(100).nullable(),
  ratio = z.number().min(0).max(1).nullable();
export const ArchiveParticipantStatsSchema = z
  .object({
    ...playerIdentity,
    gamesPlayed: count,
    gamesStarted: count.nullable(),
    minutesPerGame: average,
    fieldGoalPercentage: ratio,
    threePointPercentage: ratio,
    freeThrowPercentage: ratio,
    reboundsPerGame: average,
    assistsPerGame: average,
    stealsPerGame: average,
    blocksPerGame: average,
    pointsPerGame: average,
    valueBasis: z
      .enum(['published-per-game', 'derived-from-raw-totals'])
      .default('published-per-game'),
    rawTotals: z
      .object({
        minutes: z.number().nonnegative(),
        rebounds: z.number().int().nonnegative(),
        assists: z.number().int().nonnegative(),
        steals: z.number().int().nonnegative(),
        blocks: z.number().int().nonnegative(),
        points: z.number().int().nonnegative(),
      })
      .strict()
      .nullable()
      .default(null),
  })
  .strict()
  .refine((r) => r.gamesStarted === null || r.gamesStarted <= r.gamesPlayed);
export const ArchiveTeamResultSchema = z
  .object({
    sourceId: z.string().regex(/^00223\d{5}$/),
    date: GameDateSchema,
    opponent: DirectoryTeamSchema,
    location: z.enum(['home', 'away']),
    result: z.enum(['W', 'L']),
    teamScore: z.number().int().nonnegative(),
    opponentScore: z.number().int().nonnegative(),
    overtime: z.number().int().min(0).max(6),
    locationLabel: z.string().max(150).nullable(),
    recapUrl: z
      .string()
      .regex(
        /^https:\/\/www\.nba\.com\/game\/(?:[a-z0-9-]*-)?00223\d{5}(?:\/box-score)?$/,
      ),
  })
  .strict()
  .refine(
    (g) =>
      g.recapUrl.includes(g.sourceId) &&
      g.teamScore !== g.opponentScore &&
      g.teamScore > g.opponentScore === (g.result === 'W'),
  );
export const TeamArchiveResponseSchema = z
  .object({
    team: DirectoryTeamSchema,
    season: ArchiveSeasonSchema,
    roster: z.array(ArchiveRosterMemberSchema).min(1).max(40),
    statistics: z
      .object({
        'regular-season': z.array(ArchiveParticipantStatsSchema).max(40),
        playoffs: z.array(ArchiveParticipantStatsSchema).max(40),
        'source-unspecified': z
          .array(ArchiveParticipantStatsSchema)
          .max(40)
          .default([]),
      })
      .strict(),
    results: z.array(ArchiveTeamResultSchema).length(82),
    identityStatus: z.enum(['available', 'unavailable']),
    identityRetrievedAt: z.iso.datetime().nullable(),
    attribution: WikiAttributionSchema,
    provenance: DataProvenanceSchema,
  })
  .strict()
  .refine(
    (data) =>
      new Set(data.roster.map((p) => p.articleUrl ?? p.name)).size ===
        data.roster.length &&
      new Set(data.results.map((g) => g.sourceId)).size === data.results.length &&
      data.results.every((g) => g.opponent.id !== data.team.id),
  );
export type TeamArchiveResponse = z.infer<typeof TeamArchiveResponseSchema>;
