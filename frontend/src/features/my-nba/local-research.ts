import {
  LocalResearchSchema,
  MAX_RESEARCH_JSON_CHARS,
  ResearchBookmarkSchema,
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
  const seen = new Set(existing.bookmarks.map((item) => `${item.kind}:${item.path}`));
  const added = imported.bookmarks.filter(
    (item) => !seen.has(`${item.kind}:${item.path}`),
  );
  return LocalResearchSchema.parse({
    version: 1,
    bookmarks: [...existing.bookmarks, ...added],
  });
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
