// Loads the franchise and roster files of the league archive, checking each file's digest.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import {
  ExtrasIndexSchema,
  FranchiseArchiveSchema,
  SeasonRostersSchema,
  type ExtrasIndex,
  type FranchiseArchive,
  type SeasonRosters,
} from './league-extras-data.js';

export class LeagueExtras {
  readonly index: ExtrasIndex | null;
  private franchiseCache: FranchiseArchive | null = null;
  private readonly rosterCache = new Map<string, SeasonRosters>();

  constructor(private readonly dir: URL = new URL('./data/', import.meta.url)) {
    const file = new URL('extras-index.json', dir);
    this.index = existsSync(file)
      ? ExtrasIndexSchema.parse(JSON.parse(readFileSync(file, 'utf8')))
      : null;
  }

  private read(name: string, expected: string) {
    const bytes = readFileSync(new URL(name, this.dir));
    if (createHash('sha256').update(bytes).digest('hex') !== expected)
      throw new Error(
        `League archive file ${name} does not match its recorded digest.`,
      );
    return JSON.parse(gunzipSync(bytes).toString('utf8')) as unknown;
  }

  franchises(): FranchiseArchive | null {
    if (this.franchiseCache) return this.franchiseCache;
    if (!this.index?.franchisesSha256) return null;
    this.franchiseCache = FranchiseArchiveSchema.parse(
      this.read('franchises.json.gz', this.index.franchisesSha256),
    );
    return this.franchiseCache;
  }

  rosters(season: string): SeasonRosters | null {
    const hit = this.rosterCache.get(season);
    if (hit) return hit;
    const entry = this.index?.rosters.find((r) => r.season === season);
    if (!entry) return null;
    const parsed = SeasonRostersSchema.parse(
      this.read(`${season}.rosters.json.gz`, entry.sha256),
    );
    this.rosterCache.set(season, parsed);
    return parsed;
  }
}
