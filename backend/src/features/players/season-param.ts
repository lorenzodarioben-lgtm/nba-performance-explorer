import { SeasonIdSchema } from '@nba-performance-explorer/contracts';
import { z } from 'zod';

const SeasonParamsSchema = z.object({
  season: SeasonIdSchema,
});

export function parseSeasonParam(params: unknown) {
  return SeasonParamsSchema.safeParse(params);
}
