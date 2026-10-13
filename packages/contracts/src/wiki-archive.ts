import { z } from 'zod';
import { DirectoryTeamSchema, CanonicalTeamIdSchema } from './team-directory.js';
import { GameDateSchema } from './player-game-log.js';
import { DataProvenanceSchema } from './research.js';
export const ArchiveSeasonSchema = z.literal('2023-24');
export const WikiAttributionSchema = z
  .object({
    title: z.string().min(1).max(120),
    revision: z.number().int().positive(),
    url: z.string().regex(/^https:\/\/en\.wikipedia\.org\/w\/index\.php\?oldid=\d+$/),
    license: z.literal('CC BY-SA 4.0'),
    licenseUrl: z.literal('https://creativecommons.org/licenses/by-sa/4.0/'),
    adapted: z.literal(true),
  })
  .strict();
export type WikiAttribution = z.infer<typeof WikiAttributionSchema>;
export const ArchiveStandingSchema = z
  .object({
    rank: z.number().int().min(1).max(15),
    conference: z.enum(['East', 'West']),
    team: DirectoryTeamSchema,
    wins: z.number().int().min(0).max(82),
    losses: z.number().int().min(0).max(82),
    gamesPlayed: z.number().int().min(1).max(82),
    winPercentage: z.number().min(0).max(1),
    sourcePercentage: z.number().min(0).max(1),
    gamesBehind: z.number().nonnegative().nullable(),
  })
  .strict()
  .refine(
    (r) =>
      r.wins + r.losses === r.gamesPlayed &&
      Math.abs(r.winPercentage - r.wins / r.gamesPlayed) < 1e-10 &&
      Math.abs(r.winPercentage - r.sourcePercentage) <= 0.00051,
  );
export const ArchiveLeaderSchema = z
  .object({
    scope: z.enum(['player', 'team']),
    category: z.string().min(1).max(100),
    name: z.string().min(1).max(100),
    teamLabel: z.string().max(100).nullable(),
    value: z.number().finite(),
    unit: z.enum(['%', 'per game', 'count', 'source-defined']),
    articleUrl: z
      .string()
      .regex(/^https:\/\/en\.wikipedia\.org\/wiki\/[\w%()'.-]+$/)
      .nullable(),
  })
  .strict()
  .refine((r) => r.category === '+/−' || r.value >= 0);
export const ArchiveLeagueResponseSchema = z
  .object({
    season: ArchiveSeasonSchema,
    scope: z.literal('regular-season'),
    standings: z.array(ArchiveStandingSchema).length(30),
    leaders: z.array(ArchiveLeaderSchema).max(100),
    attribution: WikiAttributionSchema,
    provenance: DataProvenanceSchema,
  })
  .strict();
export type ArchiveLeagueResponse = z.infer<typeof ArchiveLeagueResponseSchema>;
export const ArchiveGameIdSchema = z.string().regex(/^nba:00423\d{5}$/);
export const ArchiveGameSchema = z
  .object({
    id: ArchiveGameIdSchema,
    sourceId: z.string().regex(/^00423\d{5}$/),
    season: ArchiveSeasonSchema,
    scope: z.literal('playoffs'),
    date: GameDateSchema,
    status: z.literal('final'),
    away: DirectoryTeamSchema,
    home: DirectoryTeamSchema,
    awayScore: z.number().int().nonnegative(),
    homeScore: z.number().int().nonnegative(),
    tipoffUtc: z.null(),
    reportedTime: z.string().max(40).nullable(),
    venue: z.string().max(150).nullable(),
    quarters: z
      .array(
        z
          .object({
            period: z.number().int().min(1).max(8),
            away: z.number().int().nonnegative(),
            home: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .min(4)
      .max(8),
    leaders: z
      .array(
        z
          .object({
            teamId: CanonicalTeamIdSchema,
            points: z.string().max(150).nullable(),
            rebounds: z.string().max(150).nullable(),
            assists: z.string().max(150).nullable(),
          })
          .strict(),
      )
      .length(2),
    recapUrl: z
      .string()
      .regex(/^https:\/\/www\.nba\.com\/game\/[a-z0-9-]+(?:\/box-score)?$/),
  })
  .strict()
  .refine(
    (g) =>
      g.away.id !== g.home.id &&
      g.id === `nba:${g.sourceId}` &&
      g.recapUrl.includes(g.sourceId) &&
      g.awayScore !== g.homeScore &&
      g.quarters.every((q, i) => q.period === i + 1) &&
      new Set(g.leaders.map((l) => l.teamId)).size === 2 &&
      g.leaders.every((l) => l.teamId === g.away.id || l.teamId === g.home.id) &&
      g.quarters.reduce((s, q) => s + q.away, 0) === g.awayScore &&
      g.quarters.reduce((s, q) => s + q.home, 0) === g.homeScore,
  );
export type ArchiveGame = z.infer<typeof ArchiveGameSchema>;
export const ArchiveGamesResponseSchema = z
  .object({
    season: ArchiveSeasonSchema,
    scope: z.literal('playoffs'),
    games: z.array(ArchiveGameSchema).max(150),
    recordedGames: z.number().int().min(1).max(150),
    firstDate: GameDateSchema,
    lastDate: GameDateSchema,
    attribution: WikiAttributionSchema,
    provenance: DataProvenanceSchema,
  })
  .strict();
export type ArchiveGamesResponse = z.infer<typeof ArchiveGamesResponseSchema>;
