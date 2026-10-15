// League archive API: every NBA season the project has ingested from NBA.com Stats, with the
// checks that decide what each season can support. Distinct from the Wikipedia-based recorded
// 2023-24 archive, which keeps its own provenance and licence.
import { z } from 'zod';
import { CanonicalTeamIdSchema } from './team-directory.js';
import { ResearchPlayerIdSchema } from './research.js';

export const LeagueSeasonLabelSchema = z
  .string()
  .regex(/^(19[4-9]\d|20[0-4]\d)-\d{2}$/)
  .refine((s) => (Number(s.slice(0, 4)) + 1) % 100 === Number(s.slice(5)), {
    message: 'Season label years must be consecutive.',
  });
export const LeagueScopeSchema = z.enum(['regular-season', 'playoffs']);
export type LeagueScope = z.infer<typeof LeagueScopeSchema>;

/** Where a league response came from and how fresh it is. */
export const LeagueProvenanceSchema = z
  .object({
    source: z.literal('nba-stats'),
    /** committed-snapshot: built offline and shipped with the app; live: fetched for this
     * request; cached: a live response reused within its cache window. */
    mode: z.enum(['committed-snapshot', 'live', 'cached']),
    servedAt: z.iso.datetime(),
    /** When this project retrieved the data from NBA.com. */
    retrievedAt: z.iso.datetime().nullable(),
    /** A time the source itself reports for the data, when it reports one. */
    sourceUpdatedAt: z.iso.datetime().nullable(),
    coverage: z.string().max(600),
    warnings: z.array(z.string().max(600)).max(20),
  })
  .strict();
export type LeagueProvenance = z.infer<typeof LeagueProvenanceSchema>;

export const LeagueCapabilitiesSchema = z
  .object({
    /** Every game paired and the derived W-L agrees with any published standings. */
    teamResults: z.boolean(),
    /** At most 0.5% of box scores fail to add up to their team totals. */
    playerStats: z.boolean(),
    /** NBA.com publishes team ratings, pace and possessions (1996-97 on). */
    teamRatings: z.boolean(),
    /** NBA.com publishes player possession counts, the basis for per-100 rates. */
    playerPossessions: z.boolean(),
    /** NBA.com publishes a standings table for the season. */
    publishedStandings: z.boolean(),
  })
  .strict();

export const LeagueSeasonInfoSchema = z
  .object({
    season: LeagueSeasonLabelSchema,
    status: z.enum(['complete', 'partial']),
    notes: z.array(z.string().max(400)).max(20),
    teams: z.number().int().positive(),
    regularSeasonGames: z.number().int().nonnegative(),
    playoffGames: z.number().int().nonnegative(),
    incompleteBoxScores: z.number().int().nonnegative(),
    quarantinedGames: z.number().int().nonnegative(),
    firstDate: z.iso.date().nullable(),
    lastDate: z.iso.date().nullable(),
    retrievedAt: z.iso.datetime(),
    capabilities: LeagueCapabilitiesSchema,
  })
  .strict();
export type LeagueSeasonInfo = z.infer<typeof LeagueSeasonInfoSchema>;

