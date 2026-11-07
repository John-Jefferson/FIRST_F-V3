const { test, expect } = require('@playwright/test');

// All tests use a local deployment, contain no real credentials, and perform no writes.
// Prevent calls to Supabase and other external backends. Only static app behavior is tested.
test.beforeEach(async ({ page }) => {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['localhost', '127.0.0.1'].includes(url.hostname)) return route.continue();
    return route.abort('blockedbyclient');
  });
  await page.goto('/main.html');
});

test('landing page shows Hope ERP branding and primary actions', async ({ page }) => {
  await expect(page.getByRole('link', { name: /Hope ERP home/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get started', exact: true })).toBeVisible();
  await expect(page.getByText('Customer management', { exact: true })).toBeVisible();
});

test('sign-in modal opens and closes without submitting credentials', async ({ page }) => {
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Welcome back', { exact: true })).toBeVisible();
  await expect(page.locator('#login-email')).toBeVisible();
  await expect(page.locator('#login-password')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Welcome back', { exact: true })).not.toBeVisible();
});

test('sign-in form requires a valid email and password', async ({ page }) => {
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const email = page.locator('#login-email');
  const password = page.locator('#login-password');
  await expect(email).toHaveAttribute('required', '');
  await expect(email).toHaveAttribute('type', 'email');
  await expect(password).toHaveAttribute('required', '');
  await expect(password).toHaveAttribute('minlength', '8');
  await email.fill('not-an-email');
  await password.fill('12345678');
  const valid = await email.evaluate(input => input.checkValidity());
  expect(valid).toBe(false);
});

test('registration shows required name, email and password inputs', async ({ page }) => {
  await page.getByRole('button', { name: 'Get started', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
  for (const id of ['regFirstName', 'regLastName', 'register-email', 'register-password']) {
    await expect(page.locator('#' + id)).toBeVisible();
    await expect(page.locator('#' + id)).toHaveAttribute('required', '');
  }
});

test('landing feature descriptions are visible', async ({ page }) => {
  for (const item of ['Customer management', 'Product management', 'Human resources', 'Sales management']) {
    await expect(page.getByRole('heading', { name: item })).toBeVisible();
  }
});
