import { describe, expect, it } from 'vitest';

import {
  DEFAULT_NBA_STATS_TIMEOUT_MS,
  MAX_NBA_STATS_TIMEOUT_MS,
  MIN_NBA_STATS_TIMEOUT_MS,
  parsePlayerProviderConfig,
  PlayerProviderConfigError,
} from './player-provider-config.js';

describe('parsePlayerProviderConfig — mode', () => {
  it('defaults to fixture when the variable is absent outside production', () => {
    expect(parsePlayerProviderConfig({}).mode).toBe('fixture');
  });

  it('accepts an explicit fixture mode outside production', () => {
    expect(parsePlayerProviderConfig({ NBA_DATA_PROVIDER: 'fixture' }).mode).toBe(
      'fixture',
    );
  });

  it('accepts an explicit nba-stats mode', () => {
    expect(parsePlayerProviderConfig({ NBA_DATA_PROVIDER: 'nba-stats' }).mode).toBe(
      'nba-stats',
    );
  });

  it('accepts nba-stats in production', () => {
    expect(
      parsePlayerProviderConfig({
        NBA_DATA_PROVIDER: 'nba-stats',
        NODE_ENV: 'production',
      }).mode,
    ).toBe('nba-stats');
  });

  it('fails when the provider is absent in production', () => {
    expect(() => parsePlayerProviderConfig({ NODE_ENV: 'production' })).toThrow(
      PlayerProviderConfigError,
    );
  });

  it('fails when fixture is selected in production without explicit approval', () => {
    expect(() =>
      parsePlayerProviderConfig({
        NBA_DATA_PROVIDER: 'fixture',
        NODE_ENV: 'production',
      }),
    ).toThrow(PlayerProviderConfigError);
  });

  it('allows an explicitly approved production fixture deployment', () => {
    expect(
      parsePlayerProviderConfig({
        NBA_DATA_PROVIDER: 'fixture',
        NBA_ALLOW_FIXTURE_IN_PRODUCTION: 'true',
        NODE_ENV: 'production',
      }).mode,
    ).toBe('fixture');
  });

  it('rejects production fixture mode when the allowance is false', () => {
    expect(() =>
      parsePlayerProviderConfig({
        NBA_DATA_PROVIDER: 'fixture',
        NBA_ALLOW_FIXTURE_IN_PRODUCTION: 'false',
        NODE_ENV: 'production',
      }),
    ).toThrow(PlayerProviderConfigError);
  });

  it('still rejects an absent production provider when fixture use is approved', () => {
    expect(() =>
      parsePlayerProviderConfig({
        NBA_ALLOW_FIXTURE_IN_PRODUCTION: 'true',
        NODE_ENV: 'production',
      }),
    ).toThrow(PlayerProviderConfigError);
  });

  it('rejects invalid fixture-production allowance values', () => {
    for (const value of ['', 'TRUE', '1', 'yes']) {
      expect(() =>
        parsePlayerProviderConfig({
          NBA_DATA_PROVIDER: 'fixture',
          NBA_ALLOW_FIXTURE_IN_PRODUCTION: value,
        }),
      ).toThrow(PlayerProviderConfigError);
    }
  });

  it('rejects an unknown provider value', () => {
    expect(() => parsePlayerProviderConfig({ NBA_DATA_PROVIDER: 'live' })).toThrow(
      PlayerProviderConfigError,
    );
  });

  it('rejects an explicitly empty provider value', () => {
    expect(() => parsePlayerProviderConfig({ NBA_DATA_PROVIDER: '' })).toThrow(
      PlayerProviderConfigError,
    );
  });
});

describe('parsePlayerProviderConfig — timeout', () => {
  it('defaults the timeout when absent', () => {
    expect(parsePlayerProviderConfig({}).timeoutMs).toBe(DEFAULT_NBA_STATS_TIMEOUT_MS);
  });

  it('accepts the minimum and maximum boundaries', () => {
    expect(
      parsePlayerProviderConfig({
        NBA_STATS_TIMEOUT_MS: String(MIN_NBA_STATS_TIMEOUT_MS),
      }).timeoutMs,
    ).toBe(MIN_NBA_STATS_TIMEOUT_MS);

    expect(
      parsePlayerProviderConfig({
        NBA_STATS_TIMEOUT_MS: String(MAX_NBA_STATS_TIMEOUT_MS),
      }).timeoutMs,
    ).toBe(MAX_NBA_STATS_TIMEOUT_MS);
  });

  it('rejects out-of-range timeouts', () => {
    for (const value of [
      String(MIN_NBA_STATS_TIMEOUT_MS - 1),
      String(MAX_NBA_STATS_TIMEOUT_MS + 1),
      '0',
    ]) {
      expect(() => parsePlayerProviderConfig({ NBA_STATS_TIMEOUT_MS: value })).toThrow(
        PlayerProviderConfigError,
      );
    }
  });

  it('rejects non-integer and non-numeric timeouts', () => {
    for (const value of ['', '10000.5', '-5000', 'abc', '1e4', '10_000']) {
      expect(() => parsePlayerProviderConfig({ NBA_STATS_TIMEOUT_MS: value })).toThrow(
        PlayerProviderConfigError,
      );
    }
  });
});
