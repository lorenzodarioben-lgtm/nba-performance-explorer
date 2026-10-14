import { copyFileSync, mkdirSync } from 'node:fs';
// TypeScript reformats emitted JSON; copy reviewed bytes after compilation to
// retain source integrity and compact deployment size. Paths are fixed assets.
for (const path of [
  'shot-archive/shot-events.csv',
  'lineup-study/lineup-study-snapshot.json',
]) {
  const source = new URL(
    `../features/${path}`,
    new URL('../../src/scripts/', import.meta.url),
  );
  const destination = new URL(`../features/${path}`, import.meta.url);
  mkdirSync(new URL('.', destination), { recursive: true });
  copyFileSync(source, destination);
}
