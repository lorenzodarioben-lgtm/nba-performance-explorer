// Games by date, a month calendar, game detail and play-by-play. Finished seasons come from the
// committed archive (works offline); the current season comes from NBA.com's live schedule and
// today's scoreboard, which supply scheduled, live, final and postponed states. A source's own
// state is reported, never inferred from the clock.
import {
  LeagueCalendarResponseSchema,
  LeagueGameDetailResponseSchema,
  LeagueGamesResponseSchema,
  LeaguePlayByPlayResponseSchema,
  LeagueStatusResponseSchema,
  LeagueSnapshotResponseSchema,
  LeagueStandingsResponseSchema,
  type LeagueCalendarResponse,
  type LeagueGameDetailResponse,
  type LeagueGameStatus,
  type LeagueGameSummary,
  type LeagueGamesResponse,
  type LeaguePlayByPlayResponse,
  type LeagueProvenance,
  type LeagueStatusResponse,
  type LeagueSnapshotResponse,
  type LeagueStandingsResponse,
  type LeagueTeamRef,
} from '@nba-performance-explorer/contracts';
import { LINE_FIELDS, type Line } from './league-data.js';
import type { LiveResult, NbaLiveClient } from './league-live.js';
import { analyse, readCdnActions, readV3Actions, toEvents } from './league-pbp.js';
import { LeagueRequestError, type LeagueService } from './league-service.js';

