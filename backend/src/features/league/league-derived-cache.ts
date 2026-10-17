// Build-time results of the existing archive calculations. Production reads this small,
// validated artifact instead of scanning all 43 seasons on its HTTP event loop at startup.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import {
  LeagueHonoursResponseSchema,
  LeagueRecordsResponseSchema,
  LeagueRecordCategorySchema,
  type LeagueRecordsQuery,
} from '@nba-performance-explorer/contracts';

export const derivedRecordQueries: LeagueRecordsQuery[] = [];
for (const scope of ['regular-season', 'playoffs'] as const)
  for (const kind of ['game', 'season'] as const)
    for (const category of LeagueRecordCategorySchema.options)
      for (const mode of ['totals', 'per-game'] as const)
        derivedRecordQueries.push({ scope, kind, category, mode });

const key = (q: LeagueRecordsQuery) => `${q.scope}/${q.kind}/${q.category}/${q.mode}`;
const requiredKeys = new Set(derivedRecordQueries.map(key));

export const DerivedLeagueSchema = z
  .object({
    version: z.literal(1),
    inputFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    honours: LeagueHonoursResponseSchema,
    records: z.array(LeagueRecordsResponseSchema).length(requiredKeys.size),
  })
  .strict()
  .refine(
    (data) => {
      const keys = new Set(data.records.map((r) => key(r.query)));
      return (
        keys.size === requiredKeys.size && [...requiredKeys].every((k) => keys.has(k))
      );
    },
    {
      message:
        'Derived league results must cover every supported record query exactly once.',
    },
  );

export function derivedInputFingerprint() {
  const hash = createHash('sha256');
  // Archive indexes pin the raw compressed inputs. Bind the artifact to the algorithms too.
  for (const file of [
    'data/index.json',
    'data/extras-index.json',
    'data/honours.json',
    'league-archive.js',
    'league-service.js',
    'league-records.js',
    'league-honours.js',
    'league-extras.js',
    'league-derived-cache.js',
  ]) {
    hash.update(file);
    hash.update(readFileSync(new URL(file, import.meta.url)));
  }
  return hash.digest('hex');
}

export class DerivedLeagueCache {
  private readonly data;
  private readonly byQuery;

  constructor(input: unknown, expectedFingerprint: string) {
    this.data = DerivedLeagueSchema.parse(input);
    if (this.data.inputFingerprint !== expectedFingerprint)
      throw new Error(
        'Derived league results do not match their source and algorithms.',
      );
    this.byQuery = new Map(this.data.records.map((r) => [key(r.query), r]));
  }

  honours() {
    const result = this.data.honours;
    return {
      ...result,
      provenance: { ...result.provenance, servedAt: new Date().toISOString() },
    };
  }

  records(query: LeagueRecordsQuery) {
    const result = this.byQuery.get(key(query));
    if (!result) throw new Error('Missing derived record query.');
    return {
      ...result,
      provenance: { ...result.provenance, servedAt: new Date().toISOString() },
    };
  }
}

export function loadDerivedLeagueCache(
  file = new URL('./data/derived-research.json', import.meta.url),
  expectedFingerprint?: string,
) {
  if (!existsSync(file)) return undefined;
  const bytes = readFileSync(file);
  const expectedHash = readFileSync(new URL(`${file.href}.sha256`), 'utf8').trim();
  if (createHash('sha256').update(bytes).digest('hex') !== expectedHash)
    throw new Error('Derived league results do not match their recorded digest.');
  return new DerivedLeagueCache(
    JSON.parse(bytes.toString('utf8')),
    expectedFingerprint ?? derivedInputFingerprint(),
  );
}
