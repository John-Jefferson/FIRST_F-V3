const { test, expect } = require('@playwright/test');

// Additional, non-destructive checks mapped to Guide sections 3.2-3.8 and 4.3.
// No account creations, data edits, approvals, or payments are submitted.
const roles = [
  { title: 'User', prefix: 'QA_USER' },
  { title: 'Admin', prefix: 'QA_ADMIN' },
  { title: 'Superadmin', prefix: 'QA_SUPERADMIN' },
];

for (const role of roles) {
  test.describe(`${role.title} — guide read-only checks`, () => {
    test.beforeEach(async ({ page }) => {
      const email = process.env[`${role.prefix}_EMAIL`];
      const password = process.env[`${role.prefix}_PASSWORD`];
      test.skip(!email || !password, `${role.title}: no locally configured credentials`);
      await page.route('**/*', route => {
        const request = route.request();
        const url = request.url();
        const method = request.method();
        // Fail closed for business mutations; allow authentication requests.
        if (/\/rest\/v1\//.test(url) && !['GET','HEAD','OPTIONS'].includes(method)) {
          return route.abort('blockedbyclient');
        }
        if (/\/functions\/v1\/manage-user/.test(url)) return route.abort('blockedbyclient');
        return route.continue();
      });
      await page.goto('/main.html');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.locator('#login-email').fill(email);
      await page.locator('#login-password').fill(password);
      await page.locator('.modal-body button[type="submit"]').click();
      await expect(page.locator('.dashboard-shell')).toBeVisible({ timeout: 30000 });
    });

    test('visible modules retain dashboard shell and headings', async ({ page }) => {
      const nav = page.locator('.dashboard-nav .nav-item');
      const n = await nav.count();
      expect(n).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        await nav.nth(i).click();
        await expect(page.locator('.dashboard-shell')).toBeVisible();
        await expect(page.locator('.dashboard-main .page-heading h1')).toBeVisible();
      }
      console.log(`[${role.title}] guide navigation checked ${n} modules`);
    });

    test('visible module navigation does not raise page exceptions', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const nav = page.locator('.dashboard-nav .nav-item');
      const n = await nav.count();
      for (let i = 0; i < n; i++) {
        await nav.nth(i).click();
        await page.waitForTimeout(250);
      }
      expect(errors, errors.join('\n')).toEqual([]);
    });
  });
}
