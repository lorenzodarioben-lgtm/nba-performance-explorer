import {
  MAX_STORIES,
  MAX_STORIES_JSON_CHARS,
  MAX_STORY_SECTIONS,
  StoriesFileSchema,
  StorySchema,
  type StoriesFile,
  type Story,
  type StorySection,
} from '@nba-performance-explorer/contracts';
import type { ResearchStorage } from '../my-nba/local-research';

/** A separate key: stories never rewrite the saved-research file, and vice versa. */
export const STORIES_STORAGE_KEY = 'nba-explorer.stories.v1';
/** A share link carries one small story in the URL fragment; larger ones export as JSON. */
export const MAX_SHARE_CHARS = 6000;

const empty = (): StoriesFile => ({ version: 1, stories: [] });

/** JSON.parse that refuses prototype keys, within a size bound. */
function safeJson(text: string, max: number): unknown {
  if (text.length > max)
    throw new Error(`Larger than ${max.toLocaleString()} characters.`);
  return JSON.parse(text, (key: string, value: unknown) => {
    if (['__proto__', 'constructor', 'prototype'].includes(key))
      throw new Error('Unsafe object key.');
    return value;
  });
}

export function parseStoriesJson(text: string): StoriesFile {
  try {
    return StoriesFileSchema.parse(safeJson(text, MAX_STORIES_JSON_CHARS));
  } catch {
    throw new Error(
      'Invalid stories file: check the version, limits (25 stories, 30 sections each) and internal links.',
    );
  }
}

export function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `s${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Imported stories join the reader's own; a story whose ID already exists is kept as the
 * reader's version and the import gets a fresh ID, so nothing is overwritten.
 */
export function mergeStories(
  existing: StoriesFile,
  imported: StoriesFile,
): StoriesFile {
  const taken = new Set(existing.stories.map((s) => s.id));
  const added = imported.stories.map((s) =>
    taken.has(s.id)
      ? { ...s, id: newId(), title: `${s.title} (imported)`.slice(0, 120) }
      : s,
  );
  return StoriesFileSchema.parse({
    version: 1,
    stories: [...existing.stories, ...added],
  });
}

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function fromBase64Url(text: string) {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new Error('Not a story link.');
  const binary = atob(text.replaceAll('-', '+').replaceAll('_', '/'));
  return new TextDecoder('utf-8', { fatal: true }).decode(
    Uint8Array.from(binary, (c) => c.charCodeAt(0)),
  );
}

/** The fragment for a share link, or null when the story is too large for a URL. */
export function encodeShare(story: Story): string | null {
  const encoded = toBase64Url(JSON.stringify(StorySchema.parse(story)));
  return encoded.length <= MAX_SHARE_CHARS ? encoded : null;
}
export function decodeShare(fragment: string): Story {
  if (fragment.length > MAX_SHARE_CHARS)
    throw new Error('This story link is too long.');
  try {
    return StorySchema.parse(safeJson(fromBase64Url(fragment), MAX_SHARE_CHARS * 2));
  } catch {
    throw new Error('This story link is damaged or not a story.');
  }
}

type Listener = () => void;

/** The reader's stories in browser storage, validated on every read and write. */
export class StoryRepository {
  private session = empty();
  private dirty = false;
  private snapshot: { data: StoriesFile; warning: string | null } | null = null;
  private readonly listeners = new Set<Listener>();
  constructor(private readonly storage: () => ResearchStorage | null) {}

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  /** Stable between changes, for useSyncExternalStore. */
  read = () => {
    this.snapshot ??= this.load();
    return this.snapshot;
  };
  private emit(next: { data: StoriesFile; warning: string | null }) {
    this.snapshot = next;
    for (const l of this.listeners) l();
    return next;
  }

  load(): { data: StoriesFile; warning: string | null } {
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
            'Storage is unavailable. Stories last for this session; export them.',
        };
      const raw = storage.getItem(STORIES_STORAGE_KEY);
      this.session = raw === null ? empty() : parseStoriesJson(raw);
      return { data: this.session, warning: null };
    } catch {
      return {
        data: this.session,
        warning:
          'Stored stories could not be read. They have not been overwritten; import a valid file to recover.',
      };
    }
  }

  save(next: StoriesFile) {
    const valid = StoriesFileSchema.parse(next);
    const serialized = JSON.stringify(valid);
    if (serialized.length > MAX_STORIES_JSON_CHARS)
      throw new Error(
        'Stories exceed 300,000 characters. Export and remove some first.',
      );
    this.session = valid;
    try {
      const storage = this.storage();
      if (!storage) throw new Error('Storage unavailable');
      storage.setItem(STORIES_STORAGE_KEY, serialized);
      this.dirty = false;
      return this.emit({ data: valid, warning: null });
    } catch {
      this.dirty = true;
      return this.emit({
        data: valid,
        warning: 'Session-only changes: storage is unavailable. Export before closing.',
      });
    }
  }

  private current() {
    return this.read().data;
  }
  get(id: string) {
    return this.current().stories.find((s) => s.id === id) ?? null;
  }
  create(title: string, sections: StorySection[] = []) {
    const now = new Date().toISOString();
    const story = StorySchema.parse({
      id: newId(),
      title,
      dek: '',
      createdAt: now,
      updatedAt: now,
      sections,
    });
    if (this.current().stories.length >= MAX_STORIES)
      throw new Error(`At most ${MAX_STORIES} stories; delete or export one first.`);
    this.save({ version: 1, stories: [story, ...this.current().stories] });
    return story;
  }
  update(id: string, change: (story: Story) => Story) {
    const stories = this.current().stories.map((s) =>
      s.id === id
        ? StorySchema.parse({ ...change(s), id, updatedAt: new Date().toISOString() })
        : s,
    );
    return this.save({ version: 1, stories });
  }
  duplicate(id: string) {
    const source = this.get(id);
    if (!source) throw new Error('Story not found.');
    const copy = this.create(
      `${source.title} (copy)`.slice(0, 120),
      source.sections.map((s) => ({ ...s, id: newId() })),
    );
    this.update(copy.id, (s) => ({ ...s, dek: source.dek }));
    return copy;
  }
  remove(id: string) {
    return this.save({
      version: 1,
      stories: this.current().stories.filter((s) => s.id !== id),
    });
  }
  importFile(file: StoriesFile) {
    return this.save(mergeStories(this.current(), file));
  }
  /** Re-reads storage (another tab, or a test resetting it). */
  refresh() {
    this.dirty = false;
    return this.emit(this.load());
  }
}

export const storyRepository = new StoryRepository(() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
});

export { MAX_STORY_SECTIONS };
