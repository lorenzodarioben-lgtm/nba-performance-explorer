import { describe, expect, it } from 'vitest';
import {
  type ResearchBookmark,
  InternalResearchPathSchema,
} from '@nba-performance-explorer/contracts';

import {
  mergeResearch,
  parseResearchJson,
  RESEARCH_STORAGE_KEY,
  ResearchRepository,
  type ResearchStorage,
} from './local-research';

const item: ResearchBookmark = {
  kind: 'player',
  label: 'Curry',
  path: '/players/201939',
  createdAt: '2026-10-13T16:00:00.000Z',
};
function memoryStorage(): ResearchStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

describe('local research integrity', () => {
  it('survives a new repository instance and exports/imports versioned JSON', () => {
    const storage = memoryStorage();
    const first = new ResearchRepository(() => storage);
    first.add(item);
    const reloaded = new ResearchRepository(() => storage).load();
    expect(reloaded.warning).toBeNull();
    expect(parseResearchJson(JSON.stringify(reloaded.data)).bookmarks).toEqual([item]);
  });
  it('merges valid imports without replacing existing labels or duplicates', () => {
    const data = mergeResearch(
      { version: 1, bookmarks: [item] },
      {
        version: 1,
        bookmarks: [
          { ...item, label: 'Imported replacement' },
          { ...item, path: '/players/2544' },
        ],
      },
    );
    expect(data.bookmarks).toHaveLength(2);
    expect(data.bookmarks[0]?.label).toBe('Curry');
  });
  it('keeps session data when storage is disabled or full', () => {
    const repository = new ResearchRepository(() => null);
    expect(repository.add(item).warning).toContain('Session-only');
    expect(repository.load().data.bookmarks).toEqual([item]);
    const full = new ResearchRepository(() => ({
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
    }));
    expect(full.add(item).warning).toContain('Session-only');
    expect(full.load().data.bookmarks).toEqual([item]);
  });
  it('does not overwrite corrupt stored JSON on load', () => {
    const storage = memoryStorage();
    storage.setItem(RESEARCH_STORAGE_KEY, '{invalid');
    const data = new ResearchRepository(() => storage).load();
    expect(data.data.bookmarks).toEqual([]);
    expect(data.warning).toContain('not been overwritten');
    expect(storage.getItem(RESEARCH_STORAGE_KEY)).toBe('{invalid');
  });
  it('bounds JSON size, rejects unsupported versions and unknown keys', () => {
    expect(() => parseResearchJson(' '.repeat(100_001))).toThrow('exceeds');
    expect(() => parseResearchJson('{"version":2,"bookmarks":[]}')).toThrow('Invalid');
    expect(() =>
      parseResearchJson('{"version":1,"bookmarks":[],"__proto__":{}}'),
    ).toThrow('Invalid');
    expect(() =>
      parseResearchJson(JSON.stringify({ version: 1, bookmarks: [item, item] })),
    ).toThrow('Invalid');
  });
  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/%2e%2e/explore',
    '/players/espn:123',
    '/players/1#javascript',
    '/unimplemented',
    '/games/123',
    '/lab/compare\n',
  ])('rejects unsafe or unavailable path %s', (path) => {
    expect(InternalResearchPathSchema.safeParse(path).success).toBe(false);
  });
  it('enforces the 100-bookmark limit atomically', () => {
    const repository = new ResearchRepository(() => memoryStorage());
    const full = Array.from({ length: 100 }, (_, i) => ({
      ...item,
      path: `/players/${i + 1}`,
    }));
    repository.save({ version: 1, bookmarks: full });
    expect(() =>
      mergeResearch({ version: 1, bookmarks: full }, { version: 1, bookmarks: [item] }),
    ).toThrow();
  });
  it('removes only the research key when cleared', () => {
    const storage = memoryStorage();
    storage.setItem('other-app', 'keep');
    const repository = new ResearchRepository(() => storage);
    repository.add(item);
    repository.clear();
    expect(storage.getItem(RESEARCH_STORAGE_KEY)).toBeNull();
    expect(storage.getItem('other-app')).toBe('keep');
  });
});
