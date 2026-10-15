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
