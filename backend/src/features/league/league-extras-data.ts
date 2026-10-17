// Storage format of the league archive's franchise and roster files, produced only by
// `backend/src/scripts/build-league-extras.ts` and validated on load.
import { z } from 'zod';

const NbaId = z.number().int().positive().max(9_999_999_999);
const Text = (max: number) => z.string().max(max);
const Request = z
  .object({
    endpoint: z.string().regex(/^[a-z0-9]+$/),
    retrievedAt: z.iso.datetime(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

const FranchiseTotals = z
  .object({
    teamId: NbaId,
    city: Text(60),
    name: Text(60),
    from: z.number().int(),
    to: z.number().int(),
    games: z.number().int().nonnegative(),
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
    playoffAppearances: z.number().int().nonnegative(),
    divisionTitles: z.number().int().nonnegative(),
    conferenceTitles: z.number().int().nonnegative(),
    leagueTitles: z.number().int().nonnegative(),
  })
  .strict();
const Title = z.object({ year: Text(10), opponent: Text(80).nullable() }).strict();
const Count = z.number().nonnegative().nullable();
/** One team season from NBA.com's team-by-year table, with its raw counts. */
const TeamYear = z
  .object({
    season: z.string().regex(/^\d{4}-\d{2}$/),
    city: Text(60),
    name: Text(60),
    gp: z.number().int().nonnegative(),
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
    conferenceRank: z.number().int().nullable(),
    divisionRank: z.number().int().nullable(),
    playoffWins: z.number().int().nullable(),
    playoffLosses: z.number().int().nullable(),
    finals: Text(30).nullable(),
    pts: Count,
    fgm: Count,
    fga: Count,
    fg3m: Count,
    fg3a: Count,
    ftm: Count,
    fta: Count,
    oreb: Count,
    dreb: Count,
    reb: Count,
    ast: Count,
    stl: Count,
    tov: Count,
    blk: Count,
    pf: Count,
  })
  .strict();
export type TeamYearRow = z.infer<typeof TeamYear>;

export const FranchiseArchiveSchema = z
  .object({
    kind: z.literal('nba-stats-franchises'),
    version: z.literal(1),
    builtAt: z.iso.datetime(),
    requests: z.array(Request),
    /** NBA.com's franchise history: one row per franchise plus one per city/name period. */
    franchiseHistory: z.array(FranchiseTotals),
    defunct: z.array(FranchiseTotals),
    /** Every season of the defunct early franchises, so league totals include them. */
    defunctSeasons: z.array(TeamYear.extend({ teamId: NbaId })),
    franchises: z.array(
      z
        .object({
          teamId: NbaId,
          abbreviation: Text(4).nullable(),
          city: Text(60).nullable(),
          nickname: Text(60).nullable(),
          yearFounded: z.number().int().nullable(),
          arena: Text(100).nullable(),
          /** Dated city and nickname periods, as NBA.com lists them. */
          identities: z.array(
            z
              .object({
                city: Text(60),
                nickname: Text(60),
                from: z.number().int(),
                to: z.number().int(),
              })
              .strict(),
          ),
          championships: z.array(Title),
          conferenceTitles: z.array(Title),
          divisionTitles: z.array(Title),
          retired: z.array(
            z
              .object({
                player: Text(80),
                playerId: z.number().int().nullable(),
                jersey: Text(10).nullable(),
                seasonsWithTeam: Text(40).nullable(),
                year: z.number().int().nullable(),
              })
              .strict(),
          ),
          seasons: z.array(TeamYear),
        })
        .strict(),
    ),
  })
  .strict();
export type FranchiseArchive = z.infer<typeof FranchiseArchiveSchema>;

export const SeasonRostersSchema = z
  .object({
    kind: z.literal('nba-stats-rosters'),
    version: z.literal(1),
    season: z.string().regex(/^\d{4}-\d{2}$/),
    requests: z.array(Request),
    teams: z.array(
      z
        .object({
          teamId: NbaId,
          players: z.array(
            z
              .object({
                playerId: NbaId,
                name: Text(80),
                number: Text(10).nullable(),
                position: Text(10).nullable(),
                height: Text(10).nullable(),
                weight: Text(10).nullable(),
                birthDate: Text(40).nullable(),
                age: z.number().nullable(),
                /** NBA.com's experience field: seasons before this one, or "R" for a rookie. */
                experience: Text(10).nullable(),
                school: Text(100).nullable(),
                howAcquired: Text(200).nullable(),
              })
              .strict(),
          ),
          coaches: z.array(
            z
              .object({
                name: Text(80),
                type: Text(60).nullable(),
                assistant: z.boolean(),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
  })
  .strict();
export type SeasonRosters = z.infer<typeof SeasonRostersSchema>;

export const ExtrasIndexSchema = z
  .object({
    kind: z.literal('nba-stats-league-extras'),
    version: z.literal(1),
    franchisesSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    rosters: z.array(
      z
        .object({
          season: z.string().regex(/^\d{4}-\d{2}$/),
          sha256: z.string().regex(/^[a-f0-9]{64}$/),
        })
        .strict(),
    ),
  })
  .strict();
export type ExtrasIndex = z.infer<typeof ExtrasIndexSchema>;
