// League game API: date lists, calendars, game detail with box scores, and play-by-play with
// derived scoring analysis. Scores appear only when a source records them; live periods and
// clocks only when the source supplies them.
import { z } from 'zod';
import { CanonicalTeamIdSchema } from './team-directory.js';
import { ResearchPlayerIdSchema } from './research.js';
import { LeagueProvenanceSchema, LeagueTeamRefSchema } from './league.js';

export const LeagueGameIdSchema = z.string().regex(/^nba:00[1-6]\d{7}$/);
export const LeagueGameStatusSchema = z.enum([
  'scheduled',
  'live',
  'final',
  'postponed',
  'canceled',
  'unknown',
]);
export type LeagueGameStatus = z.infer<typeof LeagueGameStatusSchema>;
export const LeagueGameTypeSchema = z.enum([
  'preseason',
  'regular-season',
  'all-star',
  'playoffs',
  'play-in',
  'cup-final',
]);
const GameSideSchema = z
  .object({
    team: LeagueTeamRefSchema,
    /** Only when the source records a score: never for scheduled or postponed games. */
    score: z.number().int().nonnegative().nullable(),
    /** The W-L the source shows with the game (schedule or scoreboard), if any. */
    record: z.string().max(10).nullable(),
  })
  .strict();
export const LeagueGameSummarySchema = z
  .object({
    id: LeagueGameIdSchema,
    date: z.iso.date(),
    startTimeUtc: z.iso.datetime().nullable(),
    startTimeTbd: z.boolean(),
    status: LeagueGameStatusSchema,
    statusText: z.string().max(60),
    /** Live games only, and only when the source supplies them. */
    period: z.number().int().positive().nullable(),
    clock: z.string().max(10).nullable(),
    home: GameSideSchema,
    away: GameSideSchema,
    type: LeagueGameTypeSchema,
    label: z.string().max(80).nullable(),
    neutralSite: z.boolean(),
    overtimePeriods: z.number().int().nonnegative().nullable(),
    source: z.enum(['archive', 'schedule', 'scoreboard']),
    note: z.string().max(300).nullable(),
  })
  .strict();
export type LeagueGameSummary = z.infer<typeof LeagueGameSummarySchema>;

export const LeagueGamesQuerySchema = z
  .object({
    date: z.iso.date().optional(),
    team: CanonicalTeamIdSchema.optional(),
  })
  .strict();
