import { z } from 'zod';
import {
  ArchiveGameSchema,
  ArchiveLeaderSchema,
  ArchiveStandingSchema,
  CanonicalTeamIdSchema,
} from '@nba-performance-explorer/contracts';
import type { WikiPage } from './wiki-client.js';

/**
 * A committed copy of the structured tables this app adapts from two Wikipedia articles (CC BY-SA
 * 4.0): the 2023-24 season standings and category leaders, and the 2024 playoff game boxes with
 * the seeds published in the series headings. Article prose and images are not stored. It lets
 * the historical playoff and league pages work when Wikipedia cannot be reached, and every
 * response served from it says so.
 */
const PageMetaSchema = z
  .object({
    title: z.enum(['2023–24 NBA season', '2024 NBA playoffs']),
    revision: z.number().int().positive(),
    retrievedAt: z.iso.datetime(),
  })
  .strict();
export const ArchiveSnapshotSchema = z
  .object({
    version: z.literal(1),
    createdAt: z.iso.datetime(),
    licence: z.literal('CC BY-SA 4.0'),
    league: z
      .object({
        page: PageMetaSchema,
        standings: z.array(ArchiveStandingSchema).length(30),
        leaders: z.array(ArchiveLeaderSchema).max(30),
      })
      .strict(),
    playoffs: z
      .object({
        page: PageMetaSchema,
        games: z.array(ArchiveGameSchema).min(1).max(110),
        seeds: z
          .record(CanonicalTeamIdSchema, z.number().int().min(1).max(10))
          .nullable(),
        seedIssue: z.string().max(300).nullable(),
      })
      .strict(),
  })
  .strict();
export type ArchiveSnapshot = z.infer<typeof ArchiveSnapshotSchema>;

/** A page stand-in for a snapshot section: same title and revision, no HTML, marked bundled. */
export function snapshotPage(meta: z.infer<typeof PageMetaSchema>): WikiPage {
  return { ...meta, html: '', bundled: true };
}
