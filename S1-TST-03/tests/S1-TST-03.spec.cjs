// S1-TST-03: safe, read-only user management visibility checks.
const { test, expect } = require('@playwright/test');
const credentials = (role) => {
  const key = `QA_${role.toUpperCase()}`;
  const email = process.env[`${key}_EMAIL`];
  const password = process.env[`${key}_PASSWORD`];
  return email && password ? { email, password } : null;
};
async function login(page, role) {
  const creds = credentials(role);
  if (!creds) throw new Error(`Missing QA_${role.toUpperCase()}_EMAIL/PASSWORD`);
  await page.goto('/main.html');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.locator('#loginEmail').fill(creds.email);
  await page.locator('#loginPassword').fill(creds.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}
async function logout(page) {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
}


test('Admin sees User management with add user control', async ({ page }) => {
  test.skip(!credentials('ADMIN'), 'Requires QA_ADMIN_EMAIL/PASSWORD');
  await login(page,'ADMIN');
  await page.getByRole('button', { name: 'Users', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'User management' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Add user/i })).toBeVisible();
  await expect(page.getByText('Manage User accounts. Superadmin accounts are hidden and protected.')).toBeVisible();
});
test('Superadmin sees user management', async ({ page }) => {
  test.skip(!credentials('SUPERADMIN'), 'Requires QA_SUPERADMIN_EMAIL/PASSWORD');
  await login(page,'SUPERADMIN');
  await page.getByRole('button', { name: 'Users', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'User management' })).toBeVisible();
  await expect(page.getByText('Manage every account, assign roles, and configure permissions.')).toBeVisible();
});
// Actual add/edit/block/approve/designate/delete guards are documented staging-only in S1-TST-03_MANUAL.md.
