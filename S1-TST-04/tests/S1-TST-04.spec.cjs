// S1-TST-04: user role UI permission checks. Server/RLS matrix is staging-only.
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


const modules=['Customers','Products','Human Resources','Sales','Payments','Reports'];
test('Normal User cannot access admin-only Users menu', async ({ page }) => {
  test.skip(!credentials('USER'), 'Requires QA_USER_EMAIL/PASSWORD');
  await login(page,'USER');
  await expect(page.getByRole('button', { name: 'Users', exact:true })).toHaveCount(0);
});
test('Admin and Superadmin can access Users menu', async ({ page }) => {
  for(const role of ['ADMIN','SUPERADMIN']) {
    test.skip(!credentials(role), `Requires ${role} credentials`);
    await login(page,role);
    await expect(page.getByRole('button', { name: 'Users',exact:true })).toBeVisible();
    await page.getByRole('button', {name:'Sign out'}).click();
  }
});
// All 45 permission codes, UI actions, and direct server authorization are in docs/S1-TST-04_MATRIX.md.
