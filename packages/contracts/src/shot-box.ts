import { z } from 'zod';
import { ShotGameIdSchema, ShotSourceSchema } from './shot-archive.js';
import { DirectoryTeamSchema } from './team-directory.js';
import { GameDateSchema } from './player-game-log.js';
import { DataProvenanceSchema, ResearchPlayerIdSchema } from './research.js';
export const ShotBoxQuerySchema = z
  .object({
    game: ShotGameIdSchema,
    minAttempts: z
      .string()
      .regex(/^\d{1,4}$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(1000))
      .prefault('1'),
  })
  .strict();
export const ObservedShootingCountsSchema = z
  .object({
    attempts: z.number().int().nonnegative(),
    makes: z.number().int().nonnegative(),
    twoAttempts: z.number().int().nonnegative(),
    twoMakes: z.number().int().nonnegative(),
    threeAttempts: z.number().int().nonnegative(),
    threeMakes: z.number().int().nonnegative(),
    fgPercentage: z.number().min(0).max(1).nullable(),
    threePercentage: z.number().min(0).max(1).nullable(),
    efgPercentage: z.number().min(0).max(1.5).nullable(),
    fieldGoalPoints: z.number().int().nonnegative(),
    freeThrows: z.null(),
    totalPoints: z.null(),
    minutes: z.null(),
    rebounds: z.null(),
    assists: z.null(),
  })
  .strict()
  .refine(
    (s) =>
      s.attempts === s.twoAttempts + s.threeAttempts &&
      s.makes === s.twoMakes + s.threeMakes &&
      s.twoMakes <= s.twoAttempts &&
      s.threeMakes <= s.threeAttempts &&
      s.fieldGoalPoints === 2 * s.twoMakes + 3 * s.threeMakes,
  );
export const ShotBoxResponseSchema = z
  .object({
    gameId: ShotGameIdSchema,
    date: GameDateSchema,
    home: DirectoryTeamSchema,
    away: DirectoryTeamSchema,
    minAttempts: z.number().int().positive(),
    observedAttempts: z.number().int().nonnegative(),
    players: z
      .array(
        ObservedShootingCountsSchema.extend({
          playerId: ResearchPlayerIdSchema,
          name: z.string(),
          team: DirectoryTeamSchema,
        }),
      )
      .max(50),
    teams: z
      .array(ObservedShootingCountsSchema.extend({ team: DirectoryTeamSchema }))
      .length(2),
    source: ShotSourceSchema,
    provenance: DataProvenanceSchema,
  })
  .strict();
export type ObservedShootingCounts = z.infer<typeof ObservedShootingCountsSchema>;
export type ShotBoxResponse = z.infer<typeof ShotBoxResponseSchema>;
