// Opt-in source audit for a candidate recorded season. Never run by startup or CI.
// Reads each team's season page once (serial, cached, no retries) and reports whether its
// regular-season game log is complete and self-consistent when rows are selected only by a
// well-formed regular-season NBA game ID: 82 rows, 82 unique IDs, game numbers 1-82 in order,
// running W-L matching every row, and no malformed recap links. Nothing is written.
//
// Usage (repository root): npx tsx backend/src/scripts/audit-recorded-season.ts --season 2022-23
import { staticTeamDirectoryProvider } from '../features/teams/team-directory-provider.js';
import { WikiArchiveClient } from '../features/wiki-archive/wiki-client.js';
import {
  attribute,
  directRows,
  isElement,
  parsePage,
  text,
  walk,
} from '../features/wiki-archive/html-tables.js';
import {
  RECORDED_SEASONS,
  seasonFacts,
  type RecordedSeasonId,
} from '../features/wiki-archive/seasons.js';
const flag = process.argv.indexOf('--season');
const season = RECORDED_SEASONS.find((s) => s === process.argv[flag + 1]) as
  | RecordedSeasonId
  | undefined;
if (flag < 0 || !season)
  throw new Error(`Usage: --season <${RECORDED_SEASONS.join('|')}>`);
const { label, regularIdPrefix } = seasonFacts(season);
const teams = await staticTeamDirectoryProvider.listTeams();
const client = new WikiArchiveClient();
const pattern = new RegExp(
  String.raw`^https://www\.nba\.com/game/(?:[a-z0-9-]*-)?(${regularIdPrefix}\d{5})(?:/box-score)?$`,
);
let clean = 0;
const allIds = new Map<string, number>();
for (const team of teams) {
  const page = await client.getPage(
    `${label} ${team.name} season` as `2023–24 ${string} season`,
  );
  const rows: { n: number; id: string; rec: string; res: string }[] = [];
  let malformed = 0;
  for (const node of parsePage(page.html)) {
    if (!isElement(node) || node.tagName !== 'table') continue;
    const table = directRows(node);
    if (!table[0]?.map(text).join('|').startsWith('Game|Date|Team|Score')) continue;
    for (const c of table.slice(1)) {
      if (!c[0] || !/^\d+$/.test(text(c[0])) || c.length !== 9) continue;
      const hrefs = walk(c[3]!)
        .filter((n) => isElement(n) && n.tagName === 'a')
        .map((n) => attribute(n, 'href') ?? '');
      const id = hrefs.map((h) => pattern.exec(h)?.[1]).find(Boolean);
      if (!id) {
        if (
          hrefs.some((h) => h.includes('nba.com/game/') && !/\/00[1245]\d{7}/.test(h))
        )
          malformed++;
        continue;
      }
      const score = /^([WL]) (\d+)[–-](\d+)/.exec(text(c[3]!));
      rows.push({
        n: Number(text(c[0])),
        id,
        rec: text(c[8]!),
        res: score?.[1] ?? '?',
      });
    }
  }
  const ids = new Set(rows.map((r) => r.id));
  for (const id of ids) allIds.set(id, (allIds.get(id) ?? 0) + 1);
  let w = 0,
    l = 0,
    recordOk = true;
  const ordered = [...rows].sort((a, b) => a.n - b.n);
  ordered.forEach((r, i) => {
    if (r.n !== i + 1) recordOk = false;
    if (r.res === 'W') w++;
    else l++;
    if (r.rec !== `${w}–${l}`) recordOk = false;
  });
  const ok = rows.length === 82 && ids.size === 82 && recordOk && malformed === 0;
  if (ok) clean++;
  console.log(
    ok ? 'CLEAN' : 'ISSUE',
    team.abbreviation,
    'rows',
    rows.length,
    'unique',
    ids.size,
    'records',
    recordOk ? 'ok' : 'mismatch',
    'malformed',
    malformed,
  );
}
const paired = [...allIds.values()].filter((v) => v === 2).length;
console.log(
  JSON.stringify({
    season,
    cleanTeams: clean,
    idsListedByBothTeams: paired,
    distinctIds: allIds.size,
  }),
);
