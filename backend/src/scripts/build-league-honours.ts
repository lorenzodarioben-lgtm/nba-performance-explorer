// Builds league/data/honours.json: the individual award winners for every archived season
// (1983-84 on), each confirmed by two independent sources, plus the Finals MVP teams used to
// check the champions the archive derives from its own Finals games.
//
// 1. Wikipedia's award articles (one parse request each, spaced, cached) give season, player
//    name and team. Only facts are kept, with the article revision for provenance.
// 2. Each name is resolved to an NBA.com person ID only when exactly one player of that name
//    is on that season's NBA.com rosters or archived box scores. Names are never guessed.
// 3. NBA.com's playerawards for that person must list the same award and season. Only winners
//    both sources agree on are written; every disagreement is written out as a note.
//
// Usage: tsx src/scripts/build-league-honours.ts [--write] [--cache <dir>] [--delay <ms>]
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LeagueArchive } from '../features/league/league-archive.js';
import { LeagueExtras } from '../features/league/league-extras.js';
import {
  expandedRows,
  isElement,
  parsePage,
  text,
  wikiLink,
  type HtmlElement,
} from '../features/wiki-archive/html-tables.js';
import {
  HONOUR_AWARDS,
  type HonourAwardId,
} from '../features/league/league-honours-data.js';

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const cacheDir = arg('--cache') ?? join(tmpdir(), 'nba-honours-cache');
const delay = Number(arg('--delay') ?? 1500);
mkdirSync(cacheDir, { recursive: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const WIKI_UA =
  'NBA-Performance-Explorer/0.1 (https://github.com/lorenzodarioben-lgtm/nba-performance-explorer; personal research build)';
const NBA_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  Referer: 'https://www.nba.com/',
  Origin: 'https://www.nba.com',
};
const requests: { source: string; url: string; retrievedAt: string; sha256: string }[] =
  [];

async function cached(
  key: string,
  url: URL,
  headers: Record<string, string>,
  spacing: number,
) {
  const file = join(cacheDir, `${key.replace(/\W+/g, '_')}.json`);
  if (existsSync(file))
    return JSON.parse(readFileSync(file, 'utf8')) as {
      retrievedAt: string;
      body: string;
    };
  await sleep(spacing);
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  const body = await res.text();
  if (!res.ok || !body.startsWith('{'))
    throw new Error(`${url.hostname} ${res.status}: ${body.slice(0, 80)}`);
  const entry = { retrievedAt: new Date().toISOString(), body };
  writeFileSync(file, JSON.stringify(entry));
  return entry;
}

const archive = new LeagueArchive();
const extras = new LeagueExtras();
const seasons = archive.seasons;
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.'’`-]/g, '')
    .replace(/\s+(jr|sr|ii|iii|iv)$/, '')
    .replace(/\s+/g, ' ')
    .trim();
/** Everyone NBA.com lists for a season, from rosters and box scores, by folded name. */
const people = new Map<string, Map<string, Set<number>>>();
function namesFor(season: string) {
  let m = people.get(season);
  if (m) return m;
  m = new Map();
  const add = (name: string, id: number) => {
    const k = fold(name);
    if (!m!.has(k)) m!.set(k, new Set());
    m!.get(k)!.add(id);
  };
  for (const p of archive.summary(season).players) add(p.name, p.playerId);
  for (const t of extras.rosters(season)?.teams ?? [])
    for (const p of t.players) add(p.name, p.playerId);
  people.set(season, m);
  return m;
}
const seasonOf = (cell: string, kind: 'season' | 'year') => {
  const s = cell.replace(/\[.*?\]/g, '').trim();
  const m = /^(\d{4})\s*[–-]\s*(\d{2}|\d{4})/.exec(s);
  if (m) return `${m[1]}-${String((Number(m[1]) + 1) % 100).padStart(2, '0')}`;
  const y = /^(\d{4})\b/.exec(s);
  if (y && kind === 'year')
    return `${Number(y[1]) - 1}-${String(Number(y[1]) % 100).padStart(2, '0')}`;
  return null;
};
const clean = (s: string) =>
  s
    .replace(/\[.*?\]/g, '')
    .replace(/[*^†‡§#+~¤]/g, '')
    .replace(/\(\d+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

interface WikiRow {
  award: HonourAwardId;
  season: string;
  name: string;
  team: string;
  /** The winner's Wikipedia article title, from the cell's link. */
  article: string | null;
}
const wikiSources: {
  award: HonourAwardId;
  title: string;
  revision: number;
  retrievedAt: string;
}[] = [];
const wikiRows: WikiRow[] = [];
for (const award of HONOUR_AWARDS) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'parse',
    page: award.wikipedia,
    prop: 'text|revid',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    maxlag: '5',
  }).toString();
  const entry = await cached(
    `wiki-${award.wikipedia}`,
    url,
    { 'User-Agent': WIKI_UA },
    6000,
  );
  const page = JSON.parse(entry.body) as {
    parse: { title: string; revid: number; text: string };
  };
  wikiSources.push({
    award: award.id,
    title: page.parse.title,
    revision: page.parse.revid,
    retrievedAt: entry.retrievedAt,
  });
  requests.push({
    source: 'wikipedia',
    url: `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(page.parse.title)}&oldid=${page.parse.revid}`,
    retrievedAt: entry.retrievedAt,
    sha256: createHash('sha256').update(entry.body).digest('hex'),
  });
  const tables = parsePage(page.parse.text).filter(
    (n): n is HtmlElement => isElement(n) && n.tagName === 'table',
  );
  const table = tables.find((t) => {
    const head = (expandedRows(t)[0] ?? []).map((c) => clean(text(c)));
    return /^(Season|Year)$/.test(head[0] ?? '') && head.some((h) => /^Player/.test(h));
  });
  if (!table) throw new Error(`No winners table on ${page.parse.title}`);
  const rows = expandedRows(table);
  const head = rows[0]!.map((c) => clean(text(c)));
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const [si, pi, ti] = [col(/^(Season|Year)$/), col(/^Player/), col(/^Team/)];
  if (si < 0 || pi < 0 || ti < 0)
    throw new Error(`Unexpected columns on ${page.parse.title}: ${head.join('|')}`);
  const seen = new Set<string>();
  for (const r of rows.slice(1)) {
    if (r.length <= Math.max(si, pi, ti)) continue;
    const season = seasonOf(text(r[si]!), head[si] === 'Year' ? 'year' : 'season');
    if (!season || !seasons.includes(season)) continue;
    const name = clean(text(r[pi]!));
    const team = clean(text(r[ti]!));
    // A rowspan repeats the same cell; a tie has two different player cells.
    const key = `${season}:${name}`;
    if (!name || seen.has(key)) continue;
    seen.add(key);
    const link = wikiLink(r[pi]!);
    const article = link
      ? decodeURIComponent(
          link.slice('https://en.wikipedia.org/wiki/'.length),
        ).replaceAll('_', ' ')
      : null;
    wikiRows.push({ award: award.id, season, name, team, article });
  }
}

const notes: string[] = [];
const resolved = new Map<WikiRow, number>();
const unmatched: WikiRow[] = [];
for (const row of wikiRows) {
  const names = namesFor(row.season);
  let ids = names.get(fold(row.name));
  // "J. R. Smith" and "JR Smith": compare once more with initials run together.
  if (!ids) {
    const tight = fold(row.name).replace(/ /g, '');
    const hits = [...names].filter(([k]) => k.replace(/ /g, '') === tight);
    if (hits.length === 1) ids = hits[0]![1];
  }
  if (ids?.size === 1) resolved.set(row, [...ids][0]!);
  else if (ids)
    notes.push(
      `${row.season} ${row.award}: Wikipedia names ${row.name}, who matches several NBA.com players that season; not listed.`,
    );
  else unmatched.push(row);
}
// A winner listed under a former name (a name change, a nickname) is identified through
// Wikidata's NBA.com player ID for the linked Wikipedia article, never by guessing a name.
// The ID must also be on that season's NBA.com rosters or box scores.
const articles = [
  ...new Set(unmatched.map((r) => r.article).filter((a): a is string => Boolean(a))),
];
const nbaIdOf = new Map<string, number>();
if (articles.length) {
  const props = new URL('https://en.wikipedia.org/w/api.php');
  props.search = new URLSearchParams({
    action: 'query',
    prop: 'pageprops',
    ppprop: 'wikibase_item',
    redirects: '1',
    format: 'json',
    formatversion: '2',
    titles: articles.join('|'),
  }).toString();
  const pp = await cached(
    `wiki-pageprops-${articles.join('|')}`,
    props,
    { 'User-Agent': WIKI_UA },
    6000,
  );
  requests.push({
    source: 'wikipedia',
    url: props.toString().slice(0, 300),
    retrievedAt: pp.retrievedAt,
    sha256: createHash('sha256').update(pp.body).digest('hex'),
  });
  const q = JSON.parse(pp.body) as {
    query: {
      redirects?: { from: string; to: string }[];
      normalized?: { from: string; to: string }[];
      pages: { title: string; pageprops?: { wikibase_item?: string } }[];
    };
  };
  const itemOf = new Map<string, string>();
  for (const page of q.query.pages)
    if (page.pageprops?.wikibase_item)
      itemOf.set(page.title, page.pageprops.wikibase_item);
  const follow = (t: string) => {
    for (const m of [...(q.query.normalized ?? []), ...(q.query.redirects ?? [])])
      if (m.from === t) t = m.to;
    return t;
  };
  const items = [
    ...new Set(
      articles.map((a) => itemOf.get(follow(a))).filter((x): x is string => Boolean(x)),
    ),
  ];
  const wd = new URL('https://www.wikidata.org/w/api.php');
  wd.search = new URLSearchParams({
    action: 'wbgetentities',
    ids: items.join('|'),
    props: 'claims',
    format: 'json',
  }).toString();
  const ent = await cached(
    `wikidata-${items.join('|')}`,
    wd,
    { 'User-Agent': WIKI_UA },
    6000,
  );
  requests.push({
    source: 'wikidata',
    url: wd.toString().slice(0, 300),
    retrievedAt: ent.retrievedAt,
    sha256: createHash('sha256').update(ent.body).digest('hex'),
  });
  const entities = (
    JSON.parse(ent.body) as {
      entities: Record<
        string,
        { claims?: Record<string, { mainsnak: { datavalue?: { value: unknown } } }[]> }
      >;
    }
  ).entities;
  for (const a of articles) {
    const item = itemOf.get(follow(a));
    const claims = item ? (entities[item]?.claims?.P3647 ?? []) : [];
    const values = claims
      .map((c) => Number(c.mainsnak.datavalue?.value))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (values.length === 1) nbaIdOf.set(a, values[0]!);
  }
}
for (const row of unmatched) {
  const id = row.article ? nbaIdOf.get(row.article) : undefined;
  const present =
    id !== undefined && [...namesFor(row.season).values()].some((ids) => ids.has(id));
  if (id === undefined || !present) {
    notes.push(
      `${row.season} ${row.award}: Wikipedia names ${row.name}, who matches no NBA.com player that season by name or by Wikidata’s NBA.com ID; not listed.`,
    );
    continue;
  }
  resolved.set(row, id);
  notes.push(
    `${row.season} ${row.award}: Wikipedia lists ${row.name}; identified as NBA.com player ${id} through Wikidata’s NBA.com ID for “${row.article}”.`,
  );
}

type AwardRow = [number, string, string, string, string, unknown, string, ...unknown[]];
const nbaAwards = new Map<number, AwardRow[]>();
for (const id of new Set(resolved.values())) {
  const url = new URL(`https://stats.nba.com/stats/playerawards?PlayerID=${id}`);
  const entry = await cached(`nba-playerawards-${id}`, url, NBA_HEADERS, delay);
  requests.push({
    source: 'nba-stats',
    url: url.toString(),
    retrievedAt: entry.retrievedAt,
    sha256: createHash('sha256').update(entry.body).digest('hex'),
  });
  const set = (JSON.parse(entry.body) as { resultSets: { rowSet: AwardRow[] }[] })
    .resultSets[0]!;
  nbaAwards.set(id, set.rowSet);
}

const winners: {
  season: string;
  award: HonourAwardId;
  playerId: string;
  name: string;
  team: string;
}[] = [];
for (const [row, id] of resolved) {
  const award = HONOUR_AWARDS.find((a) => a.id === row.award)!;
  const match = (nbaAwards.get(id) ?? []).find(
    (r) => r[4] === award.nba && r[6] === row.season,
  );
  if (!match) {
    const none = !(nbaAwards.get(id) ?? []).length;
    notes.push(
      `${row.season} ${row.award}: Wikipedia names ${row.name}; NBA.com’s awards for player ${id} do not list it${none ? ' (NBA.com lists no awards at all for this player)' : ''}, so it is not listed.`,
    );
    continue;
  }
  winners.push({
    season: row.season,
    award: row.award,
    playerId: String(id),
    name: `${match[1]} ${match[2]}`.trim(),
    team: match[3],
  });
}
// NBA.com awards of the same kind for these players that Wikipedia does not list.
for (const [id, rows] of nbaAwards)
  for (const r of rows) {
    const award = HONOUR_AWARDS.find((a) => a.nba === r[4]);
    if (!award || !seasons.includes(r[6])) continue;
    if (
      !winners.some(
        (w) => w.award === award.id && w.season === r[6] && w.playerId === String(id),
      )
    )
      notes.push(
        `${r[6]} ${award.id}: NBA.com lists ${r[1]} ${r[2]}; Wikipedia does not, so it is not listed.`,
      );
  }
// Every award must have a winner in every season it was given within the archive.
for (const award of HONOUR_AWARDS)
  for (const season of seasons) {
    if (season < award.from) continue;
    if (!winners.some((w) => w.award === award.id && w.season === season))
      notes.push(`${season} ${award.id}: no winner confirmed by both sources.`);
  }
winners.sort(
  (a, b) => a.season.localeCompare(b.season) || a.award.localeCompare(b.award),
);

const out = {
  kind: 'nba-honours',
  version: 1,
  builtAt: new Date().toISOString(),
  sources: wikiSources,
  requests,
  winners,
  /** Finals MVP team names as Wikipedia gives them, to check the derived champions. */
  finalsMvpTeams: wikiRows
    .filter((r) => r.award === 'finals-mvp')
    .map((r) => ({ season: r.season, team: r.team })),
  notes,
};
console.log(
  `wikipedia rows ${wikiRows.length}, resolved ${resolved.size}, confirmed ${winners.length}, notes ${notes.length}`,
);
for (const n of notes) console.log('  ' + n);
if (args.includes('--write')) {
  const file = new URL('../features/league/data/honours.json', import.meta.url);
  writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  console.log('wrote', file.pathname);
}
