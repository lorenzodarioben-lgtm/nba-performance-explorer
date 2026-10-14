import { z } from 'zod';
import { DirectoryTeamSchema, CanonicalTeamIdSchema } from './team-directory.js';
import { WikiAttributionSchema } from './wiki-archive.js';
import { WikiArticleUrlSchema } from './team-archive.js';
import { DataProvenanceSchema, ResearchPlayerIdSchema } from './research.js';
const integer = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d{1,2}$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));
export const DraftQuerySchema = z
  .object({
    year: z.literal('2023').default('2023'),
    round: integer(1, 2).optional(),
    team: CanonicalTeamIdSchema.optional(),
    fromPick: integer(1, 58).prefault('1'),
    toPick: integer(1, 58).prefault('58'),
    search: z.string().trim().max(100).optional(),
    page: integer(1, 5).prefault('1'),
    pageSize: integer(1, 30).prefault('20'),
  })
  .strict()
  .refine((q) => q.fromPick <= q.toPick);
export type DraftQuery = z.infer<typeof DraftQuerySchema>;
export const DraftSelectionSchema = z
  .object({
    id: z.string().regex(/^draft:2023:\d{1,2}$/),
    year: z.literal(2023),
    round: z.number().int().min(1).max(2),
    pick: z.number().int().min(1).max(58),
    name: z.string().min(1).max(100),
    playerLabel: z.string().min(1).max(120),
    articleUrl: WikiArticleUrlSchema,
    nbaPlayerId: ResearchPlayerIdSchema.nullable(),
    identityUrl: z
      .string()
      .regex(/^https:\/\/www\.wikidata\.org\/wiki\/Q[1-9]\d{0,11}$/)
      .nullable(),
    position: z.string().max(30).nullable(),
    nationality: z.string().max(150).nullable(),
    listedTeam: DirectoryTeamSchema,
    teamLabel: z.string().max(300),
    schoolClub: z.string().max(200).nullable(),
  })
  .strict()
  .refine(
    (r) =>
      r.id === `draft:2023:${r.pick}` && (r.pick <= 30 ? r.round === 1 : r.round === 2),
  );
export const DraftForfeitureSchema = z
  .object({
    round: z.literal(2),
    listedTeam: DirectoryTeamSchema,
    sourceLabel: z.string().max(300),
  })
  .strict();
export const DraftResponseSchema = z
  .object({
    year: z.literal(2023),
    selections: z.array(DraftSelectionSchema).max(30),
    total: z.number().int().nonnegative(),
    sourceSelections: z.literal(58),
    forfeitures: z.array(DraftForfeitureSchema).length(2),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    identityStatus: z.enum(['available', 'unavailable']),
    identityRetrievedAt: z.iso.datetime().nullable(),
    missingNBAIds: z.number().int().nonnegative(),
    attribution: WikiAttributionSchema,
    provenance: DataProvenanceSchema,
  })
  .strict();
export type DraftSelection = z.infer<typeof DraftSelectionSchema>;
export type DraftResponse = z.infer<typeof DraftResponseSchema>;
