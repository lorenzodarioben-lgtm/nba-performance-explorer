// Opt-in source compatibility audit. At most30 fixed historical pages, serial,
// no retries, no identity enrichment or NBA requests. Never used by server startup.
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { staticTeamDirectoryProvider } from '../features/teams/team-directory-provider.js';
import {
  WikiArchiveClient,
  ArchiveSourceError,
} from '../features/wiki-archive/wiki-client.js';
import { mapTeamArchive } from '../features/wiki-archive/team-archive-provider.js';
const client = new WikiArchiveClient(),
  teams = await staticTeamDirectoryProvider.listTeams();
const dir = await mkdtemp(join(tmpdir(), 'nba-team-compatibility-'));
const results: {
  team: string;
  status: string;
  revision?: number;
  roster?: number;
  regularParticipants?: number;
  playoffParticipants?: number;
  unspecifiedParticipants?: number;
  games?: number;
  wins?: number;
  kind?: string;
}[] = [];
let consecutiveUnavailable = 0;
for (const team of teams) {
  try {
    const page = await client.getPage(`2023–24 ${team.name} season`);
    await writeFile(join(dir, `${team.abbreviation}.json`), JSON.stringify(page));
    const data = mapTeamArchive(page, team, teams);
    results.push({
      team: team.abbreviation,
      status: 'PASS',
      revision: page.revision,
      roster: data.roster.length,
      regularParticipants: data.statistics['regular-season'].length,
      playoffParticipants: data.statistics.playoffs.length,
      unspecifiedParticipants: data.statistics['source-unspecified'].length,
      games: data.results.length,
      wins: data.results.filter((g) => g.result === 'W').length,
    });
    consecutiveUnavailable = 0;
  } catch (error) {
    if (!(error instanceof ArchiveSourceError)) throw error;
    results.push({ team: team.abbreviation, status: 'UNAVAILABLE', kind: error.kind });
    if (error.kind !== 'invalid' && ++consecutiveUnavailable >= 2) break;
  }
}
const summary = {
  checkedAt: new Date().toISOString(),
  environment: 'genuine-public-wikipedia-pages',
  productionHostTested: false,
  identityEnrichmentTested: false,
  sourcePageBudget: 30,
  pagesAttempted: results.length,
  passed: results.filter((r) => r.status === 'PASS').length,
  unavailable: results.filter((r) => r.status !== 'PASS').length,
  cachedResponsesForDiagnosis: dir,
  results,
};
await writeFile(
  'docs/expansion/LIVE_TEAM_COMPATIBILITY.json',
  JSON.stringify(summary, null, 2) + '\n',
);
console.log(JSON.stringify(summary, null, 2));
