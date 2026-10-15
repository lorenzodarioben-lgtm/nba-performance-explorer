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
          /^\/(?:explore|my-nba|compare(?:\/recorded)?|discover(?:\/recorded)?|standings(?:\/(?:recorded|race))?|leaders(?:\/recorded)?|games(?:\/(?:nba:00423\d{5}|shooting|bracket))?|history(?:\/(?:\d{4}-\d{2}|records|calendar|awards|progression|draft))?|lab\/(?:compare|analytics|careers|teams|groups|recorded|profiles|shots|lineups|formulas|workbench)|teams(?:\/nba:[1-9]\d{0,11}(?:\/season)?)?|players\/[1-9]\d{0,11}(?:\/(?:insights|career|games|shooting|archive))?)?$/.test(
            url.pathname,
          )
        );
      } catch {
        return false;
      }
    },
    { message: 'Choose an implemented internal research route.' },
  );

export const ResearchBookmarkSchema = z
  .object({
    kind: z.enum(['player', 'team', 'page', 'comparison', 'analysis']),
    label: z.string().trim().min(1).max(100),
    path: InternalResearchPathSchema,
    createdAt: z.iso.datetime(),
    /** The reader's own annotation; optional, so earlier version-1 files stay valid. */
    note: z.string().trim().max(500).optional(),
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
