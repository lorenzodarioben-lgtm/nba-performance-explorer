import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Development-only browser checks. They are not part of `npm run validate` (CI has no browser
// install); run them locally with `npm run e2e`. The app runs in explicit fixture/demo mode for
// player data, and the committed genuine archives for everything else, so results are stable.
const localChromium = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const executablePath =
  process.env.PW_CHROMIUM_PATH ??
  (existsSync(localChromium) ? localChromium : undefined);

export default defineConfig({
  testDir: '.',
  outputDir: './.artifacts/results',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    reducedMotion: 'reduce',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        defaultBrowserType: 'chromium',
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    cwd: '..',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
