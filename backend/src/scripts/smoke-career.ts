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
  if (++requests > 6) throw new Error('Request budget exceeded.');
  const response = await fetch(new URL(path, origin), {
    signal: AbortSignal.timeout(25_000),
  });
  assert.equal(response.status, 200);
  return response;
}
const evidence = [];
for (const id of ['201939', '2544', '893']) {
  const data = CareerResearchResponseSchema.parse(
    await (
      await read(`/api/players/${id}/career?metric=pointsPerGame&minGames=20`)
    ).json(),
  );
  assert.equal(data.status, 'available');
  assert.equal(data.provenance.source, 'nba-stats');
  assert.ok(data.provenance.retrievedAt);
  const aggregate = data.aggregate!;
  assert.equal(
    aggregate.points,
    data.seasons.reduce((sum, s) => sum + s.totals.points!, 0),
  );
  const qualified = data.seasons.filter(
    (s) => s.totals.gamesPlayed >= 20 && s.pointsPerGame !== null,
  );
  const max = Math.max(...qualified.map((s) => s.pointsPerGame!));
  assert.equal(data.peak.value, max);
  assert.deepEqual(
    data.peak.seasons,
    qualified.filter((s) => s.pointsPerGame === max).map((s) => s.totals.season),
  );
  evidence.push({
    playerId: id,
    reportedSeasons: data.seasons.length,
    qualifiedSeasons: qualified.length,
    peakSeasons: data.peak.seasons,
    rawSumAndPeakVerified: true,
  });
}
const comparison = CareerComparisonResponseSchema.parse(
  await (
    await read(
      '/api/analytics/careers?players=201939,2544&metric=trueShooting&minGames=40',
    )
  ).json(),
);
assert.ok(comparison.rows.every((r) => r.status === 'available'));
for (const path of ['/players/893/career', '/lab/careers?players=201939,2544'])
  assert.match(await (await read(path)).text(), /<div id="root"/);
console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      status: 'PASS',
      environment: 'local-genuine-nba-provider',
      productionHostTested: false,
      requests,
      evidence,
      careerComparisonRows: comparison.rows.length,
      directSpaRefreshes: 2,
    },
    null,
    2,
  ),
);
