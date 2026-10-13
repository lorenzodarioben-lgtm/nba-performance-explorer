import { z } from 'zod';
const schema = z
  .object({
    archive: z.literal('2023-24').optional(),
    details: z.literal('2023-24').optional(),
    side: z.enum(['home', 'away']).optional(),
    participants: z
      .enum(['regular-season', 'playoffs', 'source-unspecified'])
      .default('regular-season'),
    minGames: z
      .string()
      .regex(/^\d{1,2}$/)
      .transform(Number)
      .pipe(z.number().int().min(0).max(82))
      .prefault('10'),
    metric: z
      .enum([
        'pointsPerGame',
        'reboundsPerGame',
        'assistsPerGame',
        'stealsPerGame',
        'blocksPerGame',
        'gamesPlayed',
        'minutesPerGame',
        'fieldGoalPercentage',
        'threePointPercentage',
        'freeThrowPercentage',
      ])
      .default('pointsPerGame'),
    search: z.string().max(100).optional(),
  })
  .strict();
export function readTeamArchiveState(params: URLSearchParams) {
  const parsed = schema.safeParse(Object.fromEntries(params));
  return {
    valid:
      parsed.success && [...params.keys()].every((k) => params.getAll(k).length === 1),
    parsed,
  };
}
