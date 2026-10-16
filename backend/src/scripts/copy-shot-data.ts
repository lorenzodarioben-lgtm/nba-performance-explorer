import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
// TypeScript reformats emitted JSON; copy reviewed bytes after compilation to
// retain source integrity and compact deployment size. Paths are fixed assets.
const sourceRoot = new URL(
  '../features/',
  new URL('../../src/scripts/', import.meta.url),
);
const files = [
  'shot-archive/shot-events.csv',
  'shot-archive/league-zone-averages.json',
  'lineup-study/lineup-study-snapshot.json',
  // The league archive: its index pins every file's digest, so copy the bytes unchanged.
  ...readdirSync(new URL('league/data/', sourceRoot))
    .filter((name) =>
      /^((extras-)?index\.json|franchises\.json\.gz|\d{4}-\d{2}\.(summary|games|rosters)\.json\.gz)$/.test(
        name,
      ),
    )
    .map((name) => `league/data/${name}`),
];
for (const path of files) {
  const source = new URL(path, sourceRoot);
  const destination = new URL(`../features/${path}`, import.meta.url);
  mkdirSync(new URL('.', destination), { recursive: true });
  copyFileSync(source, destination);
}