type GameType = LeagueGameSummary['type'];
const TYPE_BY_DIGIT: Record<string, GameType> = {
  '1': 'preseason',
  '2': 'regular-season',
  '3': 'all-star',
  '4': 'playoffs',
  '5': 'play-in',
  '6': 'cup-final',
};
const STAT_KEYS = [
  'min',
  'pts',
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
  'pm',
] as const;
const HIGHS: [string, string][] = [
  ['pts', 'Points'],
  ['reb', 'Rebounds'],
  ['ast', 'Assists'],
  ['stl', 'Steals'],
  ['blk', 'Blocks'],
  ['fg3m', '3-pointers made'],
];
/** A readable did-not-play note, or null: some upstream comments are corrupted. */
const cleanNote = (v: unknown) => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return /^(DNP|DND|NWT|NBA|INACTIVE)[\w ]*( - [A-Za-z' ]{2,40})?$/.test(t)
    ? t.slice(0, 80)
    : null;
};
const seasonOfDate = (date: string) => {
  const y = Number(date.slice(0, 4)),
    m = Number(date.slice(5, 7));
  const start = m >= 9 ? y : y - 1;
  return [start - 1, start].map(
    (s) => `${s}-${String((s + 1) % 100).padStart(2, '0')}`,
  );
};

interface ScheduleGame {
  gameId: string;
  gameStatus: number;
  gameStatusText: string;
  gameDateEst: string;
  gameDateTimeUTC: string;
  gameTimeEst?: string;
  postponedStatus?: string;
  isNeutral?: boolean;
  gameLabel?: string;
  gameSubLabel?: string;
  homeTeam: {
    teamId: number;
    teamTricode: string;
    teamCity: string;
    teamName: string;
    wins?: number;
    losses?: number;
    score?: number;
  };
  awayTeam: ScheduleGame['homeTeam'];
  period?: number;
  gameClock?: string;
}

export class LeagueGames {
  private readonly dateIndex = new Map<string, Map<string, LeagueGameSummary[]>>();

  constructor(
    private readonly league: LeagueService,
    private readonly live: NbaLiveClient | undefined,
  ) {}

  private teamRef(season: string, teamId: number): LeagueTeamRef {
    const t = this.league.archive.has(season)
      ? this.league.archive.team(season, teamId)
      : null;
    return {
      id: `nba:${teamId}`,
      abbreviation: t?.abbreviation ?? 'UNK',
      name: t?.name ?? `Team ${teamId}`,
    };
  }

  /** Archived games of a season keyed by date (regular season, playoffs and quarantined). */
  private seasonDates(season: string) {
    const hit = this.dateIndex.get(season);
    if (hit) return hit;
    const map = new Map<string, LeagueGameSummary[]>();
    const add = (g: LeagueGameSummary) =>
      map.set(g.date, [...(map.get(g.date) ?? []), g]);
    const archive = this.league.archive;
    const s = archive.summary(season);
    for (const scope of ['regular-season', 'playoffs'] as const) {
      const data = archive.seasonGames(season).scopes[scope];
      if (!data) continue;
      const minutes = new Map(
        data.teamLines.map((l) => [
          `${l[0]}|${l[1]}`,
          l[2 + LINE_FIELDS.indexOf('min')] as number | null,
        ]),
      );
      for (const [id, date, home, away, hp, ap, neutral] of data.games) {
        const min = minutes.get(`${id}|${home}`);
        add({
          id: `nba:${id}`,
          date,
          startTimeUtc: null,
          startTimeTbd: false,
          status: 'final',
          statusText: 'Final',
          period: null,
          clock: null,
          home: { team: this.teamRef(season, home), score: hp, record: null },
          away: { team: this.teamRef(season, away), score: ap, record: null },
          type: TYPE_BY_DIGIT[id[2]!] ?? 'regular-season',
          label: null,
          neutralSite: neutral === 1,
          // Team minutes: 240 in regulation, 25 more for each overtime period.
          overtimePeriods:
            typeof min === 'number' && min >= 240 ? Math.round((min - 240) / 25) : null,
          source: 'archive',
          note:
            neutral === 1
              ? 'Neutral site; home is NBA.com’s designated home team.'
              : null,
        });
      }
      for (const q of s.scopes[scope]?.quarantined ?? []) {
        if (!q.date || q.teamIds.length !== 2) continue;
        const notPlayed = /not played/.test(q.reason);
        add({
          id: `nba:${q.gameId}`,
          date: q.date,
          startTimeUtc: null,
          startTimeTbd: false,
          status: notPlayed ? 'canceled' : 'unknown',
          statusText: notPlayed ? 'Not played' : 'Unverified',
          period: null,
          clock: null,
          home: {
            team: this.teamRef(season, q.teamIds[0]!),
            score: null,
            record: null,
          },
          away: {
            team: this.teamRef(season, q.teamIds[1]!),
            score: null,
            record: null,
          },
          type: TYPE_BY_DIGIT[q.gameId[2]!] ?? 'regular-season',
          label: null,
          neutralSite: false,
          overtimePeriods: null,
          source: 'archive',
          note: notPlayed
            ? 'NBA.com lists this game without a score: it was never played. Home and away are not given for it.'
            : `Quarantined in the archive: ${q.reason}.`,
        });
      }
    }
    this.dateIndex.set(season, map);
    return map;
  }

  private scheduleSummary(g: ScheduleGame, overlay?: ScheduleGame): LeagueGameSummary {
    const src = overlay ?? g;
    const text = src.gameStatusText.trim();
    const postponed = g.postponedStatus === 'Y' || /PPD|postpon/i.test(text);
    const canceled = /cancel/i.test(text);
    const status: LeagueGameStatus = postponed
      ? 'postponed'
      : canceled
        ? 'canceled'
        : src.gameStatus === 3
          ? 'final'
          : src.gameStatus === 2
            ? 'live'
            : src.gameStatus === 1
              ? 'scheduled'
              : 'unknown';
    const scored = status === 'live' || status === 'final';
    const side = (t: ScheduleGame['homeTeam']) => ({
      team: {
        id: `nba:${t.teamId}`,
        abbreviation: t.teamTricode,
        name: `${t.teamCity} ${t.teamName}`.trim(),
      },
      score: scored && typeof t.score === 'number' ? t.score : null,
      record:
        typeof t.wins === 'number' && typeof t.losses === 'number'
          ? `${t.wins}-${t.losses}`
          : null,
    });
    const ot = /OT/.exec(text)
      ? Number(/(\d)OT/.exec(text)?.[1] ?? 1)
      : status === 'final'
        ? 0
        : null;
    const clock =
      overlay && status === 'live'
        ? (/^PT(\d+)M(\d+)/.exec(overlay.gameClock ?? '') ?? null)
        : null;
    return {
      id: `nba:${g.gameId}`,
      date: g.gameDateEst.slice(0, 10),
      startTimeUtc:
        g.gameDateTimeUTC && !/TBD/i.test(text)
          ? new Date(g.gameDateTimeUTC).toISOString()
          : null,
      startTimeTbd: /TBD/i.test(text),
      status,
      statusText: text.slice(0, 60),
      period: status === 'live' && overlay?.period ? overlay.period : null,
      clock: clock ? `${Number(clock[1])}:${clock[2]}` : null,
      home: side(src.homeTeam),
      away: side(src.awayTeam),
      type: TYPE_BY_DIGIT[g.gameId[2]!] ?? 'regular-season',
      label:
        [g.gameLabel, g.gameSubLabel].filter(Boolean).join(' · ').slice(0, 80) || null,
      neutralSite: Boolean(g.isNeutral),
      overtimePeriods: ot,
      source: overlay ? 'scoreboard' : 'schedule',
      note: postponed ? 'NBA.com marks this game postponed.' : null,
    };
  }

  /** The current season's schedule, overlaid with today's scoreboard; null when unreachable. */
  private async current(): Promise<{
    games: LeagueGameSummary[];
    season: string;
    schedule: LiveResult<unknown>;
    board: LiveResult<unknown> | null;
  } | null> {
    if (!this.live) return null;
    let schedule: LiveResult<unknown>;
    try {
      schedule = await this.live.schedule();
    } catch {
      return null;
    }
    const ls = (
      schedule.value as {
        leagueSchedule?: {
          seasonYear?: string;
          gameDates?: { games: ScheduleGame[] }[];
        };
      }
    ).leagueSchedule;
    if (!ls?.gameDates) return null;
    let board: LiveResult<unknown> | null;
    try {
      board = await this.live.scoreboard();
    } catch {
      board = null;
    }
    const today = new Map(
      (
        (board?.value as { scoreboard?: { games?: ScheduleGame[] } })?.scoreboard
          ?.games ?? []
      ).map((g) => [g.gameId, g]),
    );
    const games = ls.gameDates
      .flatMap((d) => d.games)
      .filter((g) => /^00[1-6]\d{7}$/.test(g.gameId))
      .map((g) => this.scheduleSummary(g, today.get(g.gameId)));
    return { games, season: ls.seasonYear ?? '', schedule, board };
  }

  private liveProvenance(
    r: LiveResult<unknown> | null,
    coverage: string,
    warnings: string[] = [],
  ): LeagueProvenance {
    return {
      source: 'nba-stats',
      mode: r ? (r.cached ? 'cached' : 'live') : 'committed-snapshot',
      servedAt: new Date().toISOString(),
      retrievedAt: r?.retrievedAt ?? null,
      sourceUpdatedAt: r?.sourceUpdatedAt ?? null,
      coverage: coverage.slice(0, 600),
      warnings: warnings.slice(0, 20),
    };
  }

  async games(
    dateArg: string | undefined,
    team: string | undefined,
  ): Promise<LeagueGamesResponse> {
    const current = await this.current();
    const archive = this.league.archive;
    const lastArchived = archive.summary(archive.seasons.at(-1)!);
    const fallbackDate =
      lastArchived.scopes.playoffs?.lastDate ??
      lastArchived.scopes['regular-season'].lastDate!;
    const todayBoard = (current?.board?.value as { scoreboard?: { gameDate?: string } })
      ?.scoreboard?.gameDate;
    const date =
      dateArg ??
      (todayBoard && /^\d{4}-\d{2}-\d{2}$/.test(todayBoard)
        ? todayBoard
        : fallbackDate);
    const fromArchive = seasonOfDate(date)
      .filter((s) => archive.has(s))
      .flatMap((s) => this.seasonDates(s).get(date) ?? []);
    const fromLive =
      current?.games.filter(
        (g) => g.date === date && !fromArchive.some((a) => a.id === g.id),
      ) ?? [];
    const games = [...fromArchive, ...fromLive]
      .filter((g) => !team || g.home.team.id === team || g.away.team.id === team)
      .sort(
        (a, b) =>
          (a.startTimeUtc ?? '').localeCompare(b.startTimeUtc ?? '') ||
          a.id.localeCompare(b.id),
      );
    // Nearest dates with games either side, across archive and schedule.
    const dates = new Set<string>();
    for (const s of seasonOfDate(date).concat(
      seasonOfDate(shift(date, 200)),
      seasonOfDate(shift(date, -200)),
    ))
      if (archive.has(s))
        for (const [d, list] of this.seasonDates(s))
          if (
            !team ||
            list.some((g) => g.home.team.id === team || g.away.team.id === team)
          )
            dates.add(d);
    for (const g of current?.games ?? [])
      if (!team || g.home.team.id === team || g.away.team.id === team)
        dates.add(g.date);
    const sorted = [...dates].sort();
    const previousDate = sorted.filter((d) => d < date).at(-1) ?? null;
    const nextDate = sorted.find((d) => d > date) ?? null;
    const archivedSeasons = seasonOfDate(date).filter((s) => archive.has(s));
    const coverage = [
      archivedSeasons.length
        ? `Archived NBA.com results for ${archivedSeasons.join(' and ')}.`
        : 'No archived season covers this date.',
      current
        ? `NBA.com’s live ${current.season} schedule and today’s scoreboard${current.board ? '' : ' (scoreboard unreachable)'}.`
        : 'The live NBA.com schedule could not be reached, so only archived games are shown.',
    ].join(' ');
    return LeagueGamesResponseSchema.parse({
      date,
      games: games.slice(0, 40),
      previousDate,
      nextDate,
      performers: this.performers(date, games),
      coverage,
      provenance: this.liveProvenance(
        fromLive.length
          ? current?.board && fromLive.some((g) => g.source === 'scoreboard')
            ? current.board
            : current!.schedule
          : null,
        coverage,
      ),
    });
  }

  /** NBA.com's live standings for the season its current schedule covers. */
  async currentStandings(): Promise<LeagueStandingsResponse> {
    const current = await this.current();
    if (!current || !this.live)
      throw new LeagueRequestError(
        404,
        'LEAGUE_LIVE_UNAVAILABLE',
        'NBA.com’s current schedule could not be reached, so the current season is unknown.',
      );
    let result: LiveResult<unknown>;
    try {
      result = await this.live.standings(current.season);
    } catch {
      throw new LeagueRequestError(
        404,
        'LEAGUE_LIVE_UNAVAILABLE',
        `NBA.com’s ${current.season} standings could not be reached.`,
      );
    }
    const set = (
      result.value as { resultSets?: { headers: string[]; rowSet: unknown[][] }[] }
    ).resultSets?.[0];
    const rows = (set?.rowSet ?? []).map((r) =>
      Object.fromEntries(set!.headers.map((h, i) => [h, r[i]])),
    );
    if (!rows.length)
      throw new LeagueRequestError(
        404,
        'LEAGUE_LIVE_UNAVAILABLE',
        `NBA.com publishes no ${current.season} standings yet.`,
      );
    const latest = this.league.archive.summary(this.league.archive.seasons.at(-1)!);
    const num = (v: unknown) => (typeof v === 'number' ? v : null);
    const played = rows.some((r) => (num(r.WINS) ?? 0) + (num(r.LOSSES) ?? 0) > 0);
    const conferences = (['East', 'West'] as const).map((conference) => ({
      conference,
      rows: rows
        .filter((r) => r.Conference === conference)
        .map((r) => {
          const id = Number(r.TeamID);
          const w = num(r.WINS) ?? 0,
            l = num(r.LOSSES) ?? 0;
          return {
            rank: num(r.PlayoffRank) ?? 1,
            team: {
              id: `nba:${id}`,
              abbreviation:
                latest.teams.find((t) => t.teamId === id)?.abbreviation ?? 'UNK',
              name: `${String(r.TeamCity ?? '')} ${String(r.TeamName ?? '')}`
                .trim()
                .slice(0, 60),
            },
            wins: w,
            losses: l,
            winPercentage: w + l ? w / (w + l) : 0,
            gamesBehind: num(r.ConferenceGamesBack) ?? 0,
            division: r.Division ? String(r.Division).slice(0, 40) : null,
            home: r.HOME ? String(r.HOME).trim().slice(0, 10) : null,
            road: r.ROAD ? String(r.ROAD).trim().slice(0, 10) : null,
            lastTen: r.L10 ? String(r.L10).trim().slice(0, 10) : null,
            streak: r.strCurrentStreak
              ? String(r.strCurrentStreak).trim().slice(0, 10) || null
              : null,
            clinch: r.ClinchIndicator
              ? String(r.ClinchIndicator).replace(/^-\s*/, '').trim().slice(0, 10) ||
                null
              : null,
          };
        })
        .sort((a, b) =>
          played ? a.rank - b.rank : a.team.name.localeCompare(b.team.name),
        ),
    }));
    return LeagueStandingsResponseSchema.parse({
      season: current.season,
      basis: 'published',
      conferences: played
        ? conferences
        : conferences.map((c) => ({
            ...c,
            rows: c.rows.map((r, i) => ({ ...r, rank: i + 1 })),
          })),
      resultsAgreement: null,
      provenance: this.liveProvenance(
        result,
        `NBA.com’s live ${current.season} standings table.`,
        played
          ? []
          : [
              `No ${current.season} regular-season game has been played, so every team is 0–0; teams are listed alphabetically instead of by NBA.com’s placeholder ranks.`,
            ],
      ),
    });
  }

  /** Latest season's leaders with their as-of date, and the current season's recent and next games. */
  async snapshot(): Promise<LeagueSnapshotResponse> {
    const archive = this.league.archive;
    const season = archive.seasons.at(-1)!;
    const s = archive.summary(season);
    const standings = this.league.standings(season);
    const asOf = s.scopes['regular-season'].lastDate!;
    const statLeaders = (
      [
        ['points', 'Points per game'],
        ['rebounds', 'Rebounds per game'],
        ['assists', 'Assists per game'],
      ] as const
    ).map(([metric, label]) => {
      const top = this.league.leaders({
        season,
        scope: 'regular-season',
        metric,
        mode: 'per-game',
        page: 1,
      }).rows[0]!;
      return {
        metric,
        label,
        value: top.value,
        playerId: top.playerId,
        name: top.name,
        team: top.teams.at(-1)!.abbreviation,
      };
    });
    const current = await this.current();
    const now = Date.now();
    const played = (current?.games ?? []).filter((g) => g.status === 'final');
    const regular = (current?.games ?? []).filter((g) => g.type === 'regular-season');
    const firstRegular = regular.map((g) => g.date).sort()[0] ?? null;
    const phase = !current
      ? 'unknown'
      : regular.some((g) => g.status === 'final' || g.status === 'live')
        ? regular.every((g) => g.status === 'final')
          ? 'postseason'
          : 'regular-season'
        : played.length
          ? 'preseason'
          : 'offseason';
    const recent = (current?.games ?? [])
      .filter((g) => g.status === 'final' || g.status === 'live')
      .sort((a, b) =>
        (b.startTimeUtc ?? b.date).localeCompare(a.startTimeUtc ?? a.date),
      )
      .slice(0, 8);
    const upcoming = (current?.games ?? [])
      .filter(
        (g) =>
          g.status === 'scheduled' &&
          (!g.startTimeUtc || Date.parse(g.startTimeUtc) > now - 3 * 3600_000),
      )
      .sort((a, b) =>
        (a.startTimeUtc ?? `${a.date}T23:59`).localeCompare(
          b.startTimeUtc ?? `${b.date}T23:59`,
        ),
      )
      .slice(0, 8);
    return LeagueSnapshotResponseSchema.parse({
      season,
      asOf,
      current: current
        ? {
            season: current.season,
            phase,
            regularSeasonStart: firstRegular,
            gamesPlayed: played.length,
          }
        : null,
      conferenceLeaders: standings.conferences
        .filter(
          (c): c is typeof c & { conference: 'East' | 'West' } =>
            c.conference !== 'League',
        )
        .map((c) => ({
          conference: c.conference,
          teams: c.rows.slice(0, 3).map((r) => ({
            rank: r.rank,
            team: r.team,
            wins: r.wins,
            losses: r.losses,
          })),
        })),
      statLeaders,
      recent,
      upcoming,
      provenance: this.liveProvenance(
        current?.schedule ?? null,
        `Leaders and standings: ${season} regular season, final as of ${asOf} (archived NBA.com data).${current ? ` Recent and upcoming games: NBA.com’s live ${current.season} schedule.` : ' The live schedule could not be reached, so no recent or upcoming games are shown.'}`,
      ),
    });
  }

  /** The day's leading box-score marks from archived lines; the top three per category with ties. */
  private performers(date: string, games: LeagueGameSummary[]) {
    const archive = this.league.archive;
    const ids = new Set(
      games
        .filter((g) => g.source === 'archive' && g.status === 'final')
        .map((g) => g.id.slice(4)),
    );
    if (!ids.size) return [];
    const lines = seasonOfDate(date)
      .filter((s) => archive.has(s))
      .flatMap((s) =>
        [
          ...archive.playerLines(s, 'regular-season'),
          ...archive.playerLines(s, 'playoffs'),
        ].map((l) => ({ l, s })),
      )
      .filter(({ l }) => l.date === date && ids.has(l.gameId));
    return (
      [
        ['pts', 'Points'],
        ['reb', 'Rebounds'],
        ['ast', 'Assists'],
      ] as const
    ).map(([key, label]) => {
      const rows = lines
        .map(({ l, s }) => ({ l, s, v: l.line[LINE_FIELDS.indexOf(key)] ?? null }))
        .filter(
          (x): x is { l: (typeof lines)[number]['l']; s: string; v: number } =>
            x.v !== null,
        )
        .sort((a, b) => b.v - a.v);
      const third = rows[2]?.v;
      return {
        key,
        label,
        rows: rows
          .filter((x) => third === undefined || x.v >= third)
          .slice(0, 12)
          .map(({ l, s, v }) => ({
            playerId: String(l.playerId),
            name: this.league.name(archive.summary(s), l.playerId),
            team: this.teamRef(s, l.teamId).abbreviation,
            opponent: this.teamRef(s, l.opponentId).abbreviation,
            gameId: `nba:${l.gameId}`,
            value: v,
          })),
      };
    });
  }

  async calendar(month: string): Promise<LeagueCalendarResponse> {
    const archive = this.league.archive;
    const counts = new Map<
      string,
      { games: number; finals: number; scheduled: number; other: number }
    >();
    const add = (g: LeagueGameSummary) => {
      if (!g.date.startsWith(month)) return;
      const c = counts.get(g.date) ?? { games: 0, finals: 0, scheduled: 0, other: 0 };
      c.games++;
      if (g.status === 'final') c.finals++;
      else if (g.status === 'scheduled') c.scheduled++;
      else c.other++;
      counts.set(g.date, c);
    };
    const seen = new Set<string>();
    for (const s of seasonOfDate(`${month}-15`))
      if (archive.has(s))
        for (const list of this.seasonDates(s).values())
          for (const g of list) {
            seen.add(g.id);
            add(g);
          }
    const current = await this.current();
    for (const g of current?.games ?? []) if (!seen.has(g.id)) add(g);
    return LeagueCalendarResponseSchema.parse({
      month,
      days: [...counts]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, c]) => ({ date, ...c })),
      provenance: this.liveProvenance(
        current?.schedule ?? null,
        current
          ? 'Archived seasons plus NBA.com’s live schedule.'
          : 'Archived seasons only; the live schedule could not be reached.',
      ),
    });
  }

  private async findSummary(
    gameId: string,
  ): Promise<{ summary: LeagueGameSummary; season: string | null } | null> {
    const season = this.league.archive.seasonOfGame(gameId);
    if (season) {
      for (const list of this.seasonDates(season).values()) {
        const g = list.find((x) => x.id === `nba:${gameId}`);
        if (g) return { summary: g, season };
      }
    }
    const current = await this.current();
    const g = current?.games.find((x) => x.id === `nba:${gameId}`);
    return g ? { summary: g, season: null } : null;
  }

  async detail(gameIdText: string): Promise<LeagueGameDetailResponse> {
    const gameId = gameIdText.slice(4);
    const found = await this.findSummary(gameId);
    if (!found)
      throw new LeagueRequestError(
        404,
        'LEAGUE_GAME_UNKNOWN',
        'That game is neither in the archive nor in NBA.com’s current schedule.',
      );
    const { summary, season } = found;
    const notes: string[] = [];
    let box: LeagueGameDetailResponse['box'] = null;
    let lineScore: LeagueGameDetailResponse['lineScore'] = null;
    let venue: LeagueGameDetailResponse['venue'] = null;
    let liveResult: LiveResult<unknown> | null = null;
    // Archived box lines first: they work offline and every line is checked against team totals.
    if (season && summary.status === 'final') {
      const scope = summary.type === 'playoffs' ? 'playoffs' : 'regular-season';
      const data = this.league.archive.seasonGames(season).scopes[scope];
      const lines = data?.playerLines.filter((l) => l[0] === gameId) ?? [];
      const teamLines = data?.teamLines.filter((l) => l[0] === gameId) ?? [];
      const s = this.league.archive.summary(season);
      box = {
        source: 'archive',
        teams: [summary.home, summary.away].map((side, i) => {
          const teamId = Number(side.team.id.slice(4));
          const players = lines.filter((l) => l[2] === teamId);
          const tl = teamLines.find((l) => l[1] === teamId);
          const asStats = (line: Line) =>
            Object.fromEntries(
              STAT_KEYS.map((k) => [k, line[LINE_FIELDS.indexOf(k)] ?? null]),
            );
          const pts = players.reduce(
            (n, l) => n + ((l[3 + LINE_FIELDS.indexOf('pts')] as number | null) ?? 0),
            0,
          );
          return {
            team: side.team,
            home: i === 0,
            players: players
              .map((l) => ({
                playerId: String(l[1]),
                name: this.league.name(s, l[1]),
                starter: null,
                position: null,
                status: 'played' as const,
                note: null,
                minutes: (l[3] as number | null) ?? null,
                stats: asStats(l.slice(3) as Line),
              }))
              .sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0))
              .slice(0, 25),
            totals: tl ? asStats(tl.slice(2) as Line) : {},
            addsUp: side.score !== null && pts === side.score,
          };
        }),
      };
      if (summary.overtimePeriods)
        notes.push(
          `${summary.overtimePeriods} overtime period${summary.overtimePeriods > 1 ? 's' : ''}.`,
        );
    }
    // NBA.com's live box score adds starters, did-not-play notes, the line score and the venue.
    if (
      this.live &&
      summary.status !== 'scheduled' &&
      summary.status !== 'postponed' &&
      summary.status !== 'canceled'
    ) {
      try {
        liveResult = await this.live.boxscore(gameId);
        const g = (liveResult.value as { game?: CdnBox }).game;
        if (g) {
          const cdnBox = fromCdnBox(g, summary);
          if (!box || summary.status === 'live') box = cdnBox.box;
          else mergeRoles(box, rolesFromCdn(cdnBox.box));
          lineScore = cdnBox.lineScore;
          venue = cdnBox.venue;
        }
      } catch {
        try {
          if (season) {
            liveResult = await this.live.boxscoreV3(gameId);
            const b = (liveResult.value as { boxScoreTraditional?: V3Box })
              .boxScoreTraditional;
            if (b && box) mergeRoles(box, rolesFromV3(b));
          }
        } catch {
          notes.push(
            'NBA.com’s game box score could not be reached: starters, did-not-play notes and the line score are not shown.',
          );
        }
      }
    }
    if (summary.status === 'scheduled')
      notes.push('Scheduled: no box score until the game starts.');
    if (box)
      for (const t of box.teams)
        if (!t.addsUp && summary.status === 'final')
          notes.push(
            `${t.team.abbreviation} player points do not add up to the team score in this box score.`,
          );
    const highs = box
      ? HIGHS.map(([key, label]) => {
          const all = box!.teams
            .flatMap((t) =>
              t.players.map((p) => ({
                p,
                team: t.team.abbreviation,
                v: p.stats[key] ?? null,
              })),
            )
            .filter(
              (x): x is { p: (typeof x)['p']; team: string; v: number } => x.v !== null,
            );
          const top = Math.max(...all.map((x) => x.v));
          return {
            key,
            label,
            value: top,
            players: all
              .filter((x) => x.v === top)
              .map((x) => ({ playerId: x.p.playerId, name: x.p.name, team: x.team })),
          };
        }).filter((h) => Number.isFinite(h.value) && h.value > 0)
      : [];
    return LeagueGameDetailResponseSchema.parse({
      game: summary,
      box,
      highs,
      lineScore,
      venue,
      notes: notes.slice(0, 10),
      provenance: liveResult
        ? this.liveProvenance(
            liveResult,
            `NBA.com’s box score for game ${gameId}${season ? `, with the archived ${season} box lines` : ''}.`,
          )
        : {
            source: 'nba-stats',
            mode: 'committed-snapshot',
            servedAt: new Date().toISOString(),
            retrievedAt: season
              ? (this.league.archive
                  .summary(season)
                  .source.requests.map((r) => r.retrievedAt)
                  .sort()
                  .at(-1) ?? null)
              : null,
            sourceUpdatedAt: null,
            coverage: season
              ? `Archived ${season} NBA.com game logs.`
              : 'NBA.com’s current schedule.',
            warnings: [],
          },
    });
  }

  async playByPlay(gameIdText: string): Promise<LeaguePlayByPlayResponse> {
    const gameId = gameIdText.slice(4);
    if (!this.live)
      throw new LeagueRequestError(
        404,
        'LEAGUE_LIVE_DISABLED',
        'Play-by-play needs NBA.com, which this server does not contact.',
      );
    const found = await this.findSummary(gameId);
    if (!found)
      throw new LeagueRequestError(
        404,
        'LEAGUE_GAME_UNKNOWN',
        'That game is neither in the archive nor in NBA.com’s current schedule.',
      );
    const { summary } = found;
    if (
      summary.status === 'scheduled' ||
      summary.status === 'postponed' ||
      summary.status === 'canceled'
    )
      throw new LeagueRequestError(
        404,
        'LEAGUE_PLAY_BY_PLAY_NONE',
        'This game has not been played, so there is no play-by-play.',
      );
    const homeId = Number(summary.home.team.id.slice(4));
    let source: 'cdn' | 'stats' = 'cdn';
    let result: LiveResult<unknown>;
    let raw;
    try {
      result = await this.live.playByPlay(gameId);
      raw = readCdnActions(
        ((result.value as { game?: { actions?: unknown[] } }).game?.actions ??
          []) as unknown[],
        homeId,
      );
      if (!raw.length) throw new Error('empty');
    } catch {
      try {
        source = 'stats';
        result = await this.live.playByPlayV3(gameId);
        raw = readV3Actions(
          ((result.value as { game?: { actions?: unknown[] } }).game?.actions ??
            []) as unknown[],
        );
      } catch {
        throw new LeagueRequestError(
          404,
          'LEAGUE_PLAY_BY_PLAY_UNAVAILABLE',
          'NBA.com’s play-by-play for this game could not be reached or is not published.',
        );
      }
    }
    if (!raw.length)
      throw new LeagueRequestError(
        404,
        'LEAGUE_PLAY_BY_PLAY_UNAVAILABLE',
        'NBA.com publishes no play-by-play events for this game.',
      );
    const { events, corrections } = toEvents(raw);
    const analysis = analyse(events, corrections);
    const last = events.at(-1)!;
    const complete =
      summary.home.score !== null &&
      summary.away.score !== null &&
      last.home === summary.home.score &&
      last.away === summary.away.score;
    const checks: string[] = [];
    const H = summary.home.team.abbreviation,
      A = summary.away.team.abbreviation;
    if (summary.status === 'final')
      checks.push(
        complete
          ? `The last event’s score (${A} ${last.away}, ${H} ${last.home}) matches the final score.`
          : `The last event’s score (${A} ${last.away}, ${H} ${last.home}) does not match the final score (${A} ${summary.away.score}, ${H} ${summary.home.score}): the event list is incomplete, so derived counts may be off.`,
      );
    if (summary.status === 'live')
      checks.push('Live game: events and counts are as of the last NBA.com update.');
    if (corrections)
      checks.push(
        `${corrections} event${corrections > 1 ? 's' : ''} lower an earlier score (NBA.com corrections); runs end at each correction.`,
      );
    let sourceCounts: LeaguePlayByPlayResponse['sourceCounts'] = null;
    if (source === 'cdn') {
      try {
        const box = ((await this.live.boxscore(gameId)).value as { game?: CdnBox })
          .game;
        const hs = box?.homeTeam?.statistics,
          as = box?.awayTeam?.statistics;
        if (hs && as) {
          const n = (v: unknown) => (typeof v === 'number' ? v : null);
          sourceCounts = {
            leadChanges: n(hs.leadChanges),
            timesTied: n(hs.timesTied),
            biggestLeadHome: n(hs.biggestLead),
            biggestLeadAway: n(as.biggestLead),
            biggestRunHome: n(hs.biggestScoringRun),
            biggestRunAway: n(as.biggestScoringRun),
          };
          const same = [
            sourceCounts.leadChanges === analysis.leadChanges,
            sourceCounts.timesTied === analysis.timesTied,
            sourceCounts.biggestLeadHome === analysis.largestLead.home.points,
            sourceCounts.biggestLeadAway === analysis.largestLead.away.points,
          ];
          checks.push(
            same.every(Boolean)
              ? 'Lead changes, ties and largest leads match NBA.com’s own counts for this game.'
              : 'Some derived counts differ from NBA.com’s published counts; both are shown. NBA.com does not publish the event sequence behind its figures.',
          );
        }
      } catch {
        // NBA.com's counts are optional context.
      }
    }
    return LeaguePlayByPlayResponseSchema.parse({
      gameId: gameIdText,
      home: summary.home.team,
      away: summary.away.team,
      source,
      complete,
      events: events.slice(0, 1500),
      analysis,
      sourceCounts,
      checks: checks.slice(0, 10),
      provenance: this.liveProvenance(
        result!,
        `NBA.com ${source === 'cdn' ? 'live-data' : 'Stats v3'} play-by-play for game ${gameId}: ${events.length} events.`,
      ),
    });
  }
}

