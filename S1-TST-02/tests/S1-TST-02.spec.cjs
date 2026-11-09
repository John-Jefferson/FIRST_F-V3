// S1-TST-02: auth, registration, password recovery. No test emails or registrations are sent.
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


test('register form requires all fields and password length', async ({ page }) => {
  await page.goto('/main.html');
  await page.getByRole('button', { name: 'Get started' }).click();
  await expect(page.locator('#regFirstName')).toHaveAttribute('required', '');
  await expect(page.locator('#regLastName')).toHaveAttribute('required', '');
  await expect(page.locator('#regEmail')).toHaveAttribute('type', 'email');
  await expect(page.locator('#regPassword')).toHaveAttribute('minlength', '8');
});
test('login form and forgot-password entry are available', async ({ page }) => {
  await page.goto('/main.html');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('#loginEmail')).toBeVisible();
  await expect(page.locator('#loginPassword')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Forgot Password?' })).toBeVisible();
  await page.getByRole('button', { name: 'Forgot Password?' }).click();
  await expect(page.getByText('Please enter your email address first.')).toBeVisible();
});
test('approved normal User can sign in and sign out', async ({ page }) => {
  test.skip(!credentials('USER'), 'Set QA_USER_EMAIL and QA_USER_PASSWORD to execute authenticated test');
  await login(page, 'USER');
  await logout(page);
});
// Expired and reused reset tokens require real controlled staging emails; see docs/S1-TST-02_MANUAL.md.
