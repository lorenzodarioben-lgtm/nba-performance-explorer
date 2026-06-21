import { z } from 'zod';

import { PlayerSeasonStatsSchema, type PlayerSeasonStats } from './player-season.js';

// Career trends reuse the season-statistics entries. Multiple entries must be unique and
// strictly oldest-first (ascending four-digit starting year). The check iterates with a
// stored previous starting year rather than unchecked adjacent-array indexing, so it stays
// correct under `noUncheckedIndexedAccess`.
function isStrictlyOldestFirst(seasons: readonly PlayerSeasonStats[]): boolean {
  let previousStartYear: number | undefined;

  for (const entry of seasons) {
    const startYear = Number(entry.season.slice(0, 4));

    if (previousStartYear !== undefined && previousStartYear >= startYear) {
      return false;
    }

    previousStartYear = startYear;
  }

  return true;
}

export const PlayerSeasonTrendsResponseSchema = z
  .object({
    seasons: z.array(PlayerSeasonStatsSchema).refine(isStrictlyOldestFirst, {
      message: 'Seasons must be unique and ordered oldest first.',
    }),
  })
  .strict();

export type PlayerSeasonTrendsResponse = z.infer<
  typeof PlayerSeasonTrendsResponseSchema
>;