const FRESHNESS: Record<string, number> = {
  standings: 3600,
  schedule: 24 * 3600,
  scoreboard: 120,
  // Requested per game: an answer within the hour shows the source is reachable now.
  boxscore: 3600,
  playbyplay: 3600,
};
const LIVE_NAMES: Record<string, string> = {
  standings: 'NBA.com current standings (stats.nba.com)',
  schedule: 'NBA.com season schedule (cdn.nba.com)',
  scoreboard: 'NBA.com today’s scoreboard (cdn.nba.com)',
  boxscore: 'NBA.com box scores (cdn.nba.com, stats.nba.com)',
  playbyplay: 'NBA.com play-by-play (cdn.nba.com, stats.nba.com)',
};

/** Each source's state from real request outcomes; probes the schedule and scoreboard first. */
export async function leagueStatus(
  league: LeagueService,
  live: NbaLiveClient | undefined,
) {
  if (live) {
    await Promise.allSettled([live.schedule(), live.scoreboard()]);
  }
  const now = Date.now();
  const archive = league.archive;
  const retrieved = archive.seasons
    .flatMap((s) => archive.summary(s).source.requests.map((r) => r.retrievedAt))
    .sort();
  const sources: LeagueStatusResponse['sources'] = [
    {
      id: 'league-archive',
      name: 'NBA.com league archive (committed)',
      state: 'archived',
      lastSuccessAt: retrieved.at(-1) ?? null,
      lastFailureAt: null,
      lastFailure: null,
      sourceUpdatedAt: null,
      freshnessSeconds: null,
      note: `${archive.seasons.length} seasons (${archive.seasons[0]} to ${archive.seasons.at(-1)}), retrieved ${retrieved[0]?.slice(0, 10)} to ${retrieved.at(-1)?.slice(0, 10)}. Final results do not change; NBA.com may still restate individual statistics.`,
    },
  ];
  for (const id of [
    'schedule',
    'scoreboard',
    'standings',
    'boxscore',
    'playbyplay',
  ] as const) {
    const st = live?.status.get(id);
    const ok = st?.lastSuccessAt ? Date.parse(st.lastSuccessAt) : null;
    const bad = st?.lastFailureAt ? Date.parse(st.lastFailureAt) : null;
    const state: LeagueStatusResponse['sources'][number]['state'] =
      !live || (ok === null && bad === null)
        ? 'not-contacted'
        : bad !== null && (ok === null || bad > ok)
          ? 'unavailable'
          : now - ok! <= FRESHNESS[id]! * 1000
            ? 'current'
            : 'stale';
    sources.push({
      id,
      name: LIVE_NAMES[id]!,
      state,
      lastSuccessAt: st?.lastSuccessAt ?? null,
      lastFailureAt: st?.lastFailureAt ?? null,
      lastFailure: st?.lastFailure ?? null,
      sourceUpdatedAt: st?.sourceUpdatedAt ?? null,
      freshnessSeconds: FRESHNESS[id]!,
      note: !live
        ? 'This server does not contact NBA.com live sources.'
        : id === 'standings'
          ? 'Requested when the current season’s standings open; reused for 5 minutes. Current means it answered within the hour.'
          : id === 'boxscore' || id === 'playbyplay'
            ? 'Requested when a game page opens; finals are kept for a day, live games for 20 seconds. Current means it answered within the hour.'
            : `Checked when this status was requested; reused for ${st?.cacheSeconds ?? 0} seconds.`,
    });
  }
  return LeagueStatusResponseSchema.parse({
    checkedAt: new Date(now).toISOString(),
    sources,
  });
}

