import { describe, expect, it, vi } from 'vitest';
import { RecentHistoryRepository, RECENT_STORAGE_KEY } from './recent-history';
import type { ResearchStorage } from './local-research';
function storage(): ResearchStorage {
  const values = new Map<string, string>();
  return {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v);
    },
    removeItem: (k) => {
      values.delete(k);
    },
  };
}
const visit = {
  path: '/history/1999-00',
  label: 'Historical season',
  visitedAt: '2026-10-13T20:00:00.000Z',
};
describe('opt-in recent history', () => {
  it('performs no writes before explicit opt-in and honors disabled state after reload', () => {
    const store = storage();
    const write = vi.spyOn(store, 'setItem');
    const repo = new RecentHistoryRepository(() => store);
    repo.record(visit);
    expect(write).not.toHaveBeenCalled();
    expect(repo.load().data.enabled).toBe(false);
    repo.setEnabled(true);
    repo.record(visit);
    expect(new RecentHistoryRepository(() => store).load().data.visits).toEqual([
      visit,
    ]);
    repo.setEnabled(false);
    const count = write.mock.calls.length;
    repo.record({ ...visit, path: '/explore' });
    expect(write).toHaveBeenCalledTimes(count);
  });
  it('fails closed on corrupt consent and never overwrites it during a view', () => {
    const store = storage();
    store.setItem(RECENT_STORAGE_KEY, '{"enabled":true}');
    const write = vi.spyOn(store, 'setItem');
    const repo = new RecentHistoryRepository(() => store);
    expect(repo.load().warning).toContain('Recording is disabled');
    repo.record(visit);
    expect(write).not.toHaveBeenCalled();
  });
  it('keeps only20 distinct newest URLs, refuses external links and skips settings views', () => {
    const store = storage();
    const repo = new RecentHistoryRepository(() => store);
    repo.setEnabled(true);
    for (let i = 1; i <= 25; i++)
      repo.record({ ...visit, path: `/players/${i}/career`, label: `Player ${i}` });
    expect(repo.load().data.visits).toHaveLength(20);
    expect(repo.load().data.visits[0]?.path).toBe('/players/25/career');
    repo.record({ ...visit, path: '/players/10/career' });
    expect(repo.load().data.visits).toHaveLength(20);
    expect(repo.load().data.visits[0]?.path).toBe('/players/10/career');
    repo.record({ ...visit, path: 'https://evil.invalid' });
    repo.record({ ...visit, path: '/my-nba' });
    expect(repo.load().data.visits).toHaveLength(20);
    repo.clear(true);
    expect(repo.load().data).toEqual({ version: 1, enabled: false, visits: [] });
  });
  it('honors consent changed by another repository and preserves session-only opt-in safely', () => {
    const store = storage();
    const a = new RecentHistoryRepository(() => store),
      b = new RecentHistoryRepository(() => store);
    a.setEnabled(true);
    b.setEnabled(false);
    a.record(visit);
    expect(a.load().data.visits).toEqual([]);
    const session = new RecentHistoryRepository(() => null);
    session.record(visit);
    expect(session.load().data.visits).toEqual([]);
    session.setEnabled(true);
    expect(session.record(visit).warning).toContain('session-only');
    expect(session.load().data.visits).toEqual([visit]);
  });
});
