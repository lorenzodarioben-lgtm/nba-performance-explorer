import { z } from 'zod';
import { ArchiveSeasonSchema, WikiAttributionSchema } from './wiki-archive.js';
import { DirectoryTeamSchema } from './team-directory.js';
import { DataProvenanceSchema } from './research.js';
export const HistoricalAwardSchema = z
  .object({
    category: z.string().min(1).max(120),
    recipients: z
      .array(
        z
          .object({
            name: z.string().min(1).max(100),
            articleUrl: z
              .string()
              .regex(/^https:\/\/en\.wikipedia\.org\/wiki\/[\w%()'.-]+$/)
              .nullable(),
            team: DirectoryTeamSchema.nullable(),
          })
          .strict(),
      )
      .max(10),
    recipientUnavailable: z.boolean(),
  })
  .strict()
  .refine((a) => a.recipientUnavailable === (a.recipients.length === 0));
export const HistoricalAwardsQuerySchema = z
  .object({ season: ArchiveSeasonSchema.default('2023-24') })
  .strict();
export const HistoricalAwardsResponseSchema = z
  .object({
    season: ArchiveSeasonSchema,
    awards: z.array(HistoricalAwardSchema).min(1).max(30),
    attribution: WikiAttributionSchema,
    provenance: DataProvenanceSchema,
  })
  .strict();
export type HistoricalAwardsResponse = z.infer<typeof HistoricalAwardsResponseSchema>;
