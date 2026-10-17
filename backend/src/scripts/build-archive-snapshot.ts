// Opt-in historical data update. Never invoked by startup, CI or a failed live fetch.
// From the repository root: npx tsx backend/src/scripts/build-archive-snapshot.ts [--write]
// Fetches exactly two Wikipedia articles (serially, no retries), runs the same strict parsers the
// live provider uses, and without --write only reports what it would store.
import { writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { staticTeamDirectoryProvider } from '../features/teams/team-directory-provider.js';
import { WikiArchiveClient } from '../features/wiki-archive/wiki-client.js';
import {
  mapLeagueArchive,
  mapPlayoffArchive,
} from '../features/wiki-archive/archive-provider.js';
import {
  parsePublishedSeeds,
  buildPlayoffBracket,
} from '../features/wiki-archive/playoff-series.js';
import { ArchiveSnapshotSchema } from '../features/wiki-archive/archive-snapshot.js';

const args = process.argv.slice(2);
if (args.some((a) => a !== '--write'))
  throw new Error('Supported flag: --write (default only reports).');
const root = fileURLToPath(new URL('../../../', import.meta.url));
const target = resolve(root, 'backend/src/features/wiki-archive/archive-snapshot.json');
const client = new WikiArchiveClient();
const teams = await staticTeamDirectoryProvider.listTeams();
const meta = (p: { title: string; revision: number; retrievedAt: string }) => ({
  title: p.title,
  revision: p.revision,
  retrievedAt: p.retrievedAt,
});
const leaguePage = await client.getPage('2023–24 NBA season');
const league = mapLeagueArchive(leaguePage, teams);
const playoffPage = await client.getPage('2024 NBA playoffs');
const games = mapPlayoffArchive(playoffPage, teams);
const seeds = parsePublishedSeeds(playoffPage.html, teams);
const snapshot = ArchiveSnapshotSchema.parse({
  version: 1,
  createdAt: new Date().toISOString(),
  licence: 'CC BY-SA 4.0',
  league: {
    page: meta(leaguePage),
    standings: league.standings,
    leaders: league.leaders,
  },
  playoffs: {
    page: meta(playoffPage),
    games,
    seeds: seeds.seeds ? Object.fromEntries(seeds.seeds) : null,
    seedIssue: seeds.issue,
  },
});
// The same integrity gate as the live bracket: a complete 15-series tree.
const bracket = buildPlayoffBracket(snapshot.playoffs.games, seeds.seeds);
console.log(
  JSON.stringify({
    leagueRevision: leaguePage.revision,
    playoffRevision: playoffPage.revision,
    standings: snapshot.league.standings.length,
    leaders: snapshot.league.leaders.length,
    games: games.length,
    series: bracket.series.length,
    complete: bracket.complete,
    champion: bracket.champion?.abbreviation ?? null,
    seeds: seeds.seeds?.size ?? 0,
  }),
);
if (!bracket.complete) throw new Error('Refusing to store an incomplete bracket.');
if (args.includes('--write')) {
  await writeFile(`${target}.tmp`, `${JSON.stringify(snapshot)}\n`, 'utf8');
  await rename(`${target}.tmp`, target);
  console.log(`Wrote ${target}`);
}
