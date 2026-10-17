// Live NBA.com sources for current games: the season schedule, today's scoreboard, box scores
// and play-by-play. Requests go only to fixed paths on cdn.nba.com and stats.nba.com built from
// validated IDs (no caller-supplied URLs), with one timeout, no retries, a TTL cache that also
// de-duplicates concurrent requests, and a status record per source for the freshness page.
import {
  providerInvalidResponse,
  providerTimeout,
  providerUnavailable,
} from '../players/provider-error.js';

const HEADERS: Readonly<Record<string, string>> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.5',
  Referer: 'https://www.nba.com/',
  Origin: 'https://www.nba.com',
};

export type LiveSourceId =
  | 'schedule'
  | 'scoreboard'
  | 'boxscore'
  | 'playbyplay'
  | 'standings'
  | 'lineups';
export interface LiveSourceStatus {
  id: LiveSourceId;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailure: string | null;
  /** The time the source itself stamped on its last good response, when it stamps one. */
  sourceUpdatedAt: string | null;
  cacheSeconds: number;
}

export interface LiveResult<T> {
  value: T;
  retrievedAt: string;
  sourceUpdatedAt: string | null;
  cached: boolean;
}

interface Entry {
  value: unknown;
  retrievedAt: string;
  sourceUpdatedAt: string | null;
  expires: number;
}

const GAME_ID = /^00[1-6]\d{7}$/;

export class NbaLiveClient {
  private readonly cache = new Map<string, Entry>();
  private readonly inflight = new Map<string, Promise<Entry>>();
  readonly status = new Map<LiveSourceId, LiveSourceStatus>();

  constructor(
    private readonly options: {
      timeoutMs: number;
      fetchImpl?: typeof fetch;
      now?: () => number;
      maxEntries?: number;
    } = { timeoutMs: 8000 },
  ) {
    for (const [id, cacheSeconds] of [
      ['schedule', 600],
      ['scoreboard', 20],
      ['boxscore', 20],
      ['playbyplay', 20],
      ['standings', 300],
      ['lineups', 3600],
    ] as const)
      this.status.set(id, {
        id,
        lastSuccessAt: null,
        lastFailureAt: null,
        lastFailure: null,
        sourceUpdatedAt: null,
        cacheSeconds,
      });
  }

  private now() {
    return this.options.now?.() ?? Date.now();
  }

