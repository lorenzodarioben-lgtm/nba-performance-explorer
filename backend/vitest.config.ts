import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: [...configDefaults.exclude, 'dist/**'],
    restoreMocks: true,
    // Some suites reconcile or rank every recorded team and player; on a busy host one test can
    // exceed five seconds of CPU. Assertions are unchanged.
    testTimeout: 20_000,
  },
});
