import { z } from 'zod';
import { InternalResearchPathSchema } from './local-research.js';

// Statistical stories: the reader's own research write-ups, kept only in this browser. A story is
// an ordered list of sections; each is either the reader's text or a linked analysis (an
// internal research route with the reader's note). Linked analyses are re-read from the live
// tools when shown; nothing here stores statistics, so a story can never carry stale numbers
// presented as current.

export const StoryIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{7,39}$/);
/** No control characters except line breaks and tabs in reader-authored text. */
const prose = (max: number) =>
  z
    .string()
    .max(max)
    .refine(
      (s) =>
        !Array.from(s).some((ch) => {
          const code = ch.charCodeAt(0);
          return (
            (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127
          );
        }),
      { message: 'Text contains control characters.' },
    );

export const StoryTextSectionSchema = z
  .object({
    id: StoryIdSchema,
    kind: z.literal('text'),
    heading: prose(120),
    body: prose(4000),
  })
  .strict();
export const StoryAnalysisSectionSchema = z
  .object({
    id: StoryIdSchema,
    kind: z.literal('analysis'),
    title: prose(120).refine((s) => s.trim().length > 0, 'Give the analysis a title.'),
    path: InternalResearchPathSchema,
    note: prose(2000),
  })
  .strict();
export const StorySectionSchema = z.discriminatedUnion('kind', [
  StoryTextSectionSchema,
  StoryAnalysisSectionSchema,
]);
export type StorySection = z.infer<typeof StorySectionSchema>;

export const MAX_STORIES = 25;
export const MAX_STORY_SECTIONS = 30;
export const MAX_STORIES_JSON_CHARS = 300_000;

export const StorySchema = z
  .object({
    id: StoryIdSchema,
    title: prose(120).refine((s) => s.trim().length > 0, 'Give the story a title.'),
    dek: prose(300),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    sections: z
      .array(StorySectionSchema)
      .max(MAX_STORY_SECTIONS)
      .refine((s) => new Set(s.map((x) => x.id)).size === s.length, {
        message: 'Duplicate section IDs.',
      }),
  })
  .strict();
export type Story = z.infer<typeof StorySchema>;

export const StoriesFileSchema = z
  .object({
    version: z.literal(1),
    stories: z
      .array(StorySchema)
      .max(MAX_STORIES)
      .refine((s) => new Set(s.map((x) => x.id)).size === s.length, {
        message: 'Duplicate story IDs.',
      }),
  })
  .strict();
export type StoriesFile = z.infer<typeof StoriesFileSchema>;