  private async request(
    url: URL,
  ): Promise<{ value: unknown; lastModified: string | null }> {
    if (
      url.protocol !== 'https:' ||
      !['cdn.nba.com', 'stats.nba.com'].includes(url.hostname)
    )
      throw providerUnavailable('Blocked a request outside the NBA.com allow-list.');
    const doFetch = this.options.fetchImpl ?? globalThis.fetch;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      let response: Response;
      try {
        response = await doFetch(url, {
          headers: { ...HEADERS },
          signal: controller.signal,
        });
      } catch {
        if (controller.signal.aborted)
          throw providerTimeout('NBA.com request timed out.');
        throw providerUnavailable('NBA.com request failed.');
      }
      if (response.status === 403 || response.status === 404)
        throw providerUnavailable(
          `NBA.com has no data at this address (${response.status}).`,
        );
      if (!response.ok)
        throw providerUnavailable(`NBA.com responded with status ${response.status}.`);
      // The CDN serves JSON without a JSON content type, so the body itself is checked: it must
      // parse as a JSON object (an HTML error page does not).
      let body: string;
      try {
        body = await response.text();
      } catch {
        if (controller.signal.aborted)
          throw providerTimeout('NBA.com request timed out.');
        throw providerUnavailable('NBA.com response could not be read.');
      }
      try {
        const value = JSON.parse(body) as unknown;
        if (value === null || typeof value !== 'object')
          throw new Error('not an object');
        // The HTTP Last-Modified header (GMT) is the source's own update time. NBA.com's in-body
        // meta times are not used: they mix time zones and 12- and 24-hour clocks.
        const header = Date.parse(response.headers.get('last-modified') ?? '');
        return {
          value,
          lastModified: Number.isFinite(header) ? new Date(header).toISOString() : null,
        };
      } catch {
        throw providerInvalidResponse('NBA.com returned a body that is not JSON.');
      }
    } finally {
      clearTimeout(timer);
    }
  }

  /** Fetches through the cache; `ttlSeconds` may depend on the response (finals cache longer). */
  private async get<T>(
    source: LiveSourceId,
    key: string,
    url: URL,
    ttl: (value: unknown) => number,
  ): Promise<LiveResult<T>> {
    const hit = this.cache.get(key);
    if (hit && hit.expires > this.now())
      return {
        value: hit.value as T,
        retrievedAt: hit.retrievedAt,
        sourceUpdatedAt: hit.sourceUpdatedAt,
        cached: true,
      };
    let pending = this.inflight.get(key);
    if (!pending) {
      pending = (async () => {
        const status = this.status.get(source)!;
        try {
          const { value, lastModified } = await this.request(url);
          const entry: Entry = {
            value,
            retrievedAt: new Date(this.now()).toISOString(),
            sourceUpdatedAt: lastModified,
            expires: this.now() + ttl(value) * 1000,
          };
          this.cache.set(key, entry);
          while (this.cache.size > (this.options.maxEntries ?? 80))
            this.cache.delete(this.cache.keys().next().value!);
          status.lastSuccessAt = entry.retrievedAt;
          status.sourceUpdatedAt = entry.sourceUpdatedAt;
          return entry;
        } catch (error) {
          status.lastFailureAt = new Date(this.now()).toISOString();
          status.lastFailure =
            error instanceof Error ? error.message.slice(0, 200) : 'Unknown failure';
          throw error;
        } finally {
          this.inflight.delete(key);
        }
      })();
      this.inflight.set(key, pending);
    }
    const entry = await pending;
    return {
      value: entry.value as T,
      retrievedAt: entry.retrievedAt,
      sourceUpdatedAt: entry.sourceUpdatedAt,
      cached: false,
    };
  }

  schedule() {
    return this.get<unknown>(
      'schedule',
      'schedule',
      new URL('https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json'),
      () => 600,
    );
  }

  scoreboard() {
    return this.get<unknown>(
      'scoreboard',
      'scoreboard',
      new URL(
        'https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json',
      ),
      () => 20,
    );
  }

  /** CDN box score (2019-20 on); finals are cached for a day, other states for 20 seconds. */
  boxscore(gameId: string) {
    if (!GAME_ID.test(gameId)) throw providerInvalidResponse('Invalid game ID.');
    return this.get<unknown>(
      'boxscore',
      `box:${gameId}`,
      new URL(
        `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${gameId}.json`,
      ),
      (v) =>
        (v as { game?: { gameStatus?: unknown } }).game?.gameStatus === 3 ? 86_400 : 20,
    );
  }

  /** CDN play-by-play (2019-20 on). */
  playByPlay(gameId: string) {
    if (!GAME_ID.test(gameId)) throw providerInvalidResponse('Invalid game ID.');
    return this.get<unknown>(
      'playbyplay',
      `pbp:${gameId}`,
      new URL(
        `https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`,
      ),
      (v) => (lastActionIsGameEnd(v) ? 86_400 : 20),
    );
  }

  /** NBA.com Stats play-by-play (v3), which also covers seasons before the CDN feed. */
  playByPlayV3(gameId: string) {
    if (!GAME_ID.test(gameId)) throw providerInvalidResponse('Invalid game ID.');
    const url = new URL('https://stats.nba.com/stats/playbyplayv3');
    url.search = new URLSearchParams({
      EndPeriod: '0',
      GameID: gameId,
      StartPeriod: '0',
    }).toString();
    return this.get<unknown>('playbyplay', `pbp3:${gameId}`, url, () => 86_400);
  }

  /** A team's five-player lineup table (NBA.com, 2007-08 on), source-calculated ratings. */
  lineups(season: string, teamId: number) {
    return this.statsTable('lineups', 'leaguedashlineups', season, teamId, {
      Conference: '',
      DateFrom: '',
      DateTo: '',
      Division: '',
      GameSegment: '',
      GroupQuantity: '5',
      Height: '',
      LastNGames: '0',
      LeagueID: '00',
      Location: '',
      MeasureType: 'Advanced',
      Month: '0',
      OpponentTeamID: '0',
      Outcome: '',
      PORound: '0',
      PaceAdjust: 'N',
      PerMode: 'Totals',
      Period: '0',
      PlusMinus: 'N',
      Rank: 'N',
      SeasonSegment: '',
      SeasonType: 'Regular Season',
      ShotClockRange: '',
      VsConference: '',
      VsDivision: '',
    });
  }

  /** A team's players on and off the floor (NBA.com), source-calculated ratings. */
  onOff(season: string, teamId: number) {
    return this.statsTable('lineups', 'teamplayeronoffdetails', season, teamId, {
      DateFrom: '',
      DateTo: '',
      GameSegment: '',
      LastNGames: '0',
      LeagueID: '00',
      Location: '',
      MeasureType: 'Advanced',
      Month: '0',
      OpponentTeamID: '0',
      Outcome: '',
      PaceAdjust: 'N',
      PerMode: 'Totals',
      Period: '0',
      PlusMinus: 'N',
      Rank: 'N',
      SeasonSegment: '',
      SeasonType: 'Regular Season',
      VsConference: '',
      VsDivision: '',
    });
  }

  private statsTable(
    source: LiveSourceId,
    endpoint: 'leaguedashlineups' | 'teamplayeronoffdetails',
    season: string,
    teamId: number,
    params: Record<string, string>,
  ) {
    if (!/^\d{4}-\d{2}$/.test(season) || !Number.isInteger(teamId) || teamId <= 0)
      throw providerInvalidResponse('Invalid season or team.');
    const url = new URL(`https://stats.nba.com/stats/${endpoint}`);
    url.search = new URLSearchParams({
      ...params,
      Season: season,
      TeamID: String(teamId),
    }).toString();
    // Past seasons do not change; the season under way is refreshed hourly.
    return this.get<unknown>(
      source,
      `${endpoint}:${season}:${teamId}`,
      url,
      () => 3600,
    );
  }

  /** NBA.com Stats standings table for one season (used for the current season). */
  standings(season: string) {
    if (!/^\d{4}-\d{2}$/.test(season)) throw providerInvalidResponse('Invalid season.');
    const url = new URL('https://stats.nba.com/stats/leaguestandingsv3');
    url.search = new URLSearchParams({
      LeagueID: '00',
      Season: season,
      SeasonType: 'Regular Season',
    }).toString();
    return this.get<unknown>('standings', `standings:${season}`, url, () => 300);
  }

  /** NBA.com Stats traditional box score (v3), with starters and did-not-play notes. */
  boxscoreV3(gameId: string) {
    if (!GAME_ID.test(gameId)) throw providerInvalidResponse('Invalid game ID.');
    const url = new URL('https://stats.nba.com/stats/boxscoretraditionalv3');
    url.search = new URLSearchParams({
      EndPeriod: '0',
      EndRange: '0',
      GameID: gameId,
      RangeType: '0',
      StartPeriod: '0',
      StartRange: '0',
    }).toString();
    return this.get<unknown>('boxscore', `box3:${gameId}`, url, () => 86_400);
  }
}

function lastActionIsGameEnd(v: unknown) {
  const actions = (v as { game?: { actions?: { actionType?: unknown }[] } }).game
    ?.actions;
  return Array.isArray(actions) && actions.at(-1)?.actionType === 'game';
}
