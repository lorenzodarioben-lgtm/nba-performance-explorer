// Champions and individual awards for the archived seasons (1983-84 on). Champions are derived
// from the archive's own Finals games and checked against two other records; an award winner is
// listed only when two independent sources agree on the player and the season.
import { z } from 'zod';
import { ResearchPlayerIdSchema } from './research.js';
import {
  LeagueProvenanceSchema,
  LeagueSeasonLabelSchema,
  LeagueTeamRefSchema,
} from './league.js';

const Check = z
  .object({
    /** true: the record agrees; false: it disagrees; null: the record has nothing to say. */
    agrees: z.boolean().nullable(),
    detail: z.string().max(200),
  })
  .strict();
export const LeagueChampionSchema = z
  .object({
    season: LeagueSeasonLabelSchema,
    champion: LeagueTeamRefSchema,
    runnerUp: LeagueTeamRefSchema,
    /** Finals games won by each side, counted from the archived Finals games. */
    wins: z.number().int().min(0).max(4),
    losses: z.number().int().min(0).max(3),
    firstGame: z.string().regex(/^nba:00[1-6]\d{7}$/),
    lastGame: z.string().regex(/^nba:00[1-6]\d{7}$/),
    finalsMvp: z
      .object({ playerId: ResearchPlayerIdSchema, name: z.string().max(80) })
      .strict()
      .nullable(),
    checks: z
      .object({
        franchiseTitles: Check,
        franchiseSeason: Check,
        finalsMvpTeam: Check,
      })
      .strict(),
  })
  .strict();
export const LeagueHonoursResponseSchema = z
  .object({
    champions: z.array(LeagueChampionSchema).max(60),
    /** Seasons whose Finals the archive cannot settle (missing or unfinished games). */
    unsettled: z.array(z.string().max(200)).max(60),
    awards: z
      .array(
        z
          .object({
            id: z.string().max(20),
            label: z.string().max(60),
            /** First season the award was given (it may predate the archive). */
            since: LeagueSeasonLabelSchema,
            winners: z
              .array(
                z
                  .object({
                    season: LeagueSeasonLabelSchema,
                    playerId: ResearchPlayerIdSchema,
                    name: z.string().max(80),
                    team: z.string().max(80),
                  })
                  .strict(),
              )
              .max(120),
          })
          .strict(),
      )
      .max(10),
    /** Where the two award sources disagree or a winner could not be confirmed. */
    notes: z.array(z.string().max(300)).max(200),
    sources: z
      .array(
        z
          .object({
            label: z.string().max(120),
            url: z.string().url().max(300),
            retrievedAt: z.iso.datetime(),
          })
          .strict(),
      )
      .max(20),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueHonoursResponse = z.infer<typeof LeagueHonoursResponseSchema>;
