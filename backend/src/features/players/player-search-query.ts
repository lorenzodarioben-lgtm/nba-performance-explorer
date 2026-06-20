import { z } from 'zod';

const PlayerSearchQuerySchema = z.object({
  search: z.string().trim().min(2),
});

export function parsePlayerSearchQuery(query: unknown) {
  return PlayerSearchQuerySchema.safeParse(query);
}
