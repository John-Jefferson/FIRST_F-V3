const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 45000,
  expect: { timeout: 12000 },
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.ERP_BASE_URL || 'http://127.0.0.1:5174',
    screenshot: 'only-on-failure', trace: 'off', video: 'off'
  },
  projects: [{ name: 'chromium', use: {...devices['Desktop Chrome']} }]
});