export const LeagueGamesResponseSchema = z
  .object({
    date: z.iso.date(),
    games: z.array(LeagueGameSummarySchema).max(40),
    previousDate: z.iso.date().nullable(),
    nextDate: z.iso.date().nullable(),
    /** What the sources cover on this date, in words. */
    coverage: z.string().max(400),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueGamesResponse = z.infer<typeof LeagueGamesResponseSchema>;

export const LeagueCalendarQuerySchema = z
  .object({ month: z.string().regex(/^(19[4-9]\d|20[0-4]\d)-(0[1-9]|1[0-2])$/) })
  .strict();
export const LeagueCalendarResponseSchema = z
  .object({
    month: z.string(),
    days: z.array(
      z
        .object({
          date: z.iso.date(),
          games: z.number().int().nonnegative(),
          finals: z.number().int().nonnegative(),
          scheduled: z.number().int().nonnegative(),
          other: z.number().int().nonnegative(),
        })
        .strict(),
    ),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueCalendarResponse = z.infer<typeof LeagueCalendarResponseSchema>;

const BoxPlayerSchema = z
  .object({
    playerId: ResearchPlayerIdSchema,
    name: z.string().max(80),
    starter: z.boolean().nullable(),
    position: z.string().max(10).nullable(),
    status: z.enum(['played', 'did-not-play', 'inactive']),
    /** The source's own did-not-play or inactive note, when it gives a readable one. */
    note: z.string().max(80).nullable(),
    minutes: z.number().nonnegative().nullable(),
    stats: z.record(z.string(), z.number().nullable()),
  })
  .strict();
export const LeagueGameDetailResponseSchema = z
  .object({
    game: LeagueGameSummarySchema,
    box: z
      .object({
        source: z.enum(['archive', 'cdn', 'stats']),
        teams: z.array(
          z
            .object({
              team: LeagueTeamRefSchema,
              home: z.boolean(),
              players: z.array(BoxPlayerSchema).max(25),
              totals: z.record(z.string(), z.number().nullable()),
              /** Player points add up to the team's points. */
              addsUp: z.boolean(),
            })
            .strict(),
        ),
      })
      .strict()
      .nullable(),
    highs: z.array(
      z
        .object({
          key: z.string().max(10),
          label: z.string().max(40),
          value: z.number(),
          players: z.array(
            z
              .object({
                playerId: ResearchPlayerIdSchema,
                name: z.string().max(80),
                team: z.string().max(4),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
    lineScore: z
      .object({
        periods: z.array(
          z
            .object({
              period: z.number().int().positive(),
              home: z.number().int(),
              away: z.number().int(),
            })
            .strict(),
        ),
        source: z.enum(['cdn', 'scoreboard']),
      })
      .strict()
      .nullable(),
    venue: z
      .object({
        arena: z.string().max(100).nullable(),
        city: z.string().max(60).nullable(),
        attendance: z.number().int().nullable(),
        officials: z.array(z.string().max(60)).max(5),
      })
      .strict()
      .nullable(),
    notes: z.array(z.string().max(300)).max(10),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueGameDetailResponse = z.infer<typeof LeagueGameDetailResponseSchema>;

export const LeaguePlayEventTypeSchema = z.enum([
  'made-shot',
  'missed-shot',
  'free-throw',
  'rebound',
  'turnover',
  'steal',
  'block',
  'foul',
  'violation',
  'substitution',
  'timeout',
  'jump-ball',
  'period',
  'game',
  'other',
]);
export const LeaguePlayEventSchema = z
  .object({
    index: z.number().int().nonnegative(),
    period: z.number().int().positive(),
    /** Time left in the period, m:ss. */
    clock: z.string().max(10),
    /** Seconds from tip-off (12-minute quarters, 5-minute overtimes). */
    elapsed: z.number().nonnegative(),
    team: z.enum(['home', 'away']).nullable(),
    playerId: ResearchPlayerIdSchema.nullable(),
    player: z.string().max(80).nullable(),
    type: LeaguePlayEventTypeSchema,
    description: z.string().max(200),
    home: z.number().int().nonnegative(),
    away: z.number().int().nonnegative(),
    /** Points this event added (negative when the source corrects an earlier score). */
    points: z.number().int(),
    scoringTeam: z.enum(['home', 'away']).nullable(),
  })
  .strict();
export type LeaguePlayEvent = z.infer<typeof LeaguePlayEventSchema>;
export const LeagueRunSchema = z
  .object({
    team: z.enum(['home', 'away']),
    points: z.number().int().positive(),
    startIndex: z.number().int().nonnegative(),
    endIndex: z.number().int().nonnegative(),
    startScore: z.string().max(10),
    endScore: z.string().max(10),
    period: z.number().int().positive(),
  })
  .strict();
export type LeagueRun = z.infer<typeof LeagueRunSchema>;
export const LeaguePlayAnalysisSchema = z
  .object({
    leadChanges: z.number().int().nonnegative(),
    timesTied: z.number().int().nonnegative(),
    largestLead: z
      .object({
        home: z
          .object({ points: z.number().int(), atIndex: z.number().int().nullable() })
          .strict(),
        away: z
          .object({ points: z.number().int(), atIndex: z.number().int().nullable() })
          .strict(),
      })
      .strict(),
    /** Every run of at least `runThreshold` unanswered points, in order. */
    runs: z.array(LeagueRunSchema),
    runThreshold: z.number().int().positive(),
    biggestRun: z
      .object({ home: LeagueRunSchema.nullable(), away: LeagueRunSchema.nullable() })
      .strict(),
    periodScores: z.array(
      z
        .object({
          period: z.number().int().positive(),
          home: z.number().int(),
          away: z.number().int(),
        })
        .strict(),
    ),
    scoreCorrections: z.number().int().nonnegative(),
  })
  .strict();
export type LeaguePlayAnalysis = z.infer<typeof LeaguePlayAnalysisSchema>;
export const LeaguePlayByPlayResponseSchema = z
  .object({
    gameId: LeagueGameIdSchema,
    home: LeagueTeamRefSchema,
    away: LeagueTeamRefSchema,
    source: z.enum(['cdn', 'stats']),
    /** The final event's score matches the game's final score. */
    complete: z.boolean(),
    events: z.array(LeaguePlayEventSchema).max(1500),
    analysis: LeaguePlayAnalysisSchema,
    /** NBA.com's own counts for the same game, where its box score publishes them. */
    sourceCounts: z
      .object({
        leadChanges: z.number().int().nullable(),
        timesTied: z.number().int().nullable(),
        biggestLeadHome: z.number().int().nullable(),
        biggestLeadAway: z.number().int().nullable(),
        biggestRunHome: z.number().int().nullable(),
        biggestRunAway: z.number().int().nullable(),
      })
      .strict()
      .nullable(),
    checks: z.array(z.string().max(300)).max(10),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeaguePlayByPlayResponse = z.infer<typeof LeaguePlayByPlayResponseSchema>;

// ---- League snapshot ------------------------------------------------------------------------
export const LeagueSnapshotResponseSchema = z
  .object({
    /** The latest season with results, its last result date, and where the next season stands. */
    season: z.string().regex(/^\d{4}-\d{2}$/),
    asOf: z.iso.date(),
    current: z
      .object({
        season: z.string().max(10),
        phase: z.enum([
          'preseason',
          'regular-season',
          'postseason',
          'offseason',
          'unknown',
        ]),
        regularSeasonStart: z.iso.date().nullable(),
        gamesPlayed: z.number().int().nonnegative(),
      })
      .strict()
      .nullable(),
    conferenceLeaders: z.array(
      z
        .object({
          conference: z.enum(['East', 'West']),
          teams: z.array(
            z
              .object({
                rank: z.number().int().positive(),
                team: LeagueTeamRefSchema,
                wins: z.number().int(),
                losses: z.number().int(),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
    statLeaders: z.array(
      z
        .object({
          metric: z.string().max(30),
          label: z.string().max(40),
          value: z.number(),
          playerId: ResearchPlayerIdSchema,
          name: z.string().max(80),
          team: z.string().max(4),
        })
        .strict(),
    ),
    recent: z.array(LeagueGameSummarySchema).max(12),
    upcoming: z.array(LeagueGameSummarySchema).max(12),
    provenance: LeagueProvenanceSchema,
  })
  .strict();
export type LeagueSnapshotResponse = z.infer<typeof LeagueSnapshotResponseSchema>;

// ---- Source status ---------------------------------------------------------------------------
/**
 * archived: committed with the app (no network). current: answered within its cache window.
 * stale: last answer older than its freshness limit. unavailable: the latest request failed.
 * not-contacted: no request has been made since the server started.
 */
export const LeagueSourceStateSchema = z.enum([
  'archived',
  'current',
  'stale',
  'unavailable',
  'not-contacted',
]);
export const LeagueStatusResponseSchema = z
  .object({
    checkedAt: z.iso.datetime(),
    sources: z.array(
      z
        .object({
          id: z.string().max(30),
          name: z.string().max(80),
          state: LeagueSourceStateSchema,
          lastSuccessAt: z.iso.datetime().nullable(),
          lastFailureAt: z.iso.datetime().nullable(),
          lastFailure: z.string().max(200).nullable(),
          sourceUpdatedAt: z.iso.datetime().nullable(),
          freshnessSeconds: z.number().int().positive().nullable(),
          note: z.string().max(300),
        })
        .strict(),
    ),
  })
  .strict();
export type LeagueStatusResponse = z.infer<typeof LeagueStatusResponseSchema>;
