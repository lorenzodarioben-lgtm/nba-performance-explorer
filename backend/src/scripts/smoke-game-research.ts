import assert from 'node:assert/strict';
import {
  GameResearchResponseSchema,
  CareerResearchResponseSchema,
  SeasonScopeComparisonResponseSchema,
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
  if (++requests > 8) throw new Error('Request budget exceeded.');
  const response = await fetch(new URL(path, origin), {
    signal: AbortSignal.timeout(25_000),
  });
  assert.equal(response.status, 200, path);
  return response;
}
const regular = GameResearchResponseSchema.parse(
  await (
    await read('/api/players/201939/game-research?season=2023-24&window=10')
  ).json(),
);
assert.equal(regular.status, 'available');
assert.equal(regular.provenance.source, 'nba-stats');
assert.equal(regular.scope, 'regular-season');
assert.ok(regular.observedGames > 10);
const totals = regular.summary.totals;
assert.equal(
  regular.summary.metrics.trueShooting,
  totals.points! /
    (2 * (totals.fieldGoalsAttempted! + 0.44 * totals.freeThrowsAttempted!)),
);
assert.equal(
  regular.summary.metrics.fieldGoalPercentage,
  totals.fieldGoalsMade! / totals.fieldGoalsAttempted!,
);
assert.equal(regular.rolling.at(-1)?.summary.sample, 10);
const threshold = GameResearchResponseSchema.parse(
  await (
    await read('/api/players/201939/game-research?season=2023-24&minPoints=40')
  ).json(),
);
assert.ok(threshold.filteredGames > 0);
assert.ok(threshold.games.every((g) => g.game.points >= 40));
assert.ok(threshold.rolling.every((r) => r.summary.perGame.points! >= 40));
const playoffs = GameResearchResponseSchema.parse(
  await (
    await read('/api/players/201939/game-research?season=2022-23&scope=playoffs')
  ).json(),
);
assert.equal(playoffs.scope, 'playoffs');
assert.equal(playoffs.provenance.scope, 'playoffs');
assert.equal(playoffs.observedGames, 13);
assert.equal(playoffs.reportedSeasonGames, 13);
const scopes = SeasonScopeComparisonResponseSchema.parse(
  await (await read('/api/players/201939/season-scopes?season=2022-23')).json(),
);
assert.ok(scopes.rows.every((r) => r.status === 'available'));
assert.notEqual(
  scopes.rows[0]?.totals?.gamesPlayed,
  scopes.rows[1]?.totals?.gamesPlayed,
);
const career = CareerResearchResponseSchema.parse(
  await (await read('/api/players/201939/career?scope=playoffs&minGames=10')).json(),
);
assert.equal(career.provenance.scope, 'playoffs');
assert.ok(career.seasons.length > 0);
assert.match(
  await (await read('/players/201939/games?season=2022-23&scope=playoffs')).text(),
  /<div id="root"/,
);
console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      status: 'PASS',
      environment: 'local-genuine-nba-provider',
      productionHostTested: false,
      requests,
      regularObserved: regular.observedGames,
      rawWeightedShootingVerified: true,
      threshold: {
        minimumPoints: 40,
        matchingGames: threshold.filteredGames,
        filteredRollingVerified: true,
      },
      playoffsObserved: playoffs.observedGames,
      scopeSeparationVerified: true,
      playoffCareerSeasons: career.seasons.length,
      directSpaRefreshes: 1,
    },
    null,
    2,
  ),
);
