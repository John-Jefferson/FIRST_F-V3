const { test, expect } = require('@playwright/test');

// This suite NEVER adds, edits, removes, registers users, or changes database records.
// Credentials must be supplied locally through environment variables. They are never printed.
const roles = [
  { role: 'User', prefix: 'QA_USER', expected: 'user' },
  { role: 'Admin', prefix: 'QA_ADMIN', expected: 'admin' },
  { role: 'Superadmin', prefix: 'QA_SUPERADMIN', expected: 'superadmin' },
];
const modules = ['Overview','Customers','Products','Human resources','Sales','Payments','Reports','Users'];

for (const account of roles) {
  test.describe(`${account.role} — live read-only`, () => {
    test.beforeEach(async ({ page }) => {
      const email = process.env[`${account.prefix}_EMAIL`];
      const pass = process.env[`${account.prefix}_PASSWORD`];
      test.skip(!email || !pass, `${account.role} credentials are not configured`);
      // Guard against accidental write requests in the browser. Authentication POSTs
      // are allowed, but ERP business-table writes are blocked unconditionally.
      await page.route('**/*', async route => {
        const req = route.request();
        const url = req.url();
        const method = req.method();
        if (url.includes('/rest/v1/') && !['GET','HEAD','OPTIONS'].includes(method)) {
          return route.abort('blockedbyclient');
        }
        if (url.includes('/functions/v1/manage-user')) return route.abort('blockedbyclient');
        return route.continue();
      });
      await page.goto('/main.html');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.locator('#login-email').fill(email);
      await page.locator('#login-password').fill(pass);
      await page.locator('.modal-body button[type="submit"]').click();
      await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({timeout:30000});
      await expect(page.locator('.dashboard-nav')).toBeVisible();
    });

    test('authenticated role identity and navigation visibility', async ({ page }) => {
      const displayedRole = await page.locator('.role-badge').first().innerText();
      expect(displayedRole.trim().toLowerCase()).toBe(account.expected);
      const menu = page.locator('.dashboard-nav');
      await expect(menu.getByRole('button', {name:/Overview/i})).toBeVisible();
      if (account.expected === 'superadmin') {
        for (const name of modules) {
          await expect(menu.getByRole('button', { name: new RegExp(name, 'i') })).toBeVisible();
        }
      }
      if (account.expected === 'user') {
        await expect(menu.getByRole('button', { name: /Users/i })).toHaveCount(0);
        // Normal users must not see editing controls even if a module is readable.
      }
      if (account.expected === 'admin') {
        await expect(menu.getByRole('button', { name: /Users/i })).toBeVisible();
      }
    });

    test('all visible modules navigate without JavaScript crashes', async ({ page }) => {
      const jsErrors = [];
      page.on('pageerror', error => jsErrors.push(error.message));
      const nav = page.locator('.dashboard-nav .nav-item');
      const count = await nav.count();
      expect(count).toBeGreaterThan(0);
      const names = [];
      for (let i = 0; i < count; i++) {
        names.push((await nav.nth(i).innerText()).trim());
      }
      for (let i = 0; i < names.length; i++) {
        await page.locator('.dashboard-nav .nav-item').nth(i).click();
        await expect(page.locator('.dashboard-main .page-heading h1')).toBeVisible();
        await expect(page.locator('.dashboard-shell')).toBeVisible();
        // Allow client rendering to settle; no API modifications or button submissions.
        await page.waitForTimeout(150);
      }
      expect(jsErrors, `Runtime JavaScript errors while navigating: ${names.join(', ')}`).toEqual([]);
      console.log(`[${account.role}] inspected ${names.length} accessible modules`);
    });

    test('sign out returns to landing page', async ({ page }) => {
      await page.getByRole('button', { name: 'Sign out' }).click();
      await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible({timeout:15000});
      await expect(page.locator('.dashboard-shell')).toHaveCount(0);
    });
  });
}
