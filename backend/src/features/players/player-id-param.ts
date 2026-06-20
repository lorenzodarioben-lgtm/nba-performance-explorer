import { PlayerIdSchema } from '@nba-performance-explorer/contracts';
import { z } from 'zod';

const PlayerIdParamsSchema = z.object({
  playerId: PlayerIdSchema,
});

export function parsePlayerIdParam(params: unknown) {
  return PlayerIdParamsSchema.safeParse(params);
}
