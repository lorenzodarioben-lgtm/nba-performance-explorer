// Loads the committed NBA.com Stats league archive. Season summaries are small and are read on
// first use; game files (every box line) are read lazily and kept in a small LRU cache so a long
// running server never holds more than a few seasons of box lines in memory.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import {
  LeagueIndexSchema,
  LeagueSeasonGamesSchema,
  LeagueSeasonSummarySchema,
  LINE_FIELDS,
  type LeagueIndex,
  type LeagueScope,
  type LeagueSeasonGames,
  type LeagueSeasonSummary,
  type Line,
  type LineField,
} from './league-data.js';

const GAMES_CACHE = 4;

export interface PlayerGameLine {
  gameId: string;
  date: string;
  playerId: number;
  teamId: number;
  opponentId: number;
  home: boolean;
  /** Played at a neutral site; home is NBA.com's designated home team. */
  neutral: boolean;
  won: boolean;
  line: Line;
}

export class LeagueArchive {
  readonly index: LeagueIndex;
  private readonly summaries = new Map<string, LeagueSeasonSummary>();
  private readonly games = new Map<string, LeagueSeasonGames>();

  constructor(private readonly dir: URL = new URL('./data/', import.meta.url)) {
    this.index = LeagueIndexSchema.parse(
      JSON.parse(readFileSync(new URL('index.json', dir), 'utf8')),
    );
  }

  get seasons() {
    return this.index.seasons.map((s) => s.season);
  }

  has(season: string) {
    return this.index.seasons.some((s) => s.season === season);
  }

  private read(name: string, expected: string) {
    const bytes = readFileSync(new URL(name, this.dir));
    // The index pins each file's digest: a modified or truncated file fails loudly.
    if (createHash('sha256').update(bytes).digest('hex') !== expected)
      throw new Error(
        `League archive file ${name} does not match its recorded digest.`,
      );
    return JSON.parse(gunzipSync(bytes).toString('utf8')) as unknown;
  }

  summary(season: string): LeagueSeasonSummary {
    const hit = this.summaries.get(season);
    if (hit) return hit;
    const entry = this.index.seasons.find((s) => s.season === season);
    if (!entry) throw new Error(`Season ${season} is not in the league archive.`);
    const parsed = LeagueSeasonSummarySchema.parse(
      this.read(`${season}.summary.json.gz`, entry.summarySha256),
    );
    this.summaries.set(season, parsed);
    return parsed;
  }

  seasonGames(season: string): LeagueSeasonGames {
    const hit = this.games.get(season);
    if (hit) {
      this.games.delete(season);
      this.games.set(season, hit);
      return hit;
    }
    const entry = this.index.seasons.find((s) => s.season === season);
    if (!entry) throw new Error(`Season ${season} is not in the league archive.`);
    const parsed = LeagueSeasonGamesSchema.parse(
      this.read(`${season}.games.json.gz`, entry.gamesSha256),
    );
    this.games.set(season, parsed);
    while (this.games.size > GAMES_CACHE)
      this.games.delete(this.games.keys().next().value!);
    return parsed;
  }

  /** Every player's box line in a season scope, with the game's date, opponent and result. */
  playerLines(season: string, scope: LeagueScope): PlayerGameLine[] {
    const data = this.seasonGames(season).scopes[scope];
    if (!data) return [];
    const games = new Map(data.games.map((g) => [g[0], g]));
    return data.playerLines.map((l) => {
      const g = games.get(l[0])!;
      const home = g[2] === l[2];
      return {
        gameId: l[0],
        date: g[1],
        playerId: l[1],
        teamId: l[2],
        opponentId: home ? g[3] : g[2],
        home,
        neutral: g[6] === 1,
        won: home ? g[4] > g[5] : g[5] > g[4],
        line: l.slice(3) as Line,
      };
    });
  }

  playerName(season: string, playerId: number) {
    return (
      this.summary(season).players.find((p) => p.playerId === playerId)?.name ?? null
    );
  }

  team(season: string, teamId: number) {
    return this.summary(season).teams.find((t) => t.teamId === teamId) ?? null;
  }

  /** The season containing a game ID (00 + type digit + 2-digit start year + 5-digit number). */
  seasonOfGame(gameId: string) {
    const yy = Number(gameId.slice(3, 5));
    const start = yy >= 46 ? 1900 + yy : 2000 + yy;
    const season = `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
    return this.has(season) ? season : null;
  }
}

export const value = (line: Line, field: LineField) =>
  line[LINE_FIELDS.indexOf(field)] ?? null;
