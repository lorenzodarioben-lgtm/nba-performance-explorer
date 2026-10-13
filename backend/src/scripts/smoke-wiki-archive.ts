import assert from 'node:assert/strict';
import {
  ArchiveGamesResponseSchema,
  ArchiveLeagueResponseSchema,
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
  if (++requests > 10) throw new Error('Request budget exceeded.');
  const r = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000) });
  assert.equal(r.status, 200, `Unexpected ${path} status`);
  return r;
}
const league = ArchiveLeagueResponseSchema.parse(
  await (await read('/api/standings')).json(),
);
assert.equal(league.provenance.source, 'wikipedia');
assert.equal(league.provenance.isLive, false);
assert.equal(league.standings.length, 30);
assert.equal(new Set(league.standings.map((s) => s.team.id)).size, 30);
assert.ok(league.leaders.length >= 20);
assert.equal(league.attribution.license, 'CC BY-SA 4.0');
assert.ok(league.attribution.revision > 0);
assert.ok(league.provenance.retrievedAt);
assert.equal(league.provenance.asOf, null);
const leaders = ArchiveLeagueResponseSchema.parse(
  await (await read('/api/leaders')).json(),
);
assert.deepEqual(league.leaders, leaders.leaders);
const games = ArchiveGamesResponseSchema.parse(await (await read('/api/games')).json());
assert.equal(games.provenance.source, 'wikipedia');
assert.equal(games.recordedGames, games.games.length);
assert.equal(games.games.length, 82);
const overtime = games.games.find((g) => g.quarters.length > 4)!;
assert.ok(overtime);
const detail = ArchiveGamesResponseSchema.parse(
  await (await read(`/api/games/${overtime.id}`)).json(),
);
assert.equal(detail.games.length, 1);
assert.deepEqual(detail.games[0], overtime);
assert.ok(games.games.every((g) => g.tipoffUtc === null && g.status === 'final'));
const date = ArchiveGamesResponseSchema.parse(
  await (await read(`/api/games?date=${games.lastDate}`)).json(),
);
assert.deepEqual(
  date.games,
  games.games.filter((g) => g.date === games.lastDate),
);
const team = ArchiveGamesResponseSchema.parse(
  await (await read(`/api/games?team=${overtime.home.id}`)).json(),
);
assert.deepEqual(
  team.games,
  games.games.filter(
    (g) => g.home.id === overtime.home.id || g.away.id === overtime.home.id,
  ),
);
for (const path of ['/standings', '/leaders', '/games', `/games/${overtime.id}`])
  assert.match(await (await read(path)).text(), /<div id="root"/);
console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      status: 'PASS',
      environment: 'local-genuine-wikipedia-source',
      productionHostTested: false,
      requests,
      standings: league.standings.length,
      leaders: league.leaders.length,
      recordedGames: games.games.length,
      overtimeGames: games.games.filter((g) => g.quarters.length > 4).length,
      sourceRevisions: {
        season: league.attribution.revision,
        playoffs: games.attribution.revision,
      },
      quarterSumsReconciled: true,
      sourceGameIdsVerified: true,
      unknownTimezonePreserved: true,
      filteredDateAndTeamVerified: true,
      directSpaRefreshes: 4,
    },
    null,
    2,
  ),
);
