import { z } from 'zod';
import {
  ArchiveRankingMetricSchema,
  PositionFamilySchema,
} from './recorded-archive.js';
import { CanonicalTeamIdSchema } from './team-directory.js';
import { RecordedSeasonSchema } from './wiki-archive.js';
import { DataProvenanceSchema } from './research.js';

// The research workbench: one recorded population (players or teams), any supported metric,
// viewed as a ranking, a distribution or a relationship between two metrics. Every statistic is
// computed in the backend over an explicit, stated cohort.

export const WorkbenchEntitySchema = z.enum(['players', 'teams']);
export const WorkbenchPlayerMetricSchema = ArchiveRankingMetricSchema;
export const WorkbenchTeamMetricSchema = z.enum([
  'winPercentage',
  'pointsFor',
  'pointsAgainst',
  'marginPerGame',
  'homeWinPercentage',
  'awayWinPercentage',
  'vsWinningWinPercentage',
  'vsLosingWinPercentage',
  'closeWinPercentage',
  'decisiveWinPercentage',
  'backToBackWinPercentage',
  'longestWinStreak',
  'longestLosingStreak',
]);
export const WorkbenchViewSchema = z.enum(['rank', 'distribution', 'relationship']);

const metricKey = z.string().regex(/^[a-zA-Z]{3,40}$/);
const isMetric = (entity: 'players' | 'teams', key: string) =>
  entity === 'players'
    ? WorkbenchPlayerMetricSchema.safeParse(key).success
    : WorkbenchTeamMetricSchema.safeParse(key).success;

export const WorkbenchQuerySchema = z
  .object({
    season: RecordedSeasonSchema.default('2023-24'),
    entity: WorkbenchEntitySchema.default('players'),
    view: WorkbenchViewSchema.default('rank'),
    metric: metricKey.default('pointsPerGame'),
    y: metricKey.optional(),
    minGames: z
      .string()
      .regex(/^\d{1,2}$/)
      .transform(Number)
      .pipe(z.number().int().min(1).max(82))
      .optional(),
    order: z.enum(['desc', 'asc']).default('desc'),
    team: CanonicalTeamIdSchema.optional(),
    /** Position-family cohort for players (source-listed 2023-24 roster positions). */
    position: PositionFamilySchema.optional(),
    conference: z.enum(['East', 'West']).optional(),
  })
  .strict()
  .refine((q) => isMetric(q.entity, q.metric), { message: 'Unsupported metric.' })
  .refine((q) => !q.y || (isMetric(q.entity, q.y) && q.y !== q.metric), {
    message: 'Choose a different supported second metric.',
  })
  .refine((q) => q.view !== 'relationship' || Boolean(q.y), {
    message: 'A relationship needs a second metric.',
  })
  .refine((q) => !q.team || q.entity === 'players', {
    message: 'Team filter is for players.',
  })
  .refine((q) => !q.position || q.entity === 'players', {
    message: 'Position filter is for players.',
  })
  .refine((q) => !q.conference || q.entity === 'teams', {
    message: 'Conference filter is for teams.',
  });
export type WorkbenchQuery = z.infer<typeof WorkbenchQuerySchema>;

export const WorkbenchMetricDefinitionSchema = z
  .object({
    key: z.string(),
    label: z.string().max(60),
    unit: z.enum(['per-game', 'percent', 'count', 'games', 'points']),
    definition: z.string().max(400),
  })
  .strict();
export type WorkbenchMetricDefinition = z.infer<typeof WorkbenchMetricDefinitionSchema>;

const Summary = z
  .object({
    n: z.number().int().nonnegative(),
    mean: z.number().finite().nullable(),
    sd: z.number().finite().nonnegative().nullable(),
    min: z.number().finite().nullable(),
    q1: z.number().finite().nullable(),
    median: z.number().finite().nullable(),
    q3: z.number().finite().nullable(),
    max: z.number().finite().nullable(),
  })
  .strict();
export type WorkbenchSummary = z.infer<typeof Summary>;

export const WorkbenchRowSchema = z
  .object({
    id: z.string().max(40),
    label: z.string().max(100),
    teams: z
      .array(z.string().regex(/^[A-Z]{3}$/))
      .min(1)
      .max(10),
    href: z.string().regex(/^\/(?:players|teams)\//),
    /** Games behind the x value: games played for players, the split's verified games for teams. */
    sample: z.number().int().nonnegative(),
    x: z.number().finite(),
    y: z.number().finite().nullable(),
    rank: z.number().int().positive(),
    percentile: z.number().min(0).max(100),
    zX: z.number().finite(),
    zY: z.number().finite().nullable(),
  })
  .strict();
export type WorkbenchRow = z.infer<typeof WorkbenchRowSchema>;

export const WorkbenchResponseSchema = z
  .object({
    season: RecordedSeasonSchema,
    entity: WorkbenchEntitySchema,
    view: WorkbenchViewSchema,
    order: z.enum(['desc', 'asc']),
    minGames: z.number().int().min(1).max(82),
    cohort: z.string().max(200),
    metric: WorkbenchMetricDefinitionSchema,
    y: WorkbenchMetricDefinitionSchema.nullable(),
    rows: z.array(WorkbenchRowSchema).max(700),
    excluded: z
      .array(
        z
          .object({ reason: z.string().max(160), count: z.number().int().positive() })
          .strict(),
      )
      .max(10),
    summary: Summary,
    ySummary: Summary.nullable(),
    bins: z
      .array(
        z
          .object({
            from: z.number().finite(),
            to: z.number().finite(),
            count: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .max(20),
    relationship: z
      .object({
        n: z.number().int().min(3),
        pearson: z.number().min(-1).max(1).nullable(),
        slope: z.number().finite().nullable(),
        intercept: z.number().finite().nullable(),
      })
      .strict()
      .nullable(),
    snapshotCreatedAt: z.iso.datetime(),
    provenance: DataProvenanceSchema,
  })
  .strict();
export type WorkbenchResponse = z.infer<typeof WorkbenchResponseSchema>;
