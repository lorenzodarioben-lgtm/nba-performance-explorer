import {
  LocalResearchSchema,
  MAX_RESEARCH_JSON_CHARS,
  MAX_TAGS_PER_BOOKMARK,
  ResearchBookmarkSchema,
  ResearchTagSchema,
  type LocalResearch,
  type ResearchBookmark,
} from '@nba-performance-explorer/contracts';

export const RESEARCH_STORAGE_KEY = 'nba-explorer.research.v1';
export interface ResearchStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
const empty = (): LocalResearch => ({ version: 1, bookmarks: [] });

export function parseResearchJson(text: string): LocalResearch {
  if (text.length > MAX_RESEARCH_JSON_CHARS)
    throw new Error('Research JSON exceeds 100,000 characters.');
  try {
    const parsed: unknown = JSON.parse(text, (key: string, value: unknown) => {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) {
        throw new Error('Unsafe object key.');
      }
      return value;
    });
    return LocalResearchSchema.parse(parsed);
  } catch {
    throw new Error(
      'Invalid research JSON: check version, bookmark limits and internal links.',
    );
  }
}

export function mergeResearch(
  existing: LocalResearch,
  imported: LocalResearch,
): LocalResearch {
  const key = (item: ResearchBookmark) => `${item.kind}:${item.path}`;
  const incoming = new Map(imported.bookmarks.map((item) => [key(item), item]));
  // An item already saved keeps its own name and note; it only gains the imported
  // collections it lacks, up to the per-item limit.
  const kept = existing.bookmarks.map((item) => {
    const extra = incoming.get(key(item))?.tags ?? [];
    const tags = [...new Set([...(item.tags ?? []), ...extra])].slice(
      0,
      MAX_TAGS_PER_BOOKMARK,
    );
    return tags.length ? { ...item, tags } : item;
  });
  const seen = new Set(existing.bookmarks.map(key));
  const added = imported.bookmarks.filter((item) => !seen.has(key(item)));
  return LocalResearchSchema.parse({
    version: 1,
    bookmarks: [...kept, ...added],
  });
}

/**
 * Reads a comma-separated list of collection names as typed by the reader: trimmed, folded to
 * lower case and de-duplicated, every name checked against the contract.
 */
export function parseTags(
  text: string,
): { tags: string[]; error: null } | { tags: null; error: string } {
  const names = [
    ...new Set(
      text
        .split(',')
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (names.length > MAX_TAGS_PER_BOOKMARK)
    return {
      tags: null,
      error: `At most ${MAX_TAGS_PER_BOOKMARK} collections per item.`,
    };
  for (const name of names)
    if (!ResearchTagSchema.safeParse(name).success)
      return {
        tags: null,
        error: `“${name.slice(0, 30)}” is not a valid collection name: up to 24 letters, digits, spaces, & ' or -.`,
      };
  return { tags: names, error: null };
}

export class ResearchRepository {
  private session = empty();
  private dirty = false;
  constructor(private readonly storage: () => ResearchStorage | null) {}

  load(): { data: LocalResearch; warning: string | null } {
    if (this.dirty)
      return {
        data: this.session,
        warning: 'Session-only changes: storage is unavailable. Export before closing.',
      };
    try {
      const storage = this.storage();
      if (!storage)
        return {
          data: this.session,
          warning:
            'Storage is unavailable. Research is kept in this session; export before closing.',
        };
      const raw = storage.getItem(RESEARCH_STORAGE_KEY);
      this.session = raw === null ? empty() : parseResearchJson(raw);
      return { data: this.session, warning: null };
    } catch {
      return {
        data: this.session,
        warning:
          'Stored research could not be read. It has not been overwritten. Export session data or import valid JSON to recover.',
      };
    }
  }

  save(data: LocalResearch): { data: LocalResearch; warning: string | null } {
    const valid = LocalResearchSchema.parse(data);
    const serialized = JSON.stringify(valid);
    if (serialized.length > MAX_RESEARCH_JSON_CHARS)
      throw new Error('Research JSON exceeds 100,000 characters.');
    this.session = valid;
    try {
      const storage = this.storage();
      if (!storage) throw new Error('Storage unavailable');
      storage.setItem(RESEARCH_STORAGE_KEY, serialized);
      this.dirty = false;
      return { data: valid, warning: null };
    } catch {
      this.dirty = true;
      return {
        data: valid,
        warning: 'Session-only changes: storage is unavailable. Export before closing.',
      };
    }
  }

  add(bookmark: ResearchBookmark) {
    const item = ResearchBookmarkSchema.parse(bookmark);
    return this.save(
      mergeResearch(this.load().data, { version: 1, bookmarks: [item] }),
    );
  }

  clear() {
    try {
      const storage = this.storage();
      if (!storage) throw new Error('Storage unavailable');
      storage.removeItem(RESEARCH_STORAGE_KEY);
      this.session = empty();
      this.dirty = false;
      return { data: this.session, warning: null };
    } catch {
      this.session = empty();
      this.dirty = true;
      return {
        data: this.session,
        warning: 'Cleared this session only; stored data could not be removed.',
      };
    }
  }
}

export const researchRepository = new ResearchRepository(() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
});
