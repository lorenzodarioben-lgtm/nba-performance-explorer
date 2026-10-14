#!/usr/bin/env node
// Guards against modules that resolve differently on case-insensitive filesystems (Windows,
// default macOS) than on case-sensitive Linux, where CI runs.
//
// The defect this prevents: `charts/Court.tsx` (a component) sat beside `charts/court.ts`
// (geometry). Vite tries `.ts` before `.tsx`, so on Windows `import … from './Court'` matched
// `court.ts` first and the app failed at startup; on Linux every check passed.
//
// Two checks, no dependencies:
//   1. Names: no two entries in one folder may differ only by case, and no two modules (or a
//      module and a folder) may share an import stem ignoring case (`Court.tsx` + `court.ts`).
//   2. Imports: every relative import is resolved twice, case-sensitively and with
//      case-insensitive lookups, in both Vite's and TypeScript's extension order. Each must
//      land on the same file, and that file must exist with the exact case written.
//
// Usage: node scripts/check-module-case.mjs [--self-test]

import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOTS = ['frontend', 'backend', 'packages', 'e2e', 'scripts'];
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.git',
  'test-results',
  '.artifacts',
]);
const SOURCE_EXT = /\.(?:[cm]?[jt]sx?|css)$/;
// Extensions a bare specifier can resolve to, longest first so `.d.ts` wins over `.ts`.
const MODULE_EXT = [
  '.d.ts',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.json',
];
const ORDERS = {
  vite: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  typescript: ['.ts', '.tsx', '.d.ts', '.mts', '.cts', '.js', '.jsx', '.json'],
};
// TypeScript maps an import written with a JavaScript extension to its source file.
const JS_TO_TS = {
  '.js': ['.ts', '.tsx'],
  '.jsx': ['.tsx'],
  '.mjs': ['.mts'],
  '.cjs': ['.cts'],
};
const SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*|\bvi\.mock\s*\(\s*|@import\s+(?:url\()?)['"](\.{1,2}\/[^'"]*)['"]/g;

function moduleStem(name) {
  const ext = MODULE_EXT.find((e) => name.endsWith(e));
  return ext ? name.slice(0, -ext.length) : null;
}

/** A directory listing cache that answers lookups case-sensitively or case-insensitively. */
function createFs() {
  const cache = new Map();
  const list = (dir) => {
    if (!cache.has(dir)) {
      try {
        cache.set(dir, readdirSync(dir, { withFileTypes: true }));
      } catch {
        cache.set(dir, []);
      }
    }
    return cache.get(dir);
  };
  // Walks the path one segment at a time, as the filesystem would. Returns the real path or null.
  const lookup = (absolute, insensitive, wantFile) => {
    const { root } = path.parse(absolute);
    let current = root;
    const parts = absolute.slice(root.length).split(path.sep).filter(Boolean);
    for (const [index, part] of parts.entries()) {
      if (part === '.' || part === '..') {
        current = path.join(current, part);
        continue;
      }
      const last = index === parts.length - 1;
      const entry = list(current).find((e) =>
        insensitive ? e.name.toLowerCase() === part.toLowerCase() : e.name === part,
      );
      if (
        !entry ||
        (last && wantFile && !entry.isFile()) ||
        (!last && !entry.isDirectory())
      )
        return null;
      current = path.join(current, entry.name);
    }
    return current;
  };
  return { list, lookup };
}

function candidates(base, order) {
  const ext = path.extname(base);
  const out = [];
  if (ext) {
    out.push(base);
    for (const ts of JS_TO_TS[ext] ?? []) out.push(base.slice(0, -ext.length) + ts);
  }
  for (const e of order) out.push(base + e);
  for (const e of order) out.push(path.join(base, `index${e}`));
  return out;
}

function resolve(fs, fromFile, specifier, order, insensitive) {
  const base = path.resolve(path.dirname(fromFile), specifier.replace(/[?#].*$/, ''));
  for (const candidate of candidates(base, order)) {
    const hit = fs.lookup(candidate, insensitive, true);
    if (hit) return hit;
  }
  return null;
}

function walk(fs, dir, visit) {
  for (const entry of fs.list(dir)) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(fs, path.join(dir, entry.name), visit);
    } else if (entry.isFile()) visit(path.join(dir, entry.name));
  }
}

/** Checks the source trees under `repoRoot`; returns the problems found and what was scanned. */
export function checkModuleCase(repoRoot, roots = ROOTS) {
  const fs = createFs();
  const problems = [];
  const rel = (p) => path.relative(repoRoot, p).split(path.sep).join('/');
  const dirs = [];
  const files = [];
  for (const root of roots) {
    const start = path.join(repoRoot, root);
    if (!fs.list(start).length) continue;
    dirs.push(start);
    const collectDirs = (dir) => {
      for (const entry of fs.list(dir)) {
        if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
          dirs.push(path.join(dir, entry.name));
          collectDirs(path.join(dir, entry.name));
        }
      }
    };
    collectDirs(start);
    walk(fs, start, (file) => files.push(file));
  }

  // 1. Names that collide once case is ignored.
  for (const dir of dirs) {
    const byName = new Map();
    const byStem = new Map();
    for (const entry of fs.list(dir)) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const key = entry.name.toLowerCase();
      byName.set(key, [...(byName.get(key) ?? []), entry.name]);
      const stem = entry.isDirectory() ? entry.name : moduleStem(entry.name);
      if (stem === null) continue;
      byStem.set(stem.toLowerCase(), [
        ...(byStem.get(stem.toLowerCase()) ?? []),
        { stem, name: entry.name },
      ]);
    }
    for (const names of byName.values())
      if (names.length > 1)
        problems.push(
          `${rel(dir)}/: ${names.join(', ')} differ only by case and overwrite each other on Windows/macOS checkouts`,
        );
    for (const group of byStem.values())
      if (new Set(group.map((g) => g.stem)).size > 1)
        problems.push(
          `${rel(dir)}/: ${group.map((g) => g.name).join(', ')} share an import stem ignoring case; an extensionless import can resolve to the wrong one on Windows/macOS`,
        );
  }

  // 2. Every relative import must resolve to the same, exactly-cased file everywhere.
  let imports = 0;
  const sources = files.filter((f) => SOURCE_EXT.test(f));
  for (const file of sources) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(SPECIFIER)) {
      const specifier = match[1];
      imports++;
      for (const [orderName, order] of Object.entries(ORDERS)) {
        const exact = resolve(fs, file, specifier, order, false);
        const folded = resolve(fs, file, specifier, order, true);
        if (exact && folded && exact !== folded) {
          problems.push(
            `${rel(file)}: '${specifier}' resolves to ${rel(exact)} on Linux but to ${rel(folded)} on case-insensitive filesystems (${orderName} order)`,
          );
        } else if (!exact && folded) {
          problems.push(
            `${rel(file)}: '${specifier}' only resolves on case-insensitive filesystems (to ${rel(folded)}); fix its case`,
          );
        }
      }
    }
  }
  return {
    problems: [...new Set(problems)],
    files: sources.length,
    imports,
    dirs: dirs.length,
  };
}

