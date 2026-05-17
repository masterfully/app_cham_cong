import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  webServer: {
    command: 'npx vite preview --port 5174',
    url: 'http://localhost:5174',
    timeout: 120_000,
    reuseExistingServer: true,
  },
  use: {
    headless: false,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'
  }
});