export const LeagueSeasonsResponseSchema = z
  .object({
    seasons: z.array(LeagueSeasonInfoSchema),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueSeasonsResponse = z.infer<typeof LeagueSeasonsResponseSchema>;

export const LeagueTeamRefSchema = z
  .object({
    id: CanonicalTeamIdSchema,
    abbreviation: z.string().regex(/^[A-Z]{2,4}$/),
    name: z.string().min(1).max(60),
  })
  .strict();
export type LeagueTeamRef = z.infer<typeof LeagueTeamRefSchema>;

// ---- Standings ----------------------------------------------------------------------------
export const LeagueStandingsQuerySchema = z
  .object({ season: LeagueSeasonLabelSchema.optional() })
  .strict();
export const LeagueStandingRowSchema = z
  .object({
    rank: z.number().int().positive(),
    team: LeagueTeamRefSchema,
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
    winPercentage: z.number().min(0).max(1),
    gamesBehind: z.number().nonnegative(),
    division: z.string().max(40).nullable(),
    home: z.string().max(10).nullable(),
    road: z.string().max(10).nullable(),
    lastTen: z.string().max(10).nullable(),
    streak: z.string().max(10).nullable(),
    clinch: z.string().max(10).nullable(),
  })
  .strict();
export const LeagueStandingsResponseSchema = z
  .object({
    season: LeagueSeasonLabelSchema,
    /** published: NBA.com's standings table; derived: ranked here from paired results. */
    basis: z.enum(['published', 'derived']),
    conferences: z.array(
      z
        .object({
          /** League: seasons without a published table, when conference membership is unknown. */
          conference: z.enum(['East', 'West', 'League']),
          rows: z.array(LeagueStandingRowSchema),
        })
        .strict(),
    ),
    /** Present when the published table and the paired results were compared. */
    resultsAgreement: z
      .object({ teams: z.number().int(), agreeing: z.number().int() })
      .strict()
      .nullable(),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueStandingsResponse = z.infer<typeof LeagueStandingsResponseSchema>;

// ---- Player leaders -----------------------------------------------------------------------
export const LeagueLeaderMetricSchema = z.enum([
  'points',
  'rebounds',
  'assists',
  'steals',
  'blocks',
  'threesMade',
  'offensiveRebounds',
  'defensiveRebounds',
  'turnovers',
  'minutes',
  'gamesPlayed',
  'plusMinus',
  'fieldGoalPercentage',
  'threePointPercentage',
  'freeThrowPercentage',
  'trueShootingPercentage',
  'effectiveFieldGoalPercentage',
]);
export type LeagueLeaderMetric = z.infer<typeof LeagueLeaderMetricSchema>;
export const LeagueRateModeSchema = z.enum(['totals', 'per-game', 'per-36', 'per-100']);
export type LeagueRateMode = z.infer<typeof LeagueRateModeSchema>;

const boundedInt = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d{1,5}$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));

export const LeagueLeadersQuerySchema = z
  .object({
    season: LeagueSeasonLabelSchema.optional(),
    scope: LeagueScopeSchema.default('regular-season'),
    metric: LeagueLeaderMetricSchema.default('points'),
    mode: LeagueRateModeSchema.default('per-game'),
    team: CanonicalTeamIdSchema.optional(),
    /** Minimum games; defaults to 70% of the scope's most games played by a team. */
    minGames: boundedInt(0, 100).optional(),
    /** Minimum attempts for a shooting percentage; defaults scale with schedule length. */
    minAttempts: boundedInt(0, 5000).optional(),
    page: boundedInt(1, 100).prefault('1'),
  })
  .strict();
export type LeagueLeadersQuery = z.infer<typeof LeagueLeadersQuerySchema>;

export const LeagueLeaderRowSchema = z
  .object({
    rank: z.number().int().positive(),
    playerId: ResearchPlayerIdSchema,
    name: z.string().min(1).max(80),
    teams: z.array(LeagueTeamRefSchema).min(1).max(6),
    gamesPlayed: z.number().int().positive(),
    minutes: z.number().nonnegative().nullable(),
    value: z.number().finite(),
    /** The counting inputs behind the value, e.g. makes and attempts for a percentage. */
    inputs: z
      .array(z.object({ label: z.string().max(30), value: z.number() }).strict())
      .max(4),
    percentile: z.number().min(0).max(100),
  })
  .strict();
export const LeagueLeadersResponseSchema = z
  .object({
    query: z
      .object({
        season: LeagueSeasonLabelSchema,
        scope: LeagueScopeSchema,
        metric: LeagueLeaderMetricSchema,
        mode: LeagueRateModeSchema,
        team: CanonicalTeamIdSchema.nullable(),
        minGames: z.number().int().nonnegative(),
        minAttempts: z.number().int().nonnegative().nullable(),
        page: z.number().int().positive(),
      })
      .strict(),
    definition: z.string().max(400),
    qualification: z.string().max(400),
    rows: z.array(LeagueLeaderRowSchema).max(50),
    total: z.number().int().nonnegative(),
    population: z
      .object({
        players: z.number().int().nonnegative(),
        qualified: z.number().int().nonnegative(),
        belowGames: z.number().int().nonnegative(),
        belowAttempts: z.number().int().nonnegative(),
        missingInputs: z.number().int().nonnegative(),
      })
      .strict(),
    /** Modes this season and metric can support, with the reason a mode is unavailable. */
    modes: z.array(
      z
        .object({
          mode: LeagueRateModeSchema,
          available: z.boolean(),
          reason: z.string().max(200).nullable(),
        })
        .strict(),
    ),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueLeadersResponse = z.infer<typeof LeagueLeadersResponseSchema>;

// ---- Teams and franchises -----------------------------------------------------------------
export const LeagueTeamQuerySchema = z
  .object({ season: LeagueSeasonLabelSchema.optional() })
  .strict();
const WonLostSchema = z
  .object({
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
  })
  .strict();
const ShootingSchema = z
  .object({
    fieldGoal: z.number().min(0).max(1).nullable(),
    threePoint: z.number().min(0).max(1).nullable(),
    freeThrow: z.number().min(0).max(1).nullable(),
    effectiveFieldGoal: z.number().min(0).max(1.5).nullable(),
    trueShooting: z.number().min(0).max(1.5).nullable(),
  })
  .strict();
/** Season totals with the per-game value of each; null where the source did not record it. */
const BoxTotalsSchema = z.array(
  z
    .object({
      key: z.string().max(10),
      label: z.string().max(40),
      total: z.number().nullable(),
      perGame: z.number().nullable(),
    })
    .strict(),
);
const TitleSchema = z
  .object({ year: z.string().max(10), opponent: z.string().max(80).nullable() })
  .strict();

export const LeagueTeamResponseSchema = z
  .object({
    team: LeagueTeamRefSchema,
    franchise: z
      .object({
        founded: z.number().int().nullable(),
        arena: z.string().max(100).nullable(),
        /** City and nickname periods derived from the season-by-season names. */
        identities: z.array(
          z
            .object({
              city: z.string().max(60),
              name: z.string().max(60),
              firstSeason: LeagueSeasonLabelSchema,
              lastSeason: LeagueSeasonLabelSchema,
              seasons: z.number().int().positive(),
            })
            .strict(),
        ),
        totals: z
          .object({
            games: z.number().int().nonnegative(),
            wins: z.number().int().nonnegative(),
            losses: z.number().int().nonnegative(),
            playoffAppearances: z.number().int().nonnegative(),
            divisionTitles: z.number().int().nonnegative(),
            conferenceTitles: z.number().int().nonnegative(),
            leagueTitles: z.number().int().nonnegative(),
          })
          .strict()
          .nullable(),
        championships: z.array(TitleSchema),
        conferenceTitles: z.array(TitleSchema),
        divisionTitles: z.array(TitleSchema),
        seasons: z.array(
          z
            .object({
              season: LeagueSeasonLabelSchema,
              name: z.string().max(80),
              wins: z.number().int().nonnegative(),
              losses: z.number().int().nonnegative(),
              winPercentage: z.number().min(0).max(1),
              conferenceRank: z.number().int().nullable(),
              divisionRank: z.number().int().nullable(),
              playoffWins: z.number().int().nullable(),
              playoffLosses: z.number().int().nullable(),
              finals: z.string().max(30).nullable(),
              archived: z.boolean(),
            })
            .strict(),
        ),
        notable: z.array(
          z
            .object({
              label: z.string().max(60),
              value: z.string().max(40),
              seasons: z.array(LeagueSeasonLabelSchema).max(10),
            })
            .strict(),
        ),
      })
      .strict()
      .nullable(),
    /** Archived seasons in which this team ID played, oldest first. */
    seasons: z.array(LeagueSeasonLabelSchema),
    season: z
      .object({
        season: LeagueSeasonLabelSchema,
        team: LeagueTeamRefSchema,
        record: z
          .object({
            overall: WonLostSchema,
            home: WonLostSchema,
            road: WonLostSchema,
            neutral: WonLostSchema,
          })
          .strict(),
        standing: z
          .object({
            conference: z.enum(['East', 'West']),
            rank: z.number().int().positive().nullable(),
            division: z.string().max(40),
            divisionRank: z.number().int().positive().nullable(),
            gamesBehind: z.number().nonnegative().nullable(),
          })
          .strict()
          .nullable(),
        playoffs: z
          .object({
            wins: z.number().int(),
            losses: z.number().int(),
            games: z.number().int(),
          })
          .strict()
          .nullable(),
        totals: z.object({ team: BoxTotalsSchema, opponent: BoxTotalsSchema }).strict(),
        shooting: z.object({ team: ShootingSchema, opponent: ShootingSchema }).strict(),
        ratings: z
          .object({
            offRating: z.number(),
            defRating: z.number(),
            netRating: z.number(),
            pace: z.number(),
            possessions: z.number().nonnegative(),
          })
          .strict()
          .nullable(),
        ratingsNote: z.string().max(400),
        leaders: z.array(
          z
            .object({
              key: z.string().max(10),
              label: z.string().max(40),
              rows: z
                .array(
                  z
                    .object({
                      playerId: ResearchPlayerIdSchema,
                      name: z.string().max(80),
                      gamesPlayed: z.number().int().positive(),
                      total: z.number(),
                      perGame: z.number(),
                    })
                    .strict(),
                )
                .max(3),
            })
            .strict(),
        ),
        roster: z
          .object({
            listed: z.number().int().nonnegative(),
            appeared: z.number().int().nonnegative(),
            listedWhoAppeared: z.number().int().nonnegative(),
            positions: z.array(
              z.object({ label: z.string().max(10), count: z.number().int() }).strict(),
            ),
            experience: z.array(
              z.object({ label: z.string().max(20), count: z.number().int() }).strict(),
            ),
            age: z
              .object({
                min: z.number(),
                median: z.number(),
                max: z.number(),
                known: z.number().int(),
              })
              .strict()
              .nullable(),
            players: z.array(
              z
                .object({
                  playerId: ResearchPlayerIdSchema,
                  name: z.string().max(80),
                  number: z.string().max(10).nullable(),
                  position: z.string().max(10).nullable(),
                  age: z.number().nullable(),
                  experience: z.string().max(10).nullable(),
                  gamesPlayed: z.number().int().nonnegative(),
                })
                .strict(),
            ),
            coaches: z.array(z.string().max(120)).max(20),
          })
          .strict()
          .nullable(),
      })
      .strict()
      .nullable(),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueTeamResponse = z.infer<typeof LeagueTeamResponseSchema>;

// ---- Record book and progression -----------------------------------------------------------
export const LeagueRecordCategorySchema = z.enum([
  'points',
  'rebounds',
  'assists',
  'steals',
  'blocks',
  'threesMade',
  'fieldGoalsMade',
  'freeThrowsMade',
  'offensiveRebounds',
]);
export type LeagueRecordCategory = z.infer<typeof LeagueRecordCategorySchema>;
export const LeagueRecordsQuerySchema = z
  .object({
    scope: LeagueScopeSchema.default('regular-season'),
    kind: z.enum(['game', 'season']).default('game'),
    category: LeagueRecordCategorySchema.default('points'),
    /** Season records only: season total or per game (qualified). */
    mode: z.enum(['totals', 'per-game']).default('totals'),
  })
  .strict();
export type LeagueRecordsQuery = z.infer<typeof LeagueRecordsQuerySchema>;
const RecordEntrySchema = z
  .object({
    rank: z.number().int().positive(),
    value: z.number(),
    playerId: ResearchPlayerIdSchema,
    name: z.string().max(80),
    season: LeagueSeasonLabelSchema,
    teams: z.array(LeagueTeamRefSchema).min(1).max(6),
    /** Single-game records only. */
    game: z
      .object({
        id: z.string().regex(/^00[1-6]\d{7}$/),
        date: z.iso.date(),
        opponent: LeagueTeamRefSchema,
        home: z.boolean(),
        won: z.boolean(),
      })
      .strict()
      .nullable(),
    gamesPlayed: z.number().int().positive().nullable(),
  })
  .strict();
export const LeagueRecordsResponseSchema = z
  .object({
    query: z
      .object({
        scope: LeagueScopeSchema,
        kind: z.enum(['game', 'season']),
        category: LeagueRecordCategorySchema,
        mode: z.enum(['totals', 'per-game']),
      })
      .strict(),
    definition: z.string().max(400),
    coverage: z
      .object({
        included: z.array(LeagueSeasonLabelSchema),
        excluded: z.array(
          z
            .object({ season: LeagueSeasonLabelSchema, reason: z.string().max(200) })
            .strict(),
        ),
      })
      .strict(),
    /** The top ten, plus every performance tied with the tenth. */
    records: z.array(RecordEntrySchema).max(60),
    /** Each performance that set or tied the best mark so far, in date order. */
    progression: z
      .array(RecordEntrySchema.extend({ kind: z.enum(['first', 'new', 'tie']) }))
      .max(200),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueRecordsResponse = z.infer<typeof LeagueRecordsResponseSchema>;

// ---- Team rankings ------------------------------------------------------------------------
export const LeagueTeamMetricSchema = z.enum([
  'winPercentage',
  'pointsPerGame',
  'opponentPointsPerGame',
  'pointDifferential',
  'offensiveRating',
  'defensiveRating',
  'netRating',
  'pace',
  'fieldGoalPercentage',
  'threePointPercentage',
  'freeThrowPercentage',
  'trueShootingPercentage',
  'reboundsPerGame',
  'assistsPerGame',
  'turnoversPerGame',
]);
export type LeagueTeamMetric = z.infer<typeof LeagueTeamMetricSchema>;
export const LeagueTeamRankingsQuerySchema = z
  .object({
    season: LeagueSeasonLabelSchema.optional(),
    scope: LeagueScopeSchema.default('regular-season'),
    metric: LeagueTeamMetricSchema.default('netRating'),
  })
  .strict();
export const LeagueTeamRankingsResponseSchema = z
  .object({
    query: z
      .object({
        season: LeagueSeasonLabelSchema,
        scope: LeagueScopeSchema,
        metric: LeagueTeamMetricSchema,
      })
      .strict(),
    definition: z.string().max(400),
    /** Lower is better for allowed points, defensive rating and turnovers: rank 1 is lowest. */
    direction: z.enum(['higher-is-better', 'lower-is-better']),
    rows: z.array(
      z
        .object({
          rank: z.number().int().positive(),
          team: LeagueTeamRefSchema,
          gamesPlayed: z.number().int().positive(),
          wins: z.number().int().nonnegative(),
          losses: z.number().int().nonnegative(),
          value: z.number(),
        })
        .strict(),
    ),
    unavailable: z.string().max(300).nullable(),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueTeamRankingsResponse = z.infer<
  typeof LeagueTeamRankingsResponseSchema
>;
