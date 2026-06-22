import type {
  PlayerGame,
  PlayerProfile,
  PlayerSeason,
  PlayerSeasonStats,
  PlayerSummary,
} from '@nba-performance-explorer/contracts';

import { ProviderError } from '../provider-error.js';
import type { PlayerProvider } from '../player-provider.js';
import { NbaStatsCache } from './nba-stats-cache.js';
import {
  noopDiagnosticReporter,
  type DiagnosticReporter,
} from './nba-stats-diagnostics.js';
import type { NbaStatsHttpClient } from './nba-stats-http-client.js';
import {
  availableSeasonsFromGroups,
  careerTrendsFromGroups,
  mapGameLog,
  mapPlayerProfile,
  newestSeasonStartYear,
  parseCareerSeasons,
  parseDirectory,
  selectedSeasonStatsFromGroups,
  type CareerSeasonGroups,
} from './nba-stats-mappers.js';
import { searchDirectory, type DirectoryPlayer } from './nba-stats-search.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const DIRECTORY_TTL_MS = 24 * HOUR_MS;
const PROFILE_TTL_MS = 6 * HOUR_MS;
const CAREER_ACTIVE_TTL_MS = 6 * HOUR_MS;
const CAREER_INACTIVE_TTL_MS = 7 * DAY_MS;
const GAME_LOG_CURRENT_TTL_MS = 5 * 60 * 1000;
const GAME_LOG_HISTORICAL_TTL_MS = 7 * DAY_MS;
const EMPTY_TTL_MS = 60 * 1000;

export interface NbaStatsPlayerProviderDeps {
  httpClient: NbaStatsHttpClient;
  cache: NbaStatsCache;
  // Injected clock for deterministic current-season resolution. Defaults to the system clock.
  now?: () => Date;
  // Receives sanitized response diagnostics on an invalid-response failure. Defaults to a no-op,
  // so diagnostics are emitted only when an explicitly enabled reporter is injected.
  reporter?: DiagnosticReporter;
}

// The current NBA season in `YYYY-YY` form. The season starts in October, so October–December
// belong to the calendar year's season and January–September belong to the previous year's.
export function currentNbaSeason(now: Date): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const startYear = month >= 10 ? year : year - 1;
  const endYear = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endYear}`;
}

export class NbaStatsPlayerProvider implements PlayerProvider {
  private readonly httpClient: NbaStatsHttpClient;
  private readonly cache: NbaStatsCache;
  private readonly now: () => Date;
  private readonly reporter: DiagnosticReporter;

  constructor(deps: NbaStatsPlayerProviderDeps) {
    this.httpClient = deps.httpClient;
    this.cache = deps.cache;
    this.now = deps.now ?? (() => new Date());
    this.reporter = deps.reporter ?? noopDiagnosticReporter;
  }

  // Emit a sanitized diagnostic when an upstream response is rejected, enriched with the safe
  // endpoint name. The error is always rethrown unchanged, so whether parsing succeeds or fails and
  // the public error response are unaffected; the reporter is a no-op unless diagnostics are
  // explicitly enabled.
  private async instrument<T>(endpoint: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof ProviderError && error.diagnostic) {
        try {
          this.reporter.report({ ...error.diagnostic, endpoint });
        } catch {
          // Diagnostics are observational only: a reporter that throws must never mask the parser
          // failure or change the outcome. Swallow the reporter error and rethrow the original.
        }
      }
      throw error;
    }
  }

  async searchPlayers(searchTerm: string, limit: number): Promise<PlayerSummary[]> {
    const directory = await this.loadDirectory();
    return searchDirectory(directory, searchTerm, limit);
  }

  async getPlayerById(playerId: string): Promise<PlayerProfile | null> {
    return this.instrument('commonplayerinfo', () =>
      this.cache.getOrLoad(
        `nba-stats:profile:${playerId}`,
        async () =>
          mapPlayerProfile(
            await this.httpClient.fetchEndpoint('commonplayerinfo', {
              PlayerID: playerId,
              LeagueID: '00',
            }),
          ),
        (profile) => (profile === null ? EMPTY_TTL_MS : PROFILE_TTL_MS),
      ),
    );
  }

  async listPlayerSeasons(playerId: string): Promise<PlayerSeason[]> {
    return availableSeasonsFromGroups(await this.loadCareer(playerId));
  }

  async getPlayerSeasonStats(
    playerId: string,
    season: string,
  ): Promise<PlayerSeasonStats | null> {
    return selectedSeasonStatsFromGroups(await this.loadCareer(playerId), season);
  }

  async listPlayerSeasonStats(playerId: string): Promise<PlayerSeasonStats[]> {
    return careerTrendsFromGroups(await this.loadCareer(playerId));
  }

  async listPlayerGames(playerId: string, season: string): Promise<PlayerGame[]> {
    const isCurrentSeason = season === currentNbaSeason(this.now());
    return this.instrument('playergamelog', () =>
      this.cache.getOrLoad(
        `nba-stats:games:${playerId}:${season}`,
        async () =>
          mapGameLog(
            await this.httpClient.fetchEndpoint('playergamelog', {
              PlayerID: playerId,
              Season: season,
              SeasonType: 'Regular Season',
              DateFrom: '',
              DateTo: '',
              LeagueID: '00',
            }),
          ),
        (games) => {
          if (games.length === 0) {
            return EMPTY_TTL_MS;
          }
          return isCurrentSeason ? GAME_LOG_CURRENT_TTL_MS : GAME_LOG_HISTORICAL_TTL_MS;
        },
      ),
    );
  }

  private async loadDirectory(): Promise<DirectoryPlayer[]> {
    const season = currentNbaSeason(this.now());
    return this.instrument('commonallplayers', () =>
      this.cache.getOrLoad(
        `nba-stats:directory:${season}`,
        async () =>
          parseDirectory(
            await this.httpClient.fetchEndpoint('commonallplayers', {
              LeagueID: '00',
              Season: season,
              IsOnlyCurrentSeason: '0',
            }),
          ),
        (players) => (players.length === 0 ? EMPTY_TTL_MS : DIRECTORY_TTL_MS),
      ),
    );
  }

  // One cached career response per player powers available seasons, selected-season stats, and
  // career trends. The TTL is shorter for a still-active player than for a retired one.
  private async loadCareer(playerId: string): Promise<CareerSeasonGroups> {
    const currentStartYear = Number.parseInt(
      currentNbaSeason(this.now()).slice(0, 4),
      10,
    );
    return this.instrument('playercareerstats', () =>
      this.cache.getOrLoad(
        `nba-stats:career:${playerId}`,
        async () =>
          parseCareerSeasons(
            await this.httpClient.fetchEndpoint('playercareerstats', {
              PlayerID: playerId,
              PerMode: 'PerGame',
              LeagueID: '00',
            }),
          ),
        (groups) => {
          if (groups.size === 0) {
            return EMPTY_TTL_MS;
          }
          return newestSeasonStartYear(groups) === currentStartYear
            ? CAREER_ACTIVE_TTL_MS
            : CAREER_INACTIVE_TTL_MS;
        },
      ),
    );
  }
}
