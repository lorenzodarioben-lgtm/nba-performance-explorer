import { describe, expect, it } from 'vitest';
import type { Story } from '@nba-performance-explorer/contracts';

import type { ResearchStorage } from '../my-nba/local-research';
import { RESEARCH_STORAGE_KEY } from '../my-nba/local-research';
import {
  decodeShare,
  encodeShare,
  MAX_SHARE_CHARS,
  mergeStories,
  parseStoriesJson,
  STORIES_STORAGE_KEY,
  StoryRepository,
} from './story-store';

function memoryStorage(seed: Record<string, string> = {}): ResearchStorage & {
  map: Map<string, string>;
} {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}
const story = (over: Partial<Story> = {}): Story => ({
  id: 'sabcdef0123456789',
  title: 'Jokić’s passing',
  dek: '',
  createdAt: '2026-10-15T10:00:00.000Z',
  updatedAt: '2026-10-15T10:00:00.000Z',
  sections: [
    {
      id: 'sec00000001',
      kind: 'text',
      heading: 'Start',
      body: 'Line one.\n\nLine two.',
    },
    {
      id: 'sec00000002',
      kind: 'analysis',
      title: 'Finals',
      path: '/games/series/r4-BOS-DAL',
      note: '',
    },
  ],
  ...over,
});

describe('story store', () => {
  it('creates, edits, reorders, duplicates and deletes, surviving a new repository', () => {
    const storage = memoryStorage({ [RESEARCH_STORAGE_KEY]: '{"keep":"me"}' });
    const repo = new StoryRepository(() => storage);
    const created = repo.create('Boston, 2024');
    repo.update(created.id, (s) => ({ ...s, sections: story().sections }));
    repo.update(created.id, (s) => ({ ...s, sections: [...s.sections].reverse() }));
    const reread = new StoryRepository(() => storage).read().data.stories[0]!;
    expect(reread.title).toBe('Boston, 2024');
    expect(reread.sections.map((s) => s.kind)).toEqual(['analysis', 'text']);
    const copy = repo.duplicate(created.id);
    expect(copy.title).toBe('Boston, 2024 (copy)');
    // A duplicate gets its own section IDs.
    expect(
      repo
        .get(copy.id)!
        .sections.some((s) => reread.sections.some((r) => r.id === s.id)),
    ).toBe(false);
    repo.remove(created.id);
    expect(repo.read().data.stories.map((s) => s.id)).toEqual([copy.id]);
    // Stories never touch the saved-research file.
    expect(storage.map.get(RESEARCH_STORAGE_KEY)).toBe('{"keep":"me"}');
  });

  it('refuses invalid edits without storing them', () => {
    const storage = memoryStorage();
    const repo = new StoryRepository(() => storage);
    const created = repo.create('Valid');
    const before = storage.map.get(STORIES_STORAGE_KEY);
    for (const bad of [
      (s: Story) => ({ ...s, title: '   ' }),
      (s: Story) => ({ ...s, title: 'x'.repeat(121) }),
      (s: Story) => ({
        ...s,
        sections: [
          {
            id: 'sec00000009',
            kind: 'analysis' as const,
            title: 'X',
            path: 'https://evil.test',
            note: '',
          },
        ],
      }),
      (s: Story) => ({
        ...s,
        sections: [
          { id: 'sec00000009', kind: 'text' as const, heading: 'a\u0007', body: '' },
        ],
      }),
    ])
      expect(() => repo.update(created.id, bad)).toThrow();
    expect(storage.map.get(STORIES_STORAGE_KEY)).toBe(before);
  });

  it('bounds and validates imports, and never overwrites an existing story', () => {
    const file = { version: 1 as const, stories: [story()] };
    expect(parseStoriesJson(JSON.stringify(file)).stories).toHaveLength(1);
    for (const bad of [
      'not json',
      JSON.stringify({ version: 2, stories: [] }),
      JSON.stringify({ version: 1, stories: [story()], extra: true }),
      '{"version":1,"stories":[],"__proto__":{"x":1}}',
      JSON.stringify({
        version: 1,
        stories: Array.from({ length: 26 }, (_, i) =>
          story({ id: `s${String(i).padStart(9, '0')}` }),
        ),
      }),
      JSON.stringify({
        version: 1,
        stories: [
          story({
            sections: Array.from({ length: 31 }, (_, i) => ({
              id: `sec${String(i).padStart(8, '0')}`,
              kind: 'text' as const,
              heading: '',
              body: '',
            })),
          }),
        ],
      }),
      ' '.repeat(300_001),
    ])
      expect(() => parseStoriesJson(bad), bad.slice(0, 40)).toThrow();
    const merged = mergeStories(file, file);
    expect(merged.stories).toHaveLength(2);
    expect(merged.stories[0]!.id).toBe(story().id);
    expect(merged.stories[1]!.id).not.toBe(story().id);
    expect(merged.stories[1]!.title).toBe('Jokić’s passing (imported)');
  });

  it('round-trips a share link (including accents) and rejects damaged or oversized ones', () => {
    const fragment = encodeShare(story())!;
    expect(fragment).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeShare(fragment)).toEqual(story());
    expect(() => decodeShare(fragment.slice(0, -6))).toThrow();
    expect(() => decodeShare('%%%')).toThrow();
    expect(() => decodeShare('a'.repeat(MAX_SHARE_CHARS + 1))).toThrow(/too long/);
    const long = story({
      sections: Array.from({ length: 4 }, (_, i) => ({
        id: `sec${String(i).padStart(8, '0')}`,
        kind: 'text' as const,
        heading: '',
        body: 'x'.repeat(4000),
      })),
    });
    expect(encodeShare(long)).toBeNull();
  });

  it('keeps working for the session when storage is unavailable or corrupt', () => {
    const repo = new StoryRepository(() => null);
    expect(repo.read().warning).toMatch(/unavailable/);
    const saved = repo.create('Session only');
    expect(repo.read().data.stories[0]!.id).toBe(saved.id);
    expect(repo.read().warning).toMatch(/Session-only/);
    const corrupt = memoryStorage({ [STORIES_STORAGE_KEY]: '{broken' });
    const reader = new StoryRepository(() => corrupt);
    expect(reader.read().warning).toMatch(/not been overwritten/);
    expect(corrupt.map.get(STORIES_STORAGE_KEY)).toBe('{broken');
  });
});
