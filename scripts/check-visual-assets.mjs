// Visual-asset integrity, run by `npm run validate`:
// - every player photo, thumbnail and team mark the registries name exists, with the declared size;
// - every file under public/images/players and public/images/teams is referenced (no orphans);
// - every team-mark era names the team exactly as the league archive does for each covered season;
// - the social preview and icons exist with the sizes the page metadata declares, at the public URL;
// - no source file still points at a removed image.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'frontend', 'public');
const { PLAYER_IMAGE_DATA } =
  await import('../frontend/src/features/players/playerImageData.ts');
const { TEAM_LOGO_ERAS } = await import('../frontend/src/features/teams/teamLogos.ts');
const problems = [];
const fail = (m) => problems.push(m);

function size(file) {
  const b = readFileSync(file);
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (chunk === 'VP8L') {
      const v = b.readUInt32LE(21);
      return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)];
    }
    if (chunk === 'VP8 ')
      return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  }
  if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xc3)
        return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + len;
    }
  }
  throw new Error(`Cannot read the size of ${file}`);
}
const used = new Set();
function expectFile(url, w, h, what) {
  const file = join(pub, url);
  used.add(file);
  if (!existsSync(file)) return fail(`${what}: ${url} does not exist`);
  if (w === undefined) return;
  const [fw, fh] = size(file);
  if (fw !== w || fh !== h) fail(`${what}: ${url} is ${fw}x${fh}, declared ${w}x${h}`);
}
const srcSetUrls = (set) => set.split(',').map((part) => part.trim().split(/\s+/)[0]);

// Player photos.
for (const [id, image] of Object.entries(PLAYER_IMAGE_DATA)) {
  expectFile(image.src, image.width, image.height, `player ${id}`);
  for (const url of srcSetUrls(image.srcSet))
    expectFile(url, undefined, undefined, `player ${id}`);
  if (!image.srcSet.includes(image.src)) fail(`player ${id}: src missing from srcSet`);
  if (!image.thumb) fail(`player ${id}: no thumbnail`);
  else expectFile(image.thumb, 192, 192, `player ${id} thumb`);
  if (image.portrait) {
    expectFile(
      image.portrait.src,
      image.portrait.width,
      image.portrait.height,
      `player ${id} portrait`,
    );
    for (const url of srcSetUrls(image.portrait.srcSet))
      expectFile(url, undefined, undefined, `player ${id} portrait`);
  }
}

// Team marks, and their identities against the league archive.
const index = JSON.parse(
  readFileSync(join(root, 'backend/src/features/league/data/index.json'), 'utf8'),
);
const names = new Map();
for (const { season } of index.seasons) {
  const s = JSON.parse(
    gunzipSync(
      readFileSync(
        join(root, `backend/src/features/league/data/${season}.summary.json.gz`),
      ),
    ),
  );
  for (const t of s.teams) names.set(`${t.teamId}:${season}`, t.name);
}
const start = (season) => Number(season.slice(0, 4));
const norm = (n) => n.toLowerCase().replace(/^los angeles /, 'la ');
let checkedSeasons = 0;
for (const [id, eras] of Object.entries(TEAM_LOGO_ERAS)) {
  for (const era of eras) {
    expectFile(`/images/teams/${era.key}-64.webp`, 64, 64, `team ${id} ${era.from}`);
    expectFile(`/images/teams/${era.key}-256.webp`, 256, 256, `team ${id} ${era.from}`);
    for (const { season } of index.seasons) {
      if (start(season) < start(era.from) || (era.to && start(season) > start(era.to)))
        continue;
      const name = names.get(`${id}:${season}`);
      if (!name) {
        fail(
          `team ${id}: era ${era.from} covers ${season}, when the archive has no such team`,
        );
        continue;
      }
      checkedSeasons++;
      if (norm(name) !== norm(era.identity))
        fail(
          `team ${id} ${season}: archive names "${name}", mark is for "${era.identity}"`,
        );
    }
  }
}

