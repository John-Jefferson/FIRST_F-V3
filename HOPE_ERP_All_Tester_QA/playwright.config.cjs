const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.cjs',
  timeout: Number(process.env.QA_TEST_TIMEOUT_MS) || 60000,
  expect: { timeout: Number(process.env.QA_EXPECT_TIMEOUT_MS) || 15000 },
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'qa-results.json' }]
  ],
  use: {
    baseURL: process.env.ERP_BASE_URL || 'http://127.0.0.1:5174',
    trace: 'off', // Avoid leaking credentials into trace archives.
    screenshot: 'only-on-failure', // Keep reports local and private.
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
