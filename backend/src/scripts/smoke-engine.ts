import assert from 'node:assert/strict';
import {
  CohortResponseSchema,
  ComparisonResponseSchema,
  PlayerGameLogResponseSchema,
  PlayerInsightsResponseSchema,
  SeasonTotalsResponseSchema,
  TeamDirectoryResponseSchema,
  TeamDetailResponseSchema,
} from '@nba-performance-explorer/contracts';

// Opt-in acceptance of a locally running genuine NBA provider. No production/remote
// calls, fixture substitution or raw response dumps. Bounded sequential public API reads.
const origin = new URL(process.env.NBA_ENGINE_SMOKE_ORIGIN ?? 'http://127.0.0.1:3002');
if (
  origin.protocol !== 'http:' ||
  !['localhost', '127.0.0.1'].includes(origin.hostname) ||
  origin.username ||
  origin.password ||
  origin.pathname !== '/'
)
  throw new Error('Smoke origin must be a local HTTP server origin.');
let requestCount = 0;
async function json(path: string): Promise<unknown> {
  if (++requestCount > 16) throw new Error('Acceptance request budget exceeded.');
  const response = await fetch(new URL(path, origin), {
    signal: AbortSignal.timeout(25_000),
  });
  assert.equal(response.status, 200, `Public API check failed: ${path.split('?')[0]}`);
  return (await response.json()) as unknown;
}
const insights = PlayerInsightsResponseSchema.parse(
  await json('/api/players/201939/insights?season=2023-24&window=10'),
);
assert.equal(insights.provenance.source, 'nba-stats', 'Genuine NBA mode required.');
const log = PlayerGameLogResponseSchema.parse(
  await json('/api/players/201939/seasons/2023-24/games'),
);
assert.ok(log.games.length > 10);
const recent = [...log.games].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
const recentMean = recent.reduce((sum, game) => sum + game.points, 0) / recent.length;
assert.equal(insights.recent.points, recentMean);
assert.equal(insights.recent.sample, recent.length);
const filtered = PlayerInsightsResponseSchema.parse(
  await json('/api/players/201939/insights?season=2023-24&opponent=BOS'),
);
assert.equal(
  filtered.filteredGames,
  log.games.filter((g) => g.opponent.abbreviation === 'BOS').length,
);
const raw = SeasonTotalsResponseSchema.parse(
  await json('/api/players/201939/totals?season=2023-24'),
);
assert.equal(raw.status, 'available');
assert.equal(raw.provenance.source, 'nba-stats');
assert.ok(raw.provenance.retrievedAt);
const t = raw.totals!;
assert.equal(
  raw.metrics!.trueShooting,
  t.points! / (2 * (t.fieldGoalsAttempted! + 0.44 * t.freeThrowsAttempted!)),
);
assert.equal(
  raw.metrics!.effectiveFieldGoal,
  (t.fieldGoalsMade! + 0.5 * t.threesMade!) / t.fieldGoalsAttempted!,
);
const selection = 'players=201939,2544,1641705&seasons=2023-24,2023-24,2023-24';
const comparison = ComparisonResponseSchema.parse(
  await json(`/api/analytics/compare?${selection}`),
);
assert.ok(comparison.rows.filter((r) => r.status === 'available').length >= 2);
const cohort = CohortResponseSchema.parse(
  await json(`/api/analytics/cohort?${selection}`),
);
assert.ok(cohort.analysis.sample >= 2);
const shooting = CohortResponseSchema.parse(
  await json(`/api/analytics/cohort?${selection}&x=trueShooting&y=assistTurnover`),
);
assert.ok(shooting.analysis.sample >= 2);
const reversed = CohortResponseSchema.parse(
  await json(`/api/analytics/cohort?${selection}&weightX=-1&weightY=-1`),
);
assert.notEqual(reversed.analysis.rows[0]?.playerId, cohort.analysis.rows[0]?.playerId);
const teams = TeamDirectoryResponseSchema.parse(await json('/api/teams'));
assert.equal(teams.teams.length, 30);
const team = TeamDetailResponseSchema.parse(await json('/api/teams/nba%3A1610612744'));
assert.equal(team.team.abbreviation, 'GSW');
for (const route of [
  '/explore',
  '/players/201939/insights',
  '/lab/compare',
  '/lab/analytics',
  '/my-nba',
  '/teams',
]) {
  requestCount++;
  const response = await fetch(new URL(route, origin), {
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.status, 200);
  assert.ok((await response.text()).toLowerCase().includes('<!doctype html>'));
}
console.log(
  JSON.stringify(
    {
      status: 'PASS',
      environment: 'local-engineering-host',
      checkedAt: new Date().toISOString(),
      publicApiAndSpaRequests: requestCount,
      observedGames: insights.observedGames,
      recentSample: insights.recent.sample,
      opponentFilteredGames: filtered.filteredGames,
      rawSeasonGames: t.gamesPlayed,
      rawInputsAndFormulasVerified: true,
      comparedSlots: comparison.rows.length,
      availableSlots: comparison.rows.filter((r) => r.status === 'available').length,
      qualifiedCohort: cohort.analysis.sample,
      qualifiedRawMetricCohort: shooting.analysis.sample,
      weightsChangedResult: true,
      currentTeams: teams.teams.length,
      spaDirectRefreshRoutes: 6,
      productionHostTested: false,
      deployed: false,
    },
    null,
    2,
  ),
);
