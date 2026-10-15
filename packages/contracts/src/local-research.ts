import { z } from 'zod';

// Internal paths only, to implemented routes. Reject protocol-relative URLs, backslashes,
// credentials, encoded path tricks and control characters before the browser interprets them.
export const InternalResearchPathSchema = z
  .string()
  .min(1)
  .max(1500)
  .refine(
    (path) => {
      if (
        !path.startsWith('/') ||
        path.startsWith('//') ||
        path.includes('\\') ||
        Array.from(path).some((char) => char.charCodeAt(0) <= 32)
      )
        return false;
      try {
        const url = new URL(path, 'https://research.invalid');
        return (
          url.origin === 'https://research.invalid' &&
          !url.hash &&
          url.pathname === path.split('?')[0] &&
          /^\/(?:explore(?:\/coverage)?|my-nba|compare(?:\/recorded)?|discover(?:\/(?:recorded|similar))?|standings(?:\/(?:recorded|race|wikipedia))?|leaders(?:\/(?:recorded|wikipedia|teams))?|games(?:\/(?:nba:00[1-6]\d{7}|recorded|shooting|bracket|series\/r[1-4]-[A-Z]{3}-[A-Z]{3}))?|history(?:\/(?:\d{4}-\d{2}|records|record-book|calendar|awards|progression|draft))?|lab\/(?:compare|analytics|careers|teams|groups|recorded|profiles|shots|lineups|formulas|workbench)|teams(?:\/nba:[1-9]\d{0,11}(?:\/season)?)?|players\/[1-9]\d{0,11}(?:\/(?:insights|career|games|shooting|archive))?)?$/.test(
            url.pathname,
          )
        );
      } catch {
        return false;
      }
    },
    { message: 'Choose an implemented internal research route.' },
  );

/** A collection name: letters, digits, spaces and simple joiners, folded to lower case. */
export const ResearchTagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(24)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} &'-]*$/u, 'Use letters, digits and spaces.');
export const MAX_TAGS_PER_BOOKMARK = 6;
export const ResearchBookmarkSchema = z
  .object({
    kind: z.enum(['player', 'team', 'page', 'comparison', 'analysis']),
    label: z.string().trim().min(1).max(100),
    path: InternalResearchPathSchema,
    createdAt: z.iso.datetime(),
    /** The reader's own annotation; optional, so earlier version-1 files stay valid. */
    note: z.string().trim().max(500).optional(),
    /** Collections this item belongs to; optional, so earlier files stay valid. */
    tags: z
      .array(ResearchTagSchema)
      .min(1)
      .max(MAX_TAGS_PER_BOOKMARK)
      .refine((tags) => new Set(tags).size === tags.length, {
        message: 'Duplicate collections.',
      })
      .optional(),
  })
  .strict();
export type ResearchBookmark = z.infer<typeof ResearchBookmarkSchema>;
export const LocalResearchSchema = z
  .object({
    version: z.literal(1),
    bookmarks: z
      .array(ResearchBookmarkSchema)
      .max(100)
      .refine(
        (items) =>
          new Set(items.map((item) => `${item.kind}:${item.path}`)).size ===
          items.length,
        { message: 'Duplicate bookmarks.' },
      ),
  })
  .strict();
export type LocalResearch = z.infer<typeof LocalResearchSchema>;
export const MAX_RESEARCH_JSON_CHARS = 100_000;
