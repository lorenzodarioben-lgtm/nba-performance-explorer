import { z } from 'zod';

// The data coverage explorer: what every dataset behind the app covers, measured from the data
// itself (counts, field availability, revisions and retrieval times), and which sources are
// only contacted on request. Nothing here is a hand-written claim of completeness.

const count = z.number().int().nonnegative();

export const CoverageDatasetIdSchema = z.enum([
  'recorded-2023-24',
  'league-2023-24',
  'playoffs-2024',
  'shots-2018',
  'lineups-2017-18',
]);
export type CoverageDatasetId = z.infer<typeof CoverageDatasetIdSchema>;

export const CoverageFieldSchema = z
  .object({
    field: z.string().max(60),
    label: z.string().max(80),
    /** Records with a value for this field. */
    available: count,
    /** Records the field could apply to. */
    total: count,
    note: z.string().max(240).nullable(),
  })
  .strict();

export const CoverageDatasetSchema = z
  .object({
    id: CoverageDatasetIdSchema,
    title: z.string().max(120),
    season: z.string().regex(/^\d{4}-\d{2}$/),
    scope: z.enum(['regular-season', 'playoffs', 'season-tables']),
    /** "complete" only when every game of the stated scope is present in the data. */
    completeness: z.enum(['complete-scope', 'partial-scope']),
    completenessNote: z.string().max(300),
    storage: z.literal('committed-with-app'),
    source: z
      .object({
        name: z.string().max(160),
        url: z.url(),
        licence: z.string().max(60),
        licenceUrl: z.url(),
        /** A source revision or version, when the source has one. */
        version: z.string().max(80).nullable(),
      })
      .strict(),
    /** When the committed copy was retrieved (earliest and latest when several pages). */
    retrievedFrom: z.iso.datetime().nullable(),
    retrievedTo: z.iso.datetime().nullable(),
    /** When the source itself was last updated, if it says. */
    sourceUpdatedAt: z.iso.datetime().nullable(),
    counts: z
      .array(z.object({ label: z.string().max(80), value: count }).strict())
      .max(16),
    fields: z.array(CoverageFieldSchema).max(24),
    unavailable: z.array(z.string().max(200)).max(12),
    tools: z
      .array(
        z
          .object({
            label: z.string().max(60),
            to: z.string().regex(/^\/[\w\-/?=&:,.%]*$/),
          })
          .strict(),
      )
      .max(8),
  })
  .strict();
export type CoverageDataset = z.infer<typeof CoverageDatasetSchema>;

export const CoverageLiveSourceSchema = z
  .object({
    id: z.enum(['nba-stats', 'wikipedia', 'wikidata']),
    name: z.string().max(80),
    use: z.string().max(240),
    /** How this server is configured to use the source right now. */
    mode: z.enum(['on-request', 'fallback-to-committed', 'not-contacted', 'fixtures']),
    note: z.string().max(300),
  })
  .strict();

export const CoverageResponseSchema = z
  .object({
    generatedAt: z.iso.datetime(),
    datasets: z.array(CoverageDatasetSchema).max(10),
    liveSources: z.array(CoverageLiveSourceSchema).max(5),
  })
  .strict();
export type CoverageResponse = z.infer<typeof CoverageResponseSchema>;
