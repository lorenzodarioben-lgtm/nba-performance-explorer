// Opt-in historical data update. Never invoked by startup, CI or unavailable live data.
import { writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { RecordedDatasetSchema } from '@nba-performance-explorer/contracts';
import { staticTeamDirectoryProvider } from '../features/teams/team-directory-provider.js';
import { WikiArchiveClient } from '../features/wiki-archive/wiki-client.js';
import { mapTeamArchive } from '../features/wiki-archive/team-archive-provider.js';
import { WikidataRosterIdentities } from '../features/wiki-archive/roster-identities.js';
import { attribution } from '../features/wiki-archive/archive-provider.js';
import {
  RECORDED_SEASONS,
  seasonFacts,
  type RecordedSeasonId,
} from '../features/wiki-archive/seasons.js';
const argv = process.argv.slice(2);
const seasonFlag = argv.indexOf('--season');
const season: RecordedSeasonId =
  seasonFlag >= 0
    ? (RECORDED_SEASONS.find((s) => s === argv[seasonFlag + 1]) ??
      (() => {
        throw new Error(`--season must be one of ${RECORDED_SEASONS.join(', ')}.`);
      })())
    : '2023-24';
const args = argv.filter((_, i) => i !== seasonFlag && i !== seasonFlag + 1);
if (args.some((a) => a !== '--write' && a !== '--help'))
  throw new Error('Supported flags: --season <season>, --write or --help.');
if (args.includes('--help')) {
  console.log(
    'From repository root: npx tsx backend/src/scripts/build-recorded-snapshot.ts [--season 2022-23] [--write]. Default audits without writing. Max30 fixed Wikipedia pages plus20 bounded exact-article Wikidata queries, serial/no retries. --write requires an unchanged source dataset and preserves source conflicts for runtime quarantine.',
  );
  process.exit(0);
}
const root = fileURLToPath(new URL('../../../', import.meta.url));
const fileName =
  season === '2023-24' ? 'recorded-snapshot.json' : `recorded-snapshot-${season}.json`;
const target = resolve(root, 'backend/src/features/recorded-archive', fileName);
if (
  !target.startsWith(
    resolve(root, 'backend/src/features/recorded-archive') +
      '/'.replace('/', process.platform === 'win32' ? '\\' : '/'),
  )
)
  throw new Error('Unsafe dataset target.');
if (args.includes('--write'))
  execFileSync(
    'git',
    [
      'diff',
      '--quiet',
      'HEAD',
      '--',
      `backend/src/features/recorded-archive/${fileName}`,
    ],
    { cwd: root, stdio: 'pipe' },
  );
const teams = await staticTeamDirectoryProvider.listTeams(),
  client = new WikiArchiveClient();
const snapshots = [];
for (const team of teams) {
  const page = await client.getPage(
    `${seasonFacts(season).label} ${team.name} season` as `2023–24 ${string} season`,
  );
  snapshots.push({
    team,
    season,
    ...mapTeamArchive(page, team, teams, season),
    attribution: attribution(page),
    retrievedAt: page.retrievedAt,
  });
}
const people = snapshots.flatMap((t) => [
  ...t.roster,
  ...t.statistics['regular-season'],
  ...t.statistics.playoffs,
  ...t.statistics['source-unspecified'],
]);
const articles = [
  ...new Set(people.flatMap((p) => (p.articleUrl ? [p.articleUrl] : []))),
].sort();
if (Math.ceil(articles.length / 60) > 20)
  throw new Error('Historical identity request budget exceeded.');
let identityRequests = 0,
  mappedArticleIdentities = 0;
const identities = new WikidataRosterIdentities();
for (let i = 0; i < articles.length; i += 60) {
  const data = await identities.getIdentities(articles.slice(i, i + 60));
  identityRequests++;
  mappedArticleIdentities += data.identities.size;
  for (const p of people) {
    const identity = p.articleUrl ? data.identities.get(p.articleUrl) : undefined;
    if (identity) {
      p.nbaPlayerId = identity.nbaPlayerId;
      p.identityUrl = identity.identityUrl;
    }
  }
}
const dataset = RecordedDatasetSchema.parse({
  kind: 'genuine-recorded-wikipedia-data',
  season,
  createdAt: new Date().toISOString(),
  sourcePolicy: 'CC BY-SA4.0 adapted team tables; exact external-ID facts CC0',
  identityRequests,
  articleIdentities: articles.length,
  mappedArticleIdentities,
  snapshots,
});
if (args.includes('--write')) {
  const pending = join(dirname(target), '.recorded-snapshot.pending.json');
  await writeFile(pending, JSON.stringify(dataset, null, 2) + '\n', { flag: 'wx' });
  await rename(pending, target);
}
console.log(
  JSON.stringify(
    {
      status: 'PASS',
      written: args.includes('--write'),
      teams: dataset.snapshots.length,
      regularRows: dataset.snapshots.reduce(
        (s, t) => s + t.statistics['regular-season'].length,
        0,
      ),
      unknownScopeRows: dataset.snapshots.reduce(
        (s, t) => s + t.statistics['source-unspecified'].length,
        0,
      ),
      articleIdentities: articles.length,
      mappedArticleIdentities,
      identityRequests,
      createdAt: dataset.createdAt,
    },
    null,
    2,
  ),
);
