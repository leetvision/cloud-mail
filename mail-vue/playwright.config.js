import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:5199',
    launchOptions: { channel: process.env.PLAYWRIGHT_CHANNEL || (existsSync('/Applications/Google Chrome.app') ? 'chrome' : undefined) },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: `'${process.execPath}' node_modules/vite/bin/vite.js preview --mode release --host 127.0.0.1 --port 5199 --strictPort`,
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: false,
  },
});
