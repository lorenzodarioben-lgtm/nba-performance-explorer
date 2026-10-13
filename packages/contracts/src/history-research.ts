import { z } from 'zod';
import { SeasonIdSchema } from './player-season.js';
import { DataProvenanceSchema } from './research.js';
export const WikidataIdSchema = z.string().regex(/^wd:Q[1-9]\d{0,11}$/);
const EntityLinkSchema = z
  .string()
  .regex(/^https:\/\/www\.wikidata\.org\/wiki\/Q[1-9]\d{0,11}$/);
export const HistoricalSeasonSchema = z
  .object({
    id: WikidataIdSchema,
    season: SeasonIdSchema,
    sourceLabel: z.string().min(1).max(120),
    sourceUrl: EntityLinkSchema,
    winners: z
      .array(
        z
          .object({
            id: WikidataIdSchema,
            label: z.string().min(1).max(120).nullable(),
            sourceUrl: EntityLinkSchema,
          })
          .strict(),
      )
      .max(10),
  })
  .strict();
export type HistoricalSeason = z.infer<typeof HistoricalSeasonSchema>;
export const HistoryQuerySchema = z
  .object({
    from: z.coerce.number().int().min(1946).max(2100).optional(),
    to: z.coerce.number().int().min(1946).max(2100).optional(),
    champion: WikidataIdSchema.optional(),
  })
  .strict()
  .refine((q) => q.from === undefined || q.to === undefined || q.from <= q.to);
export const HistoryResponseSchema = z
  .object({
    status: z.enum(['available', 'records-unavailable', 'unsupported']),
    seasons: z.array(HistoricalSeasonSchema).max(100),
    sourceSeasons: z.number().int().min(0).max(100),
    navigation: z
      .object({ previous: SeasonIdSchema.nullable(), next: SeasonIdSchema.nullable() })
      .strict(),
    coverage: z
      .object({
        rawRows: z.number().int().min(0).max(101),
        excludedRows: z.number().int().min(0).max(101),
        missingWinners: z.number().int().min(0).max(100),
        capped: z.boolean(),
      })
      .strict(),
    provenance: DataProvenanceSchema,
  })
  .strict();
export type HistoryResponse = z.infer<typeof HistoryResponseSchema>;
