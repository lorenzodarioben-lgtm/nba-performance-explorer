import { describe, expect, it } from 'vitest';

import { fixturePlayerProvider } from './fixture-player-provider.js';
import { NbaStatsPlayerProvider } from './nba-stats/nba-stats-player-provider.js';
import { createPlayerProvider } from './player-provider-factory.js';

describe('createPlayerProvider', () => {
  it('returns the shared fixture provider in fixture mode', () => {
    expect(
      createPlayerProvider({ mode: 'fixture', timeoutMs: 10_000, diagnostics: false }),
    ).toBe(fixturePlayerProvider);
  });

  it('constructs an NbaStatsPlayerProvider in nba-stats mode without any network call', () => {
    const provider = createPlayerProvider({
      mode: 'nba-stats',
      timeoutMs: 10_000,
      diagnostics: false,
    });
    expect(provider).toBeInstanceOf(NbaStatsPlayerProvider);
  });
});
