import { z } from 'zod';
import { DataProvenanceSchema } from './research.js';

export const CanonicalTeamIdSchema = z.string().regex(/^nba:[1-9]\d{0,11}$/);
export const DirectoryTeamSchema = z
  .object({
    id: CanonicalTeamIdSchema,
    sourceId: z.string().regex(/^[1-9]\d{0,11}$/),
    abbreviation: z.string().regex(/^[A-Z]{3}$/),
    name: z.string().min(1).max(100),
  })
  .strict()
  .refine((team) => team.id === `nba:${team.sourceId}`, {
    message: 'Canonical NBA identity must match source ID.',
  });
export type DirectoryTeam = z.infer<typeof DirectoryTeamSchema>;
export const TeamDirectoryResponseSchema = z
  .object({
    teams: z
      .array(DirectoryTeamSchema)
      .max(30)
      .refine(
        (teams) =>
          new Set(teams.map((t) => t.id)).size === teams.length &&
          new Set(teams.map((t) => t.abbreviation)).size === teams.length,
        { message: 'Directory teams must be unique.' },
      ),
    provenance: DataProvenanceSchema,
  })
  .strict();
export const TeamDetailResponseSchema = z
  .object({
    team: DirectoryTeamSchema,
    provenance: DataProvenanceSchema,
    availability: z
      .object({
        roster: z.literal(false),
        schedule: z.literal(false),
        statistics: z.literal(false),
        reason: z.string(),
      })
      .strict(),
  })
  .strict();
