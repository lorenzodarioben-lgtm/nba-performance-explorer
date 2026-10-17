import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as C from '@nba-performance-explorer/contracts';

// Opt-in local acceptance only. No retries, remote host, fixtures or deployment.
const origin = new URL(process.env.NBA_ENGINE_SMOKE_ORIGIN ?? 'http://127.0.0.1:3002');
assert.ok(
  origin.protocol === 'http:' &&
    ['localhost', '127.0.0.1'].includes(origin.hostname) &&
    origin.pathname === '/' &&
    !origin.username &&
    !origin.password,
);
const began = Date.now(),
  results: {
    path: string;
    status: number;
    milliseconds: number;
    bytes: number;
    ok: boolean;
  }[] = [];
const bodies = new Map<string, unknown>();
async function request(path: string, schema?: string, expected = 200, method = 'GET') {
  assert.ok(
    results.length < 100 && Date.now() - began < 600_000,
    'Bounded closeout budget exhausted.',
  );
  const start = Date.now();
  const r = await fetch(new URL(path, origin), {
    method,
    signal: AbortSignal.timeout(schema ? 30_000 : 5_000),
  });
  const raw = await r.text();
  const result = {
    path,
    status: r.status,
    milliseconds: Date.now() - start,
    bytes: Buffer.byteLength(raw),
    ok: r.status === expected,
  };
  results.push(result);
  assert.equal(r.status, expected, `Unexpected response: ${path.split('?')[0]}`);
  if (schema) {
    const parser = (
      C as unknown as Record<string, { parse: (value: unknown) => unknown }>
    )[schema];
    assert.ok(parser, `Unknown own contract ${schema}`);
    const data = parser.parse(JSON.parse(raw));
    bodies.set(path, data);
    if (data && typeof data === 'object' && 'provenance' in data) {
      const p = C.DataProvenanceSchema.parse(data.provenance);
      assert.notEqual(p.source, 'fixture');
      assert.equal(p.isLive, false);
    }
  } else if (expected === 200) assert.ok(raw.toLowerCase().includes('<!doctype html>'));
}
const selections = 'players=201939,2544&seasons=2023-24,2023-24';
const apis: [string, string][] = [
  ['/api/health', 'HealthResponseSchema'],
  ['/api/data-sources/status', 'CapabilityResponseSchema'],
  ['/api/players?search=Stephen', 'PlayerSearchResponseSchema'],
  ['/api/players/201939', 'PlayerProfileResponseSchema'],
  ['/api/players/201939/seasons', 'PlayerSeasonsResponseSchema'],
  ['/api/players/201939/seasons/2023-24/stats', 'PlayerSeasonStatsResponseSchema'],
  ['/api/players/201939/season-trends', 'PlayerSeasonTrendsResponseSchema'],
  ['/api/players/201939/seasons/2023-24/games', 'PlayerGameLogResponseSchema'],
  ['/api/players/201939/insights?season=2023-24', 'PlayerInsightsResponseSchema'],
  ['/api/players/201939/totals?season=2023-24', 'SeasonTotalsResponseSchema'],
  ['/api/players/201939/career?minGames=20', 'CareerResearchResponseSchema'],
  ['/api/players/201939/game-research?season=2023-24', 'GameResearchResponseSchema'],
  [
    '/api/players/201939/season-scopes?season=2023-24',
    'SeasonScopeComparisonResponseSchema',
  ],
  [`/api/analytics/compare?${selections}`, 'ComparisonResponseSchema'],
  [`/api/analytics/cohort?${selections}`, 'CohortResponseSchema'],
  ['/api/analytics/careers?players=201939,2544', 'CareerComparisonResponseSchema'],
  ['/api/teams', 'TeamDirectoryResponseSchema'],
  ['/api/teams/nba:1610612747', 'TeamDetailResponseSchema'],
  ['/api/teams/nba:1610612747/archive?season=2023-24', 'TeamArchiveResponseSchema'],
  ['/api/standings', 'ArchiveLeagueResponseSchema'],
  ['/api/leaders', 'ArchiveLeagueResponseSchema'],
  ['/api/games', 'ArchiveGamesResponseSchema'],
  ['/api/games/nba:0042300405', 'ArchiveGamesResponseSchema'],
  ['/api/history/seasons', 'HistoryResponseSchema'],
  ['/api/history/seasons/1999-00', 'HistoryResponseSchema'],
  ['/api/history/awards', 'HistoricalAwardsResponseSchema'],
  ['/api/history/draft?pageSize=30', 'DraftResponseSchema'],
  ['/api/recorded/directory', 'RecordedDirectorySchema'],
  ['/api/recorded/leaders', 'ArchiveRankingResponseSchema'],
  ['/api/recorded/records', 'RecordedRecordsResponseSchema'],
  [
    '/api/recorded/team-comparison?teams=nba:1610612747,nba:1610612738',
    'RecordedTeamComparisonSchema',
  ],
  [
    '/api/recorded/hypothetical?players=2544,201939,203076,1629029,1626157',
    'HypotheticalGroupSchema',
  ],
  ['/api/recorded/analytics?target=201939', 'RecordedAnalyticsResponseSchema'],
  ['/api/recorded/profiles?players=201939,2544,999', 'RecordedProfilesResponseSchema'],
  ['/api/recorded/team-rankings', 'RecordedTeamRankingsResponseSchema'],
  ['/api/recorded/discovery?target=201939', 'RecordedDiscoveryResponseSchema'],
  ['/api/recorded/calendar?day=02-29', 'RecordedCalendarResponseSchema'],
  ['/api/recorded/progression', 'RecordedProgressionResponseSchema'],
  ['/api/shots/directory', 'ShotDirectorySchema'],
  ['/api/shots?players=201939', 'ShotResponseSchema'],
  ['/api/shots/box?game=nba:0041700402', 'ShotBoxResponseSchema'],
  ['/api/research-lineups/directory', 'StudyDirectorySchema'],
  ['/api/research-lineups?members=br:curryst01', 'StudyLineupResponseSchema'],
  [
    '/api/recorded/team-rankings?conference=West&search=LAL',
    'RecordedTeamRankingsResponseSchema',
  ],
  [
    '/api/recorded/team-rankings?completeOnly=true',
    'RecordedTeamRankingsResponseSchema',
  ],
  [
    '/api/recorded/team-rankings?metric=lastTenWins',
    'RecordedTeamRankingsResponseSchema',
  ],
];
let status = 'PASS',
  failure: string | null = null,
  spaCount = 0;
