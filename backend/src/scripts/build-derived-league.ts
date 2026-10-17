// Runs after compilation and source-data copying, before Render starts the HTTP process.
// The existing calculations and contract validators remain the authority for every result.
import { createHash } from 'node:crypto';
import { deepStrictEqual } from 'node:assert';
import { writeFileSync } from 'node:fs';
import { LeagueService } from '../features/league/league-service.js';
import { LeagueHonours } from '../features/league/league-honours.js';
import { LeagueRecords } from '../features/league/league-records.js';
import {
  DerivedLeagueSchema,
  derivedInputFingerprint,
  derivedRecordQueries,
  loadDerivedLeagueCache,
} from '../features/league/league-derived-cache.js';

const service = new LeagueService();
const honours = new LeagueHonours(service);
const records = new LeagueRecords(service);
await honours.warm();
await records.warm('regular-season');
await records.warm('playoffs');
const data = DerivedLeagueSchema.parse({
  version: 1,
  inputFingerprint: derivedInputFingerprint(),
  honours: honours.honours(),
  records: derivedRecordQueries.map((query) => records.records(query)),
});
const bytes = Buffer.from(JSON.stringify(data));
const target = new URL(
  '../features/league/data/derived-research.json',
  import.meta.url,
);
writeFileSync(target, bytes);
writeFileSync(
  new URL(`${target.href}.sha256`),
  createHash('sha256').update(bytes).digest('hex') + '\n',
);
// Verify the serialized artifact against the original calculators before the build can pass.
const loaded = loadDerivedLeagueCache(target);
if (!loaded) throw new Error('Built league research artifact is missing.');
const withoutServedAt = <T extends { provenance: { servedAt: string } }>(
  result: T,
) => ({
  ...result,
  provenance: { ...result.provenance, servedAt: null },
});
deepStrictEqual(withoutServedAt(loaded.honours()), withoutServedAt(data.honours));
for (const query of derivedRecordQueries)
  deepStrictEqual(
    withoutServedAt(loaded.records(query)),
    withoutServedAt(records.records(query)),
  );
console.log(
  `Built validated league research: ${data.honours.champions.length} champions, ${data.records.length} record queries, ${bytes.length} bytes.`,
);
