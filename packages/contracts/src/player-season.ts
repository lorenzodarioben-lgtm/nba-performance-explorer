import { z } from 'zod';

import { TeamSummarySchema } from './player-search.js';

// A public season identifier of the form `YYYY-YY` (for example `2023-24`). The ending two
// digits must be the next calendar year modulo 100, so `2023-24`, `1999-00`, and `2099-00`
// are valid while `2023-25`, `23-24`, and `2023/24` are not. Season ids stay strings and are
// never coerced into numeric keys.
function hasConsecutiveYears(season: string): boolean {
  const startYear = Number(season.slice(0, 4));
  const expectedEndYear = String((startYear + 1) % 100).padStart(2, '0');
  return season.slice(5, 7) === expectedEndYear;
}

export const SeasonIdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .refine(hasConsecutiveYears, {
    message: 'Season ending year must follow the starting year.',
  });

export type SeasonId = z.infer<typeof SeasonIdSchema>;

export const PlayerSeasonSchema = z
  .object({
    season: SeasonIdSchema,
    // Optional: a season split across multiple teams has no single team to report (the live
    // NBA.com provider exposes a `TOT` aggregate row, which is not a real team).
    team: TeamSummarySchema.optional(),
  })
  .strict();

export type PlayerSeason = z.infer<typeof PlayerSeasonSchema>;

// Available seasons must be unique and strictly newest-first. Comparison is by the numeric
// four-digit starting year, iterated without array indexing so it stays correct under
// `noUncheckedIndexedAccess`.
function isStrictlyNewestFirst(seasons: readonly PlayerSeason[]): boolean {
  let previousStartYear: number | undefined;

  for (const entry of seasons) {
    const startYear = Number(entry.season.slice(0, 4));

    if (previousStartYear !== undefined && previousStartYear <= startYear) {
      return false;
    }

    previousStartYear = startYear;
  }

  return true;
}

export const PlayerSeasonsResponseSchema = z
  .object({
    seasons: z.array(PlayerSeasonSchema).refine(isStrictlyNewestFirst, {
      message: 'Seasons must be unique and ordered newest first.',
    }),
  })
  .strict();

export type PlayerSeasonsResponse = z.infer<typeof PlayerSeasonsResponseSchema>;

const perGameValueSchema = z.number().finite().nonnegative();
const percentageRatioSchema = z.number().finite().min(0).max(1);

export const PlayerSeasonStatsSchema = z
  .object({
    season: SeasonIdSchema,
    // Optional for the same reason as `PlayerSeason.team`: a multi-team (traded) season.
    team: TeamSummarySchema.optional(),
    gamesPlayed: z.number().int().nonnegative(),
    minutesPerGame: perGameValueSchema,
    pointsPerGame: perGameValueSchema,
    reboundsPerGame: perGameValueSchema,
    assistsPerGame: perGameValueSchema,
    stealsPerGame: perGameValueSchema,
    blocksPerGame: perGameValueSchema,
    turnoversPerGame: perGameValueSchema,
    fieldGoalPercentage: percentageRatioSchema,
    threePointPercentage: percentageRatioSchema,
    freeThrowPercentage: percentageRatioSchema,
  })
  .strict();

export type PlayerSeasonStats = z.infer<typeof PlayerSeasonStatsSchema>;

export const PlayerSeasonStatsResponseSchema = z
  .object({
    stats: PlayerSeasonStatsSchema,
  })
  .strict();

export type PlayerSeasonStatsResponse = z.infer<typeof PlayerSeasonStatsResponseSchema>;