// Before 1983-84 the franchise records (NBA.com's team-by-year table) are the authority.
const franchises = JSON.parse(
  gunzipSync(
    readFileSync(join(root, 'backend/src/features/league/data/franchises.json.gz')),
  ),
).franchises;
let franchiseSeasons = 0;
for (const [id, eras] of Object.entries(TEAM_LOGO_ERAS)) {
  const f = franchises.find((x) => String(x.teamId) === id);
  if (!f) {
    fail(`team ${id}: not in the franchise records`);
    continue;
  }
  for (const era of eras) {
    for (const y of f.seasons) {
      if (
        start(y.season) < start(era.from) ||
        (era.to && start(y.season) > start(era.to))
      )
        continue;
      franchiseSeasons++;
      if (norm(`${y.city} ${y.name}`) !== norm(era.identity))
        fail(
          `team ${id} ${y.season}: franchise records name "${y.city} ${y.name}", mark is for "${era.identity}"`,
        );
    }
  }
}

// No orphan files under the managed folders.
for (const folder of [
  'images/players/action',
  'images/players/portrait',
  'images/players/headshots',
  'images/players/thumbs',
  'images/teams',
]) {
  for (const f of readdirSync(join(pub, folder))) {
    const file = join(pub, folder, f);
    if (!used.has(file)) fail(`orphan file ${relative(root, file)}`);
  }
}

// Page metadata, social preview and icons.
const html = readFileSync(join(root, 'frontend/index.html'), 'utf8');
const meta = (attr, key) =>
  html.match(new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]+)"`))?.[1];
const site = meta('property', 'og:url');
const og = meta('property', 'og:image');
if (!site?.startsWith('https://')) fail('og:url is not an absolute https URL');
if (!og?.startsWith(`${site}/`))
  fail('og:image is not an absolute URL on the public site');
if (/localhost|127\.0\.0\.1/.test(html)) fail('index.html mentions a local host');
if (og) {
  expectFile(
    new URL(og).pathname,
    Number(meta('property', 'og:image:width')),
    Number(meta('property', 'og:image:height')),
    'og:image',
  );
  if (
    meta('property', 'og:image:width') !== '1200' ||
    meta('property', 'og:image:height') !== '630'
  )
    fail('og:image is not declared 1200x630');
}
if (meta('name', 'twitter:card') !== 'summary_large_image')
  fail('twitter:card is not summary_large_image');
if (meta('name', 'twitter:image') !== og) fail('twitter:image differs from og:image');
if (!meta('property', 'og:image:alt')) fail('og:image:alt is missing');
const touch = html.match(/<link rel="apple-touch-icon" href="([^"]+)"/)?.[1];
if (!touch) fail('apple-touch-icon link missing');
else expectFile(touch, 180, 180, 'apple-touch-icon');
const manifest = JSON.parse(readFileSync(join(pub, 'site.webmanifest'), 'utf8'));
for (const icon of manifest.icons) {
  const [w, h] = icon.sizes.split('x').map(Number);
  expectFile(icon.src, w, h, 'manifest icon');
}

// No source still points at a removed or unknown image.
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(join(dir, e.name))
      : /\.(tsx?|css)$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  );
}
for (const file of walk(join(root, 'frontend/src'))) {
  for (const m of readFileSync(file, 'utf8').matchAll(
    /['"(](\/images\/[^'")\s]+\.(?:webp|avif|png|jpg|svg))/g,
  )) {
    if (!existsSync(join(pub, m[1])))
      fail(`${relative(root, file)} points at missing ${m[1]}`);
  }
}

const players = Object.keys(PLAYER_IMAGE_DATA).length;
const marks = new Set(
  Object.values(TEAM_LOGO_ERAS)
    .flat()
    .map((e) => e.key),
).size;
if (problems.length) {
  console.error(
    `Visual asset check failed (${problems.length}):\n- ${problems.join('\n- ')}`,
  );
  process.exit(1);
}
console.log(
  `Visual asset check passed: ${players} players, ${marks} team marks, ${checkedSeasons} archive and ${franchiseSeasons} franchise-record team-seasons matched by name, ${used.size} files, metadata and icons.`,
);
