import { z } from 'zod';

import { SeasonIdSchema } from './player-season.js';
import { TeamSummarySchema } from './player-search.js';

// Public game identifier: 1-100 chars, lowercase letters/digits with internal hyphens, must
// start and end with an alphanumeric character. URL-safe, no whitespace/slashes/dots. It is a
// stable public fixture id, never a private array index.
export const GameIdSchema = z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/);

export type GameId = z.infer<typeof GameIdSchema>;

// Direct Gregorian validation of a `YYYY-MM-DD` string, parsed by slicing (index-safe under
// `noUncheckedIndexedAccess`) with no locale or timezone conversion.
function isRealCalendarDate(value: string): boolean {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}

export const GameDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isRealCalendarDate, {
    message: 'Game date must be a real calendar date.',
  });

export type GameDate = z.infer<typeof GameDateSchema>;

export const GameLocationSchema = z.enum(['home', 'away']);

export type GameLocation = z.infer<typeof GameLocationSchema>;

export const GameResultSchema = z.enum(['W', 'L']);

export type GameResult = z.infer<typeof GameResultSchema>;

const countSchema = z.number().int().nonnegative();

export const PlayerGameSchema = z
  .object({
    id: GameIdSchema,
    date: GameDateSchema,
    team: TeamSummarySchema,
    opponent: TeamSummarySchema,
    location: GameLocationSchema,
    result: GameResultSchema,
    minutes: countSchema,
    points: countSchema,
    rebounds: countSchema,
    assists: countSchema,
  })
  .strict();

export type PlayerGame = z.infer<typeof PlayerGameSchema>;

// Games must have unique public ids and strictly descending dates (newest first; same-day games
// are not modelled). Iterated with a Set of ids and a stored previous date so it stays correct
// under `noUncheckedIndexedAccess`; ISO `YYYY-MM-DD` strings compare chronologically.
function isStrictlyNewestFirst(games: readonly PlayerGame[]): boolean {
  const seenIds = new Set<string>();
  let previousDate: string | undefined;

  for (const game of games) {
    if (seenIds.has(game.id)) {
      return false;
    }

    seenIds.add(game.id);

    if (previousDate !== undefined && game.date >= previousDate) {
      return false;
    }

    previousDate = game.date;
  }

  return true;
}

export const PlayerGameLogResponseSchema = z
  .object({
    season: SeasonIdSchema,
    games: z.array(PlayerGameSchema).refine(isStrictlyNewestFirst, {
      message: 'Games must be unique and ordered strictly newest first.',
    }),
  })
  .strict();

export type PlayerGameLogResponse = z.infer<typeof PlayerGameLogResponseSchema>;