const shift = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

interface CdnPlayer {
  personId?: number;
  name?: string;
  status?: string;
  starter?: string;
  position?: string;
  played?: string;
  notPlayingReason?: string;
  notPlayingDescription?: string;
  statistics?: Record<string, unknown>;
}
interface CdnTeam {
  teamId: number;
  teamTricode?: string;
  score?: number;
  players?: CdnPlayer[];
  periods?: { period: number; score: number }[];
  statistics?: Record<string, unknown>;
}
interface CdnBox {
  homeTeam?: CdnTeam;
  awayTeam?: CdnTeam;
  arena?: { arenaName?: string; arenaCity?: string };
  attendance?: number;
  officials?: { name?: string }[];
}
const minutesOf = (v: unknown) => {
  const m = /^PT(\d+)M(\d+(?:\.\d+)?)S$/.exec(String(v ?? ''));
  return m ? Math.round((Number(m[1]) + Number(m[2]) / 60) * 10) / 10 : null;
};
function fromCdnBox(g: CdnBox, summary: LeagueGameSummary) {
  const s = (st: Record<string, unknown> | undefined, k: string) =>
    typeof st?.[k] === 'number' ? (st[k] as number) : null;
  const statsOf = (st: Record<string, unknown> | undefined) => ({
    min: minutesOf(st?.minutes),
    pts: s(st, 'points'),
    fgm: s(st, 'fieldGoalsMade'),
    fga: s(st, 'fieldGoalsAttempted'),
    fg3m: s(st, 'threePointersMade'),
    fg3a: s(st, 'threePointersAttempted'),
    ftm: s(st, 'freeThrowsMade'),
    fta: s(st, 'freeThrowsAttempted'),
    oreb: s(st, 'reboundsOffensive'),
    dreb: s(st, 'reboundsDefensive'),
    reb: s(st, 'reboundsTotal'),
    ast: s(st, 'assists'),
    stl: s(st, 'steals'),
    blk: s(st, 'blocks'),
    tov: s(st, 'turnovers'),
    pf: s(st, 'foulsPersonal'),
    pm: s(st, 'plusMinusPoints'),
  });
  const team = (
    t: CdnTeam | undefined,
    side: LeagueGameSummary['home'],
    home: boolean,
  ) => {
    const players = (t?.players ?? []).map((p) => {
      const played = p.played === '1';
      return {
        playerId: String(p.personId ?? 0),
        name: String(p.name ?? '').slice(0, 80),
        starter: p.starter === '1',
        position: p.position ? String(p.position).slice(0, 10) : null,
        status: (played
          ? 'played'
          : p.status === 'INACTIVE'
            ? 'inactive'
            : 'did-not-play') as 'played' | 'inactive' | 'did-not-play',
        note: played
          ? null
          : ((
              String(p.notPlayingDescription ?? '').trim() ||
              String(p.notPlayingReason ?? '')
                .replace(/_/g, ' ')
                .trim() ||
              null
            )?.slice(0, 80) ?? null),
        minutes: played ? minutesOf(p.statistics?.minutes) : null,
        stats: (played ? statsOf(p.statistics) : {}) as Record<string, number | null>,
      };
    });
    const pts = players.reduce((n, p) => n + (p.stats.pts ?? 0), 0);
    return {
      team: side.team,
      home,
      players: players.filter((p) => /^[1-9]\d*$/.test(p.playerId)).slice(0, 25),
      totals: statsOf(t?.statistics),
      addsUp: typeof t?.score === 'number' && pts === t.score,
    };
  };
  const hp = g.homeTeam?.periods ?? [],
    ap = g.awayTeam?.periods ?? [];
  return {
    box: {
      source: 'cdn' as const,
      teams: [
        team(g.homeTeam, summary.home, true),
        team(g.awayTeam, summary.away, false),
      ],
    },
    lineScore: hp.length
      ? {
          source: 'cdn' as const,
          periods: hp
            .map((p, i) => ({
              period: p.period,
              home: p.score,
              away: ap[i]?.score ?? 0,
            }))
            .filter(
              (p) => summary.status !== 'final' || p.home + p.away > 0 || p.period <= 4,
            ),
        }
      : null,
    venue: {
      arena: g.arena?.arenaName ?? null,
      city: g.arena?.arenaCity ?? null,
      attendance:
        typeof g.attendance === 'number' && g.attendance > 0 ? g.attendance : null,
      officials: (g.officials ?? [])
        .map((o) => String(o.name ?? '').slice(0, 60))
        .filter(Boolean)
        .slice(0, 5),
    },
  };
}
interface V3Box {
  homeTeam?: {
    teamId: number;
    players?: {
      personId: number;
      firstName?: string;
      familyName?: string;
      position?: string;
      comment?: string;
      statistics?: { minutes?: string };
    }[];
  };
  awayTeam?: V3Box['homeTeam'];
}
type BoxPlayer = NonNullable<
  LeagueGameDetailResponse['box']
