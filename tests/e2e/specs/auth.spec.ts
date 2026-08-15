import { expect, test } from '@playwright/test';
import {
  cleanupE2EUsers,
  loginByForm,
  registerE2EUser,
  updateE2EUser,
} from '../fixtures/auth';
import { createE2EUser } from '../fixtures/test-data';

test.describe('authentication and protected routes', () => {
  test.beforeAll(async ({ request }) => {
    await cleanupE2EUsers(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupE2EUsers(request);
  });

  test('redirects guests from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('allows a verified user to sign in and view dashboard', async ({
    page,
    request,
  }) => {
    const user = await registerE2EUser(request);

    await loginByForm(page, user);
    await expect(page).toHaveURL(/\/dashboard\/?$/);
  });

  test('allows a user to register from the register page', async ({
    page,
    request,
  }) => {
    const user = createE2EUser();

    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="name"]').fill(user.name);
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    const signUpResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/sign-up/email') &&
        response.request().method() === 'POST'
    );
    await page.locator('form button[type="submit"]').click();
    expect((await signUpResponse).ok()).toBeTruthy();

    await updateE2EUser(request, {
      email: user.email,
      emailVerified: true,
      role: 'user',
    });
    await loginByForm(page, user);
    await expect(page).toHaveURL(/\/dashboard\/?$/);
  });

  test('validates the registration password before requesting an account', async ({
    page,
  }) => {
    let signUpRequestCount = 0;
    page.on('request', (request) => {
      if (
        request.url().includes('/api/auth/sign-up/email') &&
        request.method() === 'POST'
      ) {
        signUpRequestCount += 1;
      }
    });

    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="name"]').fill('E2E User');
    await page.locator('input[name="email"]').fill('e2e-short@example.test');
    await page.locator('input[name="password"]').fill('1234567');
    await page.locator('form button[type="submit"]').click();

    await expect(page.locator('input[name="password"]')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(signUpRequestCount).toBe(0);
  });

  test('redirects non-admin users away from admin pages', async ({
    page,
    request,
  }) => {
    const user = await registerE2EUser(request);

    await loginByForm(page, user);
    await page.goto('/admin/users');

    await expect(page).toHaveURL(/\/dashboard\/?$/);
  });

  test('allows admin users to view the users dashboard', async ({
    page,
    request,
  }) => {
    const user = await registerE2EUser(request, { role: 'admin' });

    await loginByForm(page, user);
    await page.goto('/admin/users');

    await expect(page).toHaveURL(/\/admin\/users\/?$/);
    await expect(
      page.getByRole('table').getByText(user.email).first()
    ).toBeVisible();

    await page
      .getByRole('table')
      .getByRole('row', { name: new RegExp(user.email) })
      .getByTestId('admin-user-detail-trigger')
      .click();
    const userDrawer = page.getByRole('dialog');
    await expect(userDrawer).toBeVisible();

    await userDrawer.locator('[data-slot="drawer-close"]').click();
    await expect(userDrawer).toBeHidden();
  });
});