function selfTest() {
  const root = mkdtempSync(path.join(tmpdir(), 'module-case-'));
  const put = (file, text = 'export {};\n') => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), text);
  };
  const expect = (label, roots, predicate) => {
    const { problems } = checkModuleCase(root, roots);
    if (!predicate(problems)) {
      console.error(
        `self-test failed: ${label}\n  ${problems.join('\n  ') || '(no problems reported)'}`,
      );
      process.exitCode = 1;
    } else console.log(`self-test ok: ${label}`);
  };
  try {
    // The original defect, verbatim in shape.
    put('broken/src/charts/Court.tsx', 'export function Court() {}\n');
    put('broken/src/charts/court.ts', 'export const COURT = {};\n');
    put('broken/src/features/Home.tsx', "import { Court } from '../charts/Court';\n");
    expect('Court.tsx beside court.ts is reported', ['broken'], (p) =>
      p.some(
        (m) =>
          m.includes('Court.tsx') &&
          m.includes('court.ts') &&
          m.includes('import stem'),
      ),
    );
    expect(
      'the import of ./Court is reported as resolving to court.ts',
      ['broken'],
      (p) => p.some((m) => m.includes("'../charts/Court'") && m.includes('court.ts')),
    );
    // The fix: an unambiguous component module beside the geometry module.
    put(
      'fixed/src/charts/BasketballCourt.tsx',
      'export function BasketballCourt() {}\n',
    );
    put('fixed/src/charts/court.ts', 'export const COURT = {};\n');
    put(
      'fixed/src/features/Home.tsx',
      "import { BasketballCourt } from '../charts/BasketballCourt';\nimport { COURT } from '../charts/court';\n",
    );
    expect('the renamed layout passes', ['fixed'], (p) => p.length === 0);
    // A specifier whose case only matches on Windows/macOS.
    put('miscased/src/scale.ts');
    put('miscased/src/use.ts', "import './Scale';\n");
    expect('a mis-cased specifier is reported', ['miscased'], (p) =>
      p.some((m) => m.includes("'./Scale'") && m.includes('only resolves')),
    );
    // Folders count too: `./court` could mean court/index.ts or Court.tsx.
    put('dirclash/src/Court.tsx');
    put('dirclash/src/court/index.ts');
    expect('a module beside a same-named folder is reported', ['dirclash'], (p) =>
      p.some((m) => m.includes('Court.tsx') && m.includes('court')),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.includes('--self-test')) {
    selfTest();
  } else {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const { problems, files, imports, dirs } = checkModuleCase(repoRoot);
    const scanned = `${dirs} folders, ${files} source files, ${imports} relative imports`;
    if (problems.length) {
      console.error(
        `Module case check failed (${problems.length}; scanned ${scanned}):\n  ${problems.join('\n  ')}`,
      );
      process.exitCode = 1;
    } else {
      console.log(
        `Module case check passed (scanned ${scanned}): no case-only name collisions, and every relative import resolves to the same file on case-sensitive and case-insensitive filesystems.`,
      );
    }
  }
}
