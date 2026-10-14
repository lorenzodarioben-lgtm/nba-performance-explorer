import { copyFileSync, mkdirSync } from 'node:fs';
const source = new URL(
  '../features/shot-archive/shot-events.csv',
  new URL('../../src/scripts/', import.meta.url),
);
const destination = new URL(
  '../features/shot-archive/shot-events.csv',
  import.meta.url,
);
mkdirSync(new URL('../features/shot-archive/', import.meta.url), { recursive: true });
copyFileSync(source, destination);