>['teams'][number]['players'][number];
interface Roles {
  byPlayer: Map<string, { starter: boolean | null; position: string | null }>;
  /** Players listed as not playing, by team ID. */
  absent: Map<string, BoxPlayer[]>;
}
function rolesFromCdn(box: NonNullable<LeagueGameDetailResponse['box']>): Roles {
  const roles: Roles = { byPlayer: new Map(), absent: new Map() };
  for (const t of box.teams) {
    for (const p of t.players)
      roles.byPlayer.set(p.playerId, { starter: p.starter, position: p.position });
    roles.absent.set(
      t.team.id,
      t.players.filter((p) => p.status !== 'played'),
    );
  }
  return roles;
}
function rolesFromV3(b: V3Box): Roles {
  const roles: Roles = { byPlayer: new Map(), absent: new Map() };
  for (const t of [b.homeTeam, b.awayTeam]) {
    if (!t) continue;
    const absent: BoxPlayer[] = [];
    for (const p of t.players ?? []) {
      roles.byPlayer.set(String(p.personId), {
        starter: Boolean(p.position),
        position: p.position || null,
      });
      const note = cleanNote(p.comment);
      if (note && !p.statistics?.minutes)
        absent.push({
          playerId: String(p.personId),
          name: `${p.firstName ?? ''} ${p.familyName ?? ''}`.trim().slice(0, 80),
          starter: false,
          position: null,
          status: 'did-not-play',
          note,
          minutes: null,
          stats: {},
        });
    }
    roles.absent.set(`nba:${t.teamId}`, absent);
  }
  return roles;
}
/** Adds starters, positions and did-not-play players from a live box to the archived lines. */
function mergeRoles(box: NonNullable<LeagueGameDetailResponse['box']>, roles: Roles) {
  for (const t of box.teams) {
    for (const p of t.players) {
      const r = roles.byPlayer.get(p.playerId);
      if (r) {
        p.starter = r.starter;
        p.position = r.position;
      }
    }
    for (const a of roles.absent.get(t.team.id) ?? [])
      if (
        !t.players.some((p) => p.playerId === a.playerId) &&
        t.players.length < 25 &&
        /^[1-9]\d*$/.test(a.playerId)
      )
        t.players.push(a);
  }
}
