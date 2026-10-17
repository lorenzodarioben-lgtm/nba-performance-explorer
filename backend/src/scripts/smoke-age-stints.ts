import assert from 'node:assert/strict';
import {
  CareerComparisonResponseSchema,
  CareerResearchResponseSchema,
} from '@nba-performance-explorer/contracts';
const origin = new URL(process.env.NBA_ENGINE_SMOKE_ORIGIN ?? 'http://127.0.0.1:3002');
if (
  origin.protocol !== 'http:' ||
  !['localhost', '127.0.0.1'].includes(origin.hostname) ||
  origin.username ||
  origin.password ||
  origin.pathname !== '/'
)
  throw new Error('Use a local engine origin.');
let requests = 0;
async function read(path: string) {
  if (++requests > 4) throw new Error('Request budget exceeded.');
  const response = await fetch(new URL(path, origin), {
    signal: AbortSignal.timeout(25000),
  });
  assert.equal(response.status, 200);
  return response.json() as Promise<unknown>;
}
const data = CareerResearchResponseSchema.parse(await read('/api/players/2544/career'));
assert.equal(data.provenance.source, 'nba-stats');
assert.equal(data.birthDate, '1984-12-30');
const selected = data.seasons.find((s) => s.totals.season === '2023-24')!;
assert.equal(selected.ageOnOctober1, 38);
assert.ok(data.birthDateRetrievedAt);
const traded = CareerResearchResponseSchema.parse(
  await read('/api/players/1629029/career'),
);
const stintSeason = traded.seasons.find((s) => s.totals.season === '2024-25')!;
assert.equal(stintSeason.teams.length, 2);
assert.deepEqual(
  new Set(stintSeason.teams.map((s) => s.abbreviation)),
  new Set(['DAL', 'LAL']),
);
assert.equal(
  stintSeason.teams.reduce((n, s) => n + s.gamesPlayed, 0),
  stintSeason.totals.gamesPlayed,
);
const comparison = CareerComparisonResponseSchema.parse(
  await read('/api/analytics/careers?players=201939,2544'),
);
assert.ok(
  comparison.rows.every(
    (r) => r.data?.birthDate && r.data.seasons.some((s) => s.ageOnOctober1 !== null),
  ),
);
console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      status: 'PASS',
      environment: 'local-genuine-nba-provider',
      productionHostTested: false,
      requests,
      ageReference: data.ageReference,
      birthdayBoundaryVerified: true,
      tradeSeason: stintSeason.totals.season,
      tradeStintCount: stintSeason.teams.length,
      rawAggregateNotDoubleCounted: true,
      comparisonAgeRows: comparison.rows.length,
    },
    null,
    2,
  ),
);
