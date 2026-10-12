import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 4173)
const FLAGS_OFF_PORT = 4174
const FLAGS_OFF_SPECS = /\.flags-off\.spec\.ts$/
const CI = !!process.env.CI

/**
 * E2E against the built `dist/` served by `vite preview` (never the dev server).
 * `pnpm e2e` builds first; in CI (T11) the artifact is downloaded and `pnpm e2e:ci` is used.
 * The API is always mocked with page.route (see e2e/support/api.ts).
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  reporter: CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: 'disabled' },
  },
  // One folder per project; only the visual specs (chromium + mobile) generate snapshots.
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    // Recording every test (video) starves the 2-vCPU CI runners; the trace is enough to debug.
    trace: CI ? 'on-first-retry' : 'retain-on-failure',
    video: CI ? 'off' : 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: FLAGS_OFF_SPECS },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      ignoreSnapshots: true,
      testIgnore: FLAGS_OFF_SPECS,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      ignoreSnapshots: true,
      testIgnore: FLAGS_OFF_SPECS,
    },
    {
      // Build with every feature flag off (dist-flags-off/): 404s, absent links, no requests.
      name: 'flags-off',
      testMatch: FLAGS_OFF_SPECS,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${FLAGS_OFF_PORT}` },
    },
    {
      // Chromium engine with a phone viewport; the visual suite runs here too.
      name: 'mobile',
      testIgnore: FLAGS_OFF_SPECS,
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: `pnpm exec vite preview --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
    {
      command: `pnpm exec vite preview --outDir dist-flags-off --port ${FLAGS_OFF_PORT} --strictPort`,
      url: `http://localhost:${FLAGS_OFF_PORT}`,
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
  ],
})
