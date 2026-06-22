// A backend-private, process-local cache for live NBA.com responses. It combines a bounded LRU
// of settled values with a separate in-flight promise map so that concurrent callers for the
// same key share one upstream request. Errors are never cached. The clock is injectable so TTL
// behaviour is deterministic in tests, and a fresh instance can be created per test.

export interface NbaStatsCacheOptions {
  maxEntries?: number;
  now?: () => number;
}

interface SettledEntry<T> {
  value: T;
  expiresAt: number;
}

export const DEFAULT_MAX_CACHE_ENTRIES = 500;

export class NbaStatsCache {
  private readonly settled = new Map<string, SettledEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: NbaStatsCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_CACHE_ENTRIES;
    this.now = options.now ?? (() => Date.now());
  }

  // Return a fresh cached value, share an in-flight load, or start a new load. `resolveTtlMs`
  // is called with the resolved value so the caller can pick a TTL from the data (for example a
  // shorter TTL for an empty result). A rejected load is never cached and its in-flight entry is
  // removed so the next call retries.
  async getOrLoad<T>(
    key: string,
    loader: () => Promise<T>,
    resolveTtlMs: (value: T) => number,
  ): Promise<T> {
    const fresh = this.readFresh<T>(key);
    if (fresh.hit) {
      return fresh.value;
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      return pending as Promise<T>;
    }

    const promise = (async () => {
      try {
        const value = await loader();
        this.store(key, value, resolveTtlMs(value));
        return value;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  private readFresh<T>(key: string): { hit: true; value: T } | { hit: false } {
    const entry = this.settled.get(key);
    if (!entry) {
      return { hit: false };
    }

    if (entry.expiresAt <= this.now()) {
      this.settled.delete(key);
      return { hit: false };
    }

    // LRU promotion: re-insert so this key becomes most-recently used.
    this.settled.delete(key);
    this.settled.set(key, entry);
    return { hit: true, value: entry.value as T };
  }

  private store(key: string, value: unknown, ttlMs: number): void {
    this.settled.delete(key);
    this.settled.set(key, { value, expiresAt: this.now() + ttlMs });

    // Evict the least-recently-used entries (Map iteration order is insertion/most-recent order).
    while (this.settled.size > this.maxEntries) {
      const oldestKey = this.settled.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.settled.delete(oldestKey);
    }
  }
}

// A fresh, isolated cache instance. Production uses one shared instance per provider; each test
// creates its own so there is no shared mutable state between tests.
export function createNbaStatsCache(options?: NbaStatsCacheOptions): NbaStatsCache {
  return new NbaStatsCache(options);
}
