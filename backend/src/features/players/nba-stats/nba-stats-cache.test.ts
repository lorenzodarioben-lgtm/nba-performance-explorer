import { describe, expect, it } from 'vitest';

import { createNbaStatsCache } from './nba-stats-cache.js';

function controllableClock(start = 0) {
  let current = start;
  return {
    now: () => current,
    advance(ms: number) {
      current += ms;
    },
  };
}

describe('NbaStatsCache', () => {
  it('loads on a miss and serves a cached value on a hit', async () => {
    const clock = controllableClock();
    const cache = createNbaStatsCache({ now: clock.now });
    let calls = 0;
    const loader = () => {
      calls += 1;
      return Promise.resolve(`value-${calls}`);
    };

    expect(await cache.getOrLoad('k', loader, () => 1000)).toBe('value-1');
    expect(await cache.getOrLoad('k', loader, () => 1000)).toBe('value-1');
    expect(calls).toBe(1);
  });

  it('reloads after the TTL expires', async () => {
    const clock = controllableClock();
    const cache = createNbaStatsCache({ now: clock.now });
    let calls = 0;
    const loader = () => {
      calls += 1;
      return Promise.resolve(calls);
    };

    expect(await cache.getOrLoad('k', loader, () => 1000)).toBe(1);
    clock.advance(1001);
    expect(await cache.getOrLoad('k', loader, () => 1000)).toBe(2);
    expect(calls).toBe(2);
  });

  it('applies a per-value TTL such as a short empty-result TTL', async () => {
    const clock = controllableClock();
    const cache = createNbaStatsCache({ now: clock.now });
    let calls = 0;
    const loader = () => {
      calls += 1;
      return Promise.resolve<string[]>([]);
    };
    const resolveTtl = (value: string[]) =>
      value.length === 0 ? 60_000 : 6 * 60 * 60_000;

    await cache.getOrLoad('k', loader, resolveTtl);
    clock.advance(59_000);
    await cache.getOrLoad('k', loader, resolveTtl);
    expect(calls).toBe(1);

    clock.advance(2_000); // now past 60s
    await cache.getOrLoad('k', loader, resolveTtl);
    expect(calls).toBe(2);
  });

  it('promotes on read and evicts the least-recently-used entry at the limit', async () => {
    const clock = controllableClock();
    const cache = createNbaStatsCache({ now: clock.now, maxEntries: 2 });
    const load = (value: string) => () => Promise.resolve(value);

    await cache.getOrLoad('a', load('a'), () => 1_000_000);
    await cache.getOrLoad('b', load('b'), () => 1_000_000);
    // Touch 'a' so 'b' becomes least-recently-used.
    await cache.getOrLoad('a', load('a-2'), () => 1_000_000);
    // Insert 'c', which should evict 'b'.
    await cache.getOrLoad('c', load('c'), () => 1_000_000);

    // Assert 'a' is still cached BEFORE touching 'b': with only two slots, reloading an evicted
    // 'b' would itself evict 'a', so order matters.
    let aCalls = 0;
    expect(
      await cache.getOrLoad(
        'a',
        () => {
          aCalls += 1;
          return Promise.resolve('a-reloaded');
        },
        () => 1_000_000,
      ),
    ).toBe('a');
    expect(aCalls).toBe(0);

    // 'b' was evicted, so its loader runs.
    let bCalls = 0;
    await cache.getOrLoad(
      'b',
      () => {
        bCalls += 1;
        return Promise.resolve('b-reloaded');
      },
      () => 1_000_000,
    );
    expect(bCalls).toBe(1);
  });

  it('de-duplicates concurrent identical requests into one load', async () => {
    const cache = createNbaStatsCache();
    let calls = 0;
    let release: ((value: string) => void) | undefined;
    const loader = () => {
      calls += 1;
      return new Promise<string>((resolve) => {
        release = resolve;
      });
    };

    const first = cache.getOrLoad('k', loader, () => 1000);
    const second = cache.getOrLoad('k', loader, () => 1000);
    expect(calls).toBe(1);

    release?.('shared');
    expect(await first).toBe('shared');
    expect(await second).toBe('shared');
  });

  it('never caches errors and cleans up the failed in-flight entry', async () => {
    const cache = createNbaStatsCache();
    let calls = 0;
    const loader = () => {
      calls += 1;
      return Promise.reject(new Error(`boom-${calls}`));
    };

    await expect(cache.getOrLoad('k', loader, () => 1000)).rejects.toThrow('boom-1');
    // A subsequent call retries (the failed in-flight entry was removed, nothing cached).
    await expect(cache.getOrLoad('k', loader, () => 1000)).rejects.toThrow('boom-2');
    expect(calls).toBe(2);
  });
});
