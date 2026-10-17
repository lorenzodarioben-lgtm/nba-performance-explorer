// The individual awards the honours archive holds, with the names each source uses for them,
// and the storage schema of league/data/honours.json.
import { z } from 'zod';

export const HONOUR_AWARDS = [
  {
    id: 'mvp',
    label: 'Most Valuable Player',
    nba: 'NBA Most Valuable Player',
    wikipedia: 'NBA Most Valuable Player',
    from: '1955-56',
  },
  {
    id: 'finals-mvp',
    label: 'Finals MVP',
    nba: 'NBA Finals Most Valuable Player',
    wikipedia: 'NBA Finals Most Valuable Player',
    from: '1968-69',
  },
  {
    id: 'dpoy',
    label: 'Defensive Player of the Year',
    nba: 'NBA Defensive Player of the Year',
    wikipedia: 'NBA Defensive Player of the Year',
    from: '1982-83',
  },
  {
    id: 'roy',
    label: 'Rookie of the Year',
    nba: 'NBA Rookie of the Year',
    wikipedia: 'NBA Rookie of the Year',
    from: '1952-53',
  },
  {
    id: 'sixth-man',
    label: 'Sixth Man of the Year',
    nba: 'NBA Sixth Man of the Year',
    wikipedia: 'NBA Sixth Man of the Year',
    from: '1982-83',
  },
  {
    id: 'mip',
    label: 'Most Improved Player',
    nba: 'NBA Most Improved Player',
    wikipedia: 'NBA Most Improved Player',
    from: '1985-86',
  },
  {
    id: 'clutch',
    label: 'Clutch Player of the Year',
    nba: 'NBA Clutch Player of the Year',
    wikipedia: 'NBA Clutch Player of the Year',
    from: '2022-23',
  },
] as const;
export type HonourAwardId = (typeof HONOUR_AWARDS)[number]['id'];
const AwardIdSchema = z.enum(
  HONOUR_AWARDS.map((a) => a.id) as [HonourAwardId, ...HonourAwardId[]],
);
const Season = z.string().regex(/^\d{4}-\d{2}$/);

export const HonoursFileSchema = z
  .object({
    kind: z.literal('nba-honours'),
    version: z.literal(1),
    builtAt: z.string().datetime(),
    sources: z.array(
      z
        .object({
          award: AwardIdSchema,
          title: z.string().max(120),
          revision: z.number().int().positive(),
          retrievedAt: z.string().datetime(),
        })
        .strict(),
    ),
    requests: z.array(
      z
        .object({
          source: z.enum(['wikipedia', 'wikidata', 'nba-stats']),
          url: z.string().url().max(300),
          retrievedAt: z.string().datetime(),
          sha256: z.string().regex(/^[0-9a-f]{64}$/),
        })
        .strict(),
    ),
    winners: z.array(
      z
        .object({
          season: Season,
          award: AwardIdSchema,
          playerId: z.string().regex(/^[1-9]\d{0,11}$/),
          name: z.string().min(1).max(80),
          team: z.string().max(80),
        })
        .strict(),
    ),
    finalsMvpTeams: z.array(
      z.object({ season: Season, team: z.string().max(80) }).strict(),
    ),
    notes: z.array(z.string().max(300)),
  })
  .strict();
export type HonoursFile = z.infer<typeof HonoursFileSchema>;
