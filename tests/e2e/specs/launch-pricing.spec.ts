import { expect, test } from '@playwright/test';
import {
  cleanupE2EUsers,
  loginByForm,
  registerE2EUser,
} from '../fixtures/auth';

test.describe('launch pricing checkout entry', () => {
  test.beforeAll(async ({ request }) => {
    await cleanupE2EUsers(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupE2EUsers(request);
  });

  test('guests can view plans and sign in from a plan CTA', async ({
    page,
    request,
  }) => {
    await page.goto('/launch-pricing');

    await expect(page).toHaveURL(/\/launch-pricing\/?$/);
    await expect(page.getByTestId('launch-plan-starter')).toBeVisible();
    await expect(page.getByTestId('launch-plan-monthly')).toBeVisible();
    await expect(page.getByTestId('launch-plan-annual')).toBeVisible();
    await expect(page.getByTestId('launch-starter-regular-price')).toHaveText(
      '$19.80'
    );
    await expect(page.getByTestId('launch-starter-discount')).toHaveText(
      '50% OFF'
    );
    await expect(page.getByTestId('launch-countdown-days')).toHaveText(
      /^\d{2}$/
    );
    await expect(page.getByTestId('launch-countdown-hours')).toHaveText(
      /^\d{2}$/
    );
    await expect(page.getByTestId('launch-countdown-minutes')).toHaveText(
      /^\d{2}$/
    );
    await expect(page.getByTestId('launch-countdown-seconds')).toHaveText(
      /^\d{2}$/
    );
    const annualPlan = page.getByTestId('launch-plan-annual');
    await expect(annualPlan).toContainText(
      /积分每月刷新，非一次性到账|Credits refresh monthly, not all at once/
    );
    await expect(annualPlan).toContainText(
      /全年共 2,880 积分|2,880 credits\/year/
    );
    await expect(annualPlan).not.toContainText(
      /全年积分一次到账|allowance upfront/
    );
    await expect(page.getByText(/立即免费试用|Start Free Trial/)).toHaveCount(
      0
    );
    await expect(
      page.getByText(/这是首发方案预览|This is a launch-plan preview/)
    ).toHaveCount(0);
    await expect(
      page.getByText(/同样的积分，不同的节奏|Same credits, a different rhythm/)
    ).toHaveCount(0);
    const loginDialog = page.getByTestId('auth-login-dialog');
    for (const ctaId of [
      'launch-cta-starter',
      'launch-cta-monthly',
      'launch-cta-annual',
      'launch-cta-final',
    ]) {
      const cta = page.getByTestId(ctaId);
      await expect(cta).toBeEnabled();
      await cta.click();
      await expect(page).toHaveURL(/\/launch-pricing\/?$/);
      await expect(loginDialog).toBeVisible();
      await expect(
        loginDialog.getByRole('tab', { name: /登录|Log in/i })
      ).toBeVisible();
      await expect(
        loginDialog.getByRole('tab', { name: /注册|Sign up/i })
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(loginDialog).toBeHidden();
    }

    await page.getByTestId('launch-cta-monthly').click();
    await expect(loginDialog).toBeVisible();

    const user = await registerE2EUser(request);
    await loginDialog.getByRole('tab', { name: /登录|Log in/i }).click();
    await loginDialog.locator('input[name="email"]').fill(user.email);
    await loginDialog.locator('input[name="password"]').fill(user.password);
    const checkoutRequest = page.waitForRequest(
      (candidate) =>
        candidate.method() === 'POST' &&
        candidate.url().includes('/_serverFn/') &&
        candidate.headers()['x-tsr-serverfn'] === 'true'
    );
    await loginDialog
      .locator('form')
      .filter({ has: page.locator('input[name="email"]') })
      .locator('button[type="submit"]')
      .click();
    await checkoutRequest;
    await expect(page).toHaveURL(/\/launch-pricing\/?$/);
    await expect(page.getByTestId('launch-plan-starter')).toBeVisible();
    await expect(page.getByTestId('launch-plan-monthly')).toBeVisible();
    await expect(page.getByTestId('launch-plan-annual')).toBeVisible();
  });

  test('signed-in users can view plans before checkout starts', async ({
    page,
    request,
  }) => {
    const user = await registerE2EUser(request);
    await loginByForm(page, user);
    await page.route('**/_serverFn/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ result: { url: null } }),
      })
    );

    await page.goto('/launch-pricing');
    await expect(page).toHaveURL(/\/launch-pricing\/?$/);
    await expect(page.getByTestId('launch-plan-monthly')).toBeVisible();
    const checkoutRequest = page.waitForRequest(
      (candidate) =>
        candidate.method() === 'POST' &&
        candidate.url().includes('/_serverFn/') &&
        candidate.headers()['x-tsr-serverfn'] === 'true'
    );
    await page.getByTestId('launch-cta-monthly').click();
    const checkout = await checkoutRequest;
    const payload = checkout.postData() ?? '';

    expect(payload).toContain('"s":"pro"');
    expect(payload).toContain('"priceId"');
    await expect(page).toHaveURL(/\/launch-pricing\/?$/);
  });

  test('retires the legacy pricing page', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveURL(/\/$/);
  });
});
