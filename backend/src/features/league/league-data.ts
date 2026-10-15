// Storage format of the committed NBA.com Stats league archive. One season is two gzip files:
// `<season>.summary.json.gz` (teams, standings, season totals, ratings, checks) and
// `<season>.games.json.gz` (every paired game, team lines and player box lines). Both are
// produced only by `backend/src/scripts/build-league-archive.ts` and validated on load.
import { z } from 'zod';

export const LEAGUE_SCOPES = ['regular-season', 'playoffs'] as const;
export type LeagueScope = (typeof LEAGUE_SCOPES)[number];

/** Box-score counting fields in the fixed order every compact line uses. */
export const LINE_FIELDS = [
  'min',
  'fgm',
  'fga',
  'fg3m',
  'fg3a',
  'ftm',
  'fta',
  'oreb',
  'dreb',
  'reb',
  'ast',
  'stl',
  'blk',
  'tov',
  'pf',
  'pts',
  'pm',
] as const;
export type LineField = (typeof LINE_FIELDS)[number];
/** A compact box line: one value per LINE_FIELDS entry; null means the source did not record it. */
export type Line = (number | null)[];

/** NBA season label, e.g. 2024-25. */
export const SeasonLabelSchema = z
  .string()
  .regex(/^(19[4-9]\d|20[0-4]\d)-\d{2}$/)
  .refine((s) => (Number(s.slice(0, 4)) + 1) % 100 === Number(s.slice(5)));

