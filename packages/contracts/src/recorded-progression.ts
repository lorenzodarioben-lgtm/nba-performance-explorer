import { z } from 'zod';
import {
  RecordedRecordsQuerySchema,
  VerifiedRecordedGameSchema,
  RecordedRecordMetricSchema,
} from './recorded-archive.js';
import { GameDateSchema } from './player-game-log.js';
import { RecordedSeasonSchema, WikiAttributionSchema } from './wiki-archive.js';
import { CanonicalTeamIdSchema } from './team-directory.js';
import { DataProvenanceSchema } from './research.js';
const date = GameDateSchema.refine((d) => d >= '2023-10-01' && d <= '2024-06-30');
export const RecordedProgressionQuerySchema = RecordedRecordsQuerySchema.extend({
  from: date.optional(),
  to: date.optional(),
  minDailyGames: z
    .string()
    .regex(/^\d{1,2}$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(15))
    .prefault('1'),
})
  .strict()
  .refine((q) => !q.from || !q.to || q.from <= q.to);
export type RecordedProgressionQuery = z.infer<typeof RecordedProgressionQuerySchema>;
export const RecordedProgressionResponseSchema = z
  .object({
    season: RecordedSeasonSchema,
    metric: RecordedRecordMetricSchema,
    team: CanonicalTeamIdSchema.nullable(),
    from: date,
    to: date,
    minDailyGames: z.number().int().positive(),
    matchingGames: z.number().int().nonnegative(),
    series: z
      .array(
        z
          .object({
            date,
            games: z.number().int().nonnegative(),
            meanValue: z.number().nonnegative().nullable(),
            highValue: z.number().nonnegative().nullable(),
          })
          .strict(),
      )
      .max(300),
    progression: z
      .array(
        z
          .object({
            date,
            previousHigh: z.number().nonnegative().nullable(),
            value: z.number().nonnegative(),
            kind: z.enum(['new-high', 'ties-current-high']),
            games: z.array(VerifiedRecordedGameSchema).min(1).max(30),
          })
          .strict(),
      )
      .max(300),
    reconciledGames: z.number().int().nonnegative(),
    quarantinedGameIds: z.array(z.string()).max(100),
    snapshotCreatedAt: z.iso.datetime(),
    attributions: z.array(WikiAttributionSchema).length(30),
    provenance: DataProvenanceSchema,
  })
  .strict();
export type RecordedProgressionResponse = z.infer<
  typeof RecordedProgressionResponseSchema
>;
