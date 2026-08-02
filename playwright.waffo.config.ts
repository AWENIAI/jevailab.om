import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e/waffo',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3018',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
