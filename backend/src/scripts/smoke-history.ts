import assert from 'node:assert/strict';
import { HistoryResponseSchema } from '@nba-performance-explorer/contracts';
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
  if (++requests > 5) throw new Error('Request budget exceeded.');
  const response = await fetch(new URL(path, origin), {
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 200);
  return response;
}
const all = HistoryResponseSchema.parse(
  await (await read('/api/history/seasons')).json(),
);
assert.equal(all.provenance.source, 'wikidata');
assert.equal(all.status, 'available');
assert.ok(all.sourceSeasons >= 70);
assert.ok(all.provenance.retrievedAt);
assert.ok(all.seasons.every((s) => !s.sourceLabel.includes('Summer League')));
assert.equal(new Set(all.seasons.map((s) => s.season)).size, all.seasons.length);
const selected = all.seasons.find((s) => s.season === '1999-00')!;
assert.ok(selected);
assert.equal(selected.sourceLabel, '1999–2000 NBA season');
const detail = HistoryResponseSchema.parse(
  await (await read('/api/history/seasons/1999-00')).json(),
);
assert.equal(detail.seasons.length, 1);
assert.equal(detail.seasons[0]?.id, selected.id);
if (selected.winners[0]) {
  const filtered = HistoryResponseSchema.parse(
    await (
      await read(`/api/history/seasons?champion=${selected.winners[0].id}`)
    ).json(),
  );
  assert.ok(
    filtered.seasons.every((s) =>
      s.winners.some((w) => w.id === selected.winners[0]!.id),
    ),
  );
}
for (const path of ['/history', '/history/1999-00'])
  assert.match(await (await read(path)).text(), /<div id="root"/);
console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      status: 'PASS',
      environment: 'local-genuine-wikidata-source',
      productionHostTested: false,
      requests,
      recordedSeasons: all.sourceSeasons,
      coverage: all.coverage,
      centuryRolloverVerified: true,
      sourceEntityFilterVerified: true,
      directSpaRefreshes: 2,
    },
    null,
    2,
  ),
);