const LineSchema = z.array(z.number().finite().nullable()).length(LINE_FIELDS.length);
const NbaIdSchema = z.number().int().positive().max(9_999_999_999);
const GameIdSchema = z.string().regex(/^00[1-6]\d{7}$/);
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const SourceRequestSchema = z
  .object({
    endpoint: z.string().regex(/^[a-z0-9]+$/),
    params: z.record(z.string(), z.string()),
    retrievedAt: z.iso.datetime(),
    rows: z.number().int().nonnegative(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

const QuarantineSchema = z
  .object({ gameId: GameIdSchema, reason: z.string().max(200) })
  .strict();

const TeamSeasonSchema = z
  .object({
    teamId: NbaIdSchema,
    gp: z.number().int().nonnegative(),
    w: z.number().int().nonnegative(),
    l: z.number().int().nonnegative(),
    totals: LineSchema,
    opponent: LineSchema,
  })
  .strict();

const PlayerStintSchema = z
  .object({
    playerId: NbaIdSchema,
    teamId: NbaIdSchema,
    gp: z.number().int().positive(),
    totals: LineSchema,
    firstGame: DateSchema,
    lastGame: DateSchema,
  })
  .strict();

const ScopeSummarySchema = z
  .object({
    gameCount: z.number().int().nonnegative(),
    quarantined: z.array(QuarantineSchema),
    /** Paired games whose player lines do not add up to the team line (box incomplete). */
    incompleteBoxGames: z.array(GameIdSchema),
    teams: z.array(TeamSeasonSchema),
    players: z.array(PlayerStintSchema),
    /** NBA.com's own season totals compared with the sum of the archived box lines. */
    sourceTotalsCheck: z
      .object({
        compared: z.number().int().nonnegative(),
        matched: z.number().int().nonnegative(),
        /** Same games played, every differing count within 2: NBA.com restated one feed only. */
        restatements: z.number().int().nonnegative(),
        mismatches: z.array(z.string().max(200)).max(80),
      })
      .strict()
      .nullable(),
    firstDate: DateSchema.nullable(),
    lastDate: DateSchema.nullable(),
    /** NBA.com's own possession count per player for the whole scope (all teams combined). */
    playerPossessions: z
      .array(z.tuple([NbaIdSchema, z.number().nonnegative()]))
      .nullable(),
  })
  .strict();
export type ScopeSummary = z.infer<typeof ScopeSummarySchema>;

const StandingSchema = z
  .object({
    teamId: NbaIdSchema,
    conference: z.enum(['East', 'West']),
    division: z.string().max(40),
    playoffRank: z.number().int().positive().nullable(),
    divisionRank: z.number().int().positive().nullable(),
    wins: z.number().int().nonnegative(),
    losses: z.number().int().nonnegative(),
    home: z.string().max(10),
    road: z.string().max(10),
    lastTen: z.string().max(10).nullable(),
    streak: z.string().max(10).nullable(),
    conferenceGamesBack: z.number().nonnegative().nullable(),
    clinch: z.string().max(10).nullable(),
  })
  .strict();

const TeamRatingSchema = z
  .object({
    teamId: NbaIdSchema,
    gp: z.number().int().nonnegative(),
    minutes: z.number().nonnegative(),
    offRating: z.number(),
    defRating: z.number(),
    netRating: z.number(),
    pace: z.number(),
    possessions: z.number().nonnegative(),
  })
  .strict();
export type TeamRating = z.infer<typeof TeamRatingSchema>;

const PlayerSeasonMetaSchema = z
  .object({
    playerId: NbaIdSchema,
    name: z.string().min(1).max(80),
    age: z.number().nullable(),
  })
  .strict();

export const LeagueSeasonSummarySchema = z
  .object({
    kind: z.literal('nba-stats-league-season'),
    version: z.literal(1),
    season: SeasonLabelSchema,
    builtAt: z.iso.datetime(),
    status: z.enum(['complete', 'partial']),
    statusNotes: z.array(z.string().max(300)).max(20),
    source: z
      .object({
        name: z.literal('NBA.com Stats'),
        requests: z.array(SourceRequestSchema),
      })
      .strict(),
    teams: z.array(
      z
        .object({
          teamId: NbaIdSchema,
          abbreviation: z.string().regex(/^[A-Z]{2,4}$/),
          name: z.string().min(1).max(60),
        })
        .strict(),
    ),
    players: z.array(PlayerSeasonMetaSchema),
    scopes: z
      .object({
        'regular-season': ScopeSummarySchema,
        playoffs: ScopeSummarySchema.nullable(),
      })
      .strict(),
    standings: z.array(StandingSchema).nullable(),
    teamRatings: z
      .object({
        'regular-season': z.array(TeamRatingSchema),
        playoffs: z.array(TeamRatingSchema).nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type LeagueSeasonSummary = z.infer<typeof LeagueSeasonSummarySchema>;

const GameRowSchema = z.tuple([
  GameIdSchema,
  DateSchema,
  NbaIdSchema, // home team
  NbaIdSchema, // away team
  z.number().int().nonnegative(), // home points
  z.number().int().nonnegative(), // away points
  // 1 = neutral site: NBA.com lists both teams as visitors; home is the designated home team
  // taken from NBA.com's box score for that game.
  z.union([z.literal(0), z.literal(1)]),
]);
const ScopeGamesSchema = z
  .object({
    games: z.array(GameRowSchema),
    teamLines: z.array(
      z.tuple([GameIdSchema, NbaIdSchema]).rest(z.number().finite().nullable()),
    ),
    playerLines: z.array(
      z
        .tuple([GameIdSchema, NbaIdSchema, NbaIdSchema])
        .rest(z.number().finite().nullable()),
    ),
  })
  .strict();
export type ScopeGames = z.infer<typeof ScopeGamesSchema>;
export const LeagueSeasonGamesSchema = z
  .object({
    kind: z.literal('nba-stats-league-games'),
    version: z.literal(1),
    season: SeasonLabelSchema,
    scopes: z
      .object({
        'regular-season': ScopeGamesSchema,
        playoffs: ScopeGamesSchema.nullable(),
      })
      .strict(),
  })
  .strict();
export type LeagueSeasonGames = z.infer<typeof LeagueSeasonGamesSchema>;

export const LeagueIndexSchema = z
  .object({
    kind: z.literal('nba-stats-league-index'),
    version: z.literal(1),
    builtAt: z.iso.datetime(),
    seasons: z.array(
      z
        .object({
          season: SeasonLabelSchema,
          status: z.enum(['complete', 'partial']),
          summarySha256: z.string().regex(/^[a-f0-9]{64}$/),
          gamesSha256: z.string().regex(/^[a-f0-9]{64}$/),
        })
        .strict(),
    ),
  })
  .strict();
export type LeagueIndex = z.infer<typeof LeagueIndexSchema>;

/** Reads one field from a compact line. */
export const lineValue = (line: Line, field: LineField) =>
  line[LINE_FIELDS.indexOf(field)] ?? null;
