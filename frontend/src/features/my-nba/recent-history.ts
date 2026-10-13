import { z } from 'zod';
import { InternalResearchPathSchema } from '@nba-performance-explorer/contracts';
import type { ResearchStorage } from './local-research';
export const RECENT_STORAGE_KEY = 'nba-explorer.recent.v1';
const VisitSchema = z
  .object({
    path: InternalResearchPathSchema,
    label: z.string().trim().min(1).max(100),
    visitedAt: z.iso.datetime(),
  })
  .strict();
const RecentSchema = z
  .object({
    version: z.literal(1),
    enabled: z.boolean(),
    visits: z
      .array(VisitSchema)
      .max(20)
      .refine((v) => new Set(v.map((i) => i.path)).size === v.length),
  })
  .strict();
type RecentPreferences = z.infer<typeof RecentSchema>;
const empty = (): RecentPreferences => ({ version: 1, enabled: false, visits: [] });
export class RecentHistoryRepository {
  private session = empty();
  private dirty = false;
  constructor(private readonly storage: () => ResearchStorage | null) {}
  load() {
    if (this.dirty)
      return {
        data: this.session,
        warning: 'Recent history is session-only; device storage is unavailable.',
      };
    try {
      const store = this.storage();
      if (!store)
        return {
          data: this.session,
          warning: 'Recent history storage is unavailable.',
        };
      const raw = store.getItem(RECENT_STORAGE_KEY);
      if (raw !== null && raw.length > 50000) throw new Error('Too large.');
      this.session =
        raw === null ? empty() : RecentSchema.parse(JSON.parse(raw) as unknown);
      return { data: this.session, warning: null };
    } catch {
      this.session = empty(); // Fail closed: corrupt consent never enables recording.
      return {
        data: this.session,
        warning:
          'Recent history could not be read. Recording is disabled; stored data was not overwritten.',
      };
    }
  }
  private save(data: RecentPreferences) {
    this.session = RecentSchema.parse(data);
    try {
      const store = this.storage();
      if (!store) throw new Error('Unavailable');
      store.setItem(RECENT_STORAGE_KEY, JSON.stringify(this.session));
      this.dirty = false;
      return { data: this.session, warning: null };
    } catch {
      this.dirty = true;
      return {
        data: this.session,
        warning: 'Recent history is session-only; device storage is unavailable.',
      };
    }
  }
  setEnabled(enabled: boolean) {
    return this.save({ ...this.load().data, enabled });
  }
  record(input: z.infer<typeof VisitSchema>) {
    const state = this.load();
    if (!state.data.enabled || input.path.split('?')[0] === '/my-nba') return state;
    const visit = VisitSchema.safeParse(input);
    if (!visit.success) return state;
    return this.save({
      ...state.data,
      visits: [
        visit.data,
        ...state.data.visits.filter((v) => v.path !== visit.data.path),
      ].slice(0, 20),
    });
  }
  clear(disable = false) {
    const current = this.load().data;
    return this.save({
      version: 1,
      enabled: disable ? false : current.enabled,
      visits: [],
    });
  }
}
export const recentHistoryRepository = new RecentHistoryRepository(() => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
});