try {
  for (const [path, schema] of apis) await request(path, schema);
  const capabilities = C.CapabilityResponseSchema.parse(
    bodies.get('/api/data-sources/status'),
  );
  assert.equal(capabilities.playerSource, 'nba-stats');
  assert.equal(capabilities.hostVerified, false);
  const teams = C.RecordedTeamRankingsResponseSchema.parse(
    bodies.get('/api/recorded/team-rankings'),
  );
  assert.equal(teams.rows.length, 30);
  assert.equal(teams.reconciledGames, 1219);
  assert.equal(
    teams.rows.reduce((s, r) => s + r.observedGames, 0),
    2438,
  );
  assert.equal(teams.quarantinedGameIds.length, 11);
  assert.equal(teams.officialStandings, false);
  const searched = C.RecordedTeamRankingsResponseSchema.parse(
    bodies.get('/api/recorded/team-rankings?conference=West&search=LAL'),
  );
  assert.equal(searched.rankingPopulation, 15);
  assert.equal(searched.rows[0]?.observedGames, 82);
  assert.equal(searched.rows[0]?.wins, 47);
  const complete = C.RecordedTeamRankingsResponseSchema.parse(
    bodies.get('/api/recorded/team-rankings?completeOnly=true'),
  );
  assert.ok(complete.rows.every((r) => r.completeSeason));
  const profiles = C.RecordedProfilesResponseSchema.parse(
    bodies.get('/api/recorded/profiles?players=201939,2544,999'),
  );
  assert.equal(profiles.population, 363);
  assert.equal(profiles.profiles[2]?.categories.length, 0);
  const ranking = C.ArchiveRankingResponseSchema.parse(
    bodies.get('/api/recorded/leaders'),
  );
  const { recordedRankingCsv } = (await import(
    new URL(
      '../../../frontend/src/features/recorded-archive/recorded-csv.ts',
      import.meta.url,
    ).href
  )) as { recordedRankingCsv: (data: C.ArchiveRankingResponse) => string };
  const { shotPageCsv } = (await import(
    new URL(
      '../../../frontend/src/features/shot-archive/shot-export.ts',
      import.meta.url,
    ).href
  )) as { shotPageCsv: (data: C.ShotResponse) => string };
  assert.ok(recordedRankingCsv(ranking).includes('CC BY-SA4.0'));
  const shots = C.ShotResponseSchema.parse(bodies.get('/api/shots?players=201939'));
  assert.equal(shots.filteredAttempts, 261);
  assert.ok(shotPageCsv(shots).includes(shots.source.sha256));
  const app = await readFile(
    new URL('../../../frontend/src/App.tsx', import.meta.url),
    'utf8',
  );
  const routes = ['/', ...app.matchAll(/path="([^"]+)"/g)]
    .map((r) => (typeof r === 'string' ? r : r[1]!))
    .filter((r) => r !== '*')
    .map((r) =>
      r
        .replace(':playerId', '201939')
        .replace(':teamId', 'nba:1610612747')
        .replace(':gameId', 'nba:0042300405')
        .replace(':season', '1999-00'),
    );
  for (const route of new Set(routes)) {
    await request(route);
    spaCount++;
  }
  for (const [path, expected, method] of [
    ['/api/recorded/team-rankings?metric=netRating', 400, 'GET'],
    ['/api/recorded/profiles?players=1,1', 400, 'GET'],
    ['/api/shots?players=999', 404, 'GET'],
    ['/api/history/draft?year=2026', 400, 'GET'],
    ['/api/recorded/team-rankings', 405, 'POST'],
  ] as const)
    await request(path, undefined, expected, method);
  for (const file of [
    'features/shot-archive/shot-events.csv',
    'features/lineup-study/lineup-study-snapshot.json',
  ]) {
    const source = await readFile(new URL(`../${file}`, import.meta.url)),
      built = await readFile(new URL(`../../dist/${file}`, import.meta.url));
    assert.equal(
      createHash('sha256').update(source).digest('hex'),
      createHash('sha256').update(built).digest('hex'),
    );
  }
} catch (e) {
  status = 'FAIL';
  failure = e instanceof Error ? e.message : 'Closeout acceptance failed.';
}
const report = {
  checkedAt: new Date().toISOString(),
  status,
  failure,
  environment: 'local-production-mode-genuine-providers',
  productionHostTested: false,
  deployed: false,
  requests: results.length,
  contractApiChecks: results.filter(
    (r) => r.path.startsWith('/api/') && r.status === 200,
  ).length,
  spaDirectRefreshChecks: spaCount,
  byteIdenticalRecordedAssets: status === 'PASS',
  genuineCsvContentVerified: status === 'PASS',
  durationMilliseconds: Date.now() - began,
  results,
};
if (process.argv.includes('--write-report'))
  await writeFile(
    new URL('../../../docs/expansion/CLOSEOUT_ACCEPTANCE.json', import.meta.url),
    JSON.stringify(report, null, 2) + '\n',
  );
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
if (status !== 'PASS') process.exitCode = 1;
