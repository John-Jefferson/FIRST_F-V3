// S1-TST-05: standalone smoke tests for landing page and primary workflow.
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


test('site loads with branding and auth actions', async ({ page }) => {
  await page.goto('/main.html');
  await expect(page.getByRole('button', { name: 'Sign in', exact:true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get started' })).toBeVisible();
  await expect(page.getByText('Customer management', { exact:true })).toBeVisible();
  await expect(page.getByText('Product management', { exact:true })).toBeVisible();
});
test('authenticated main page loads', async ({ page }) => {
  test.skip(!credentials('USER'), 'Requires approved test User credentials');
  await login(page,'USER');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(page.getByRole('button', { name:'Sign out' })).toBeVisible();
});
