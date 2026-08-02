import { expect, test } from '@playwright/test';
import {
  cleanupE2EUsers,
  loginByForm,
  registerE2EUser,
  waitForPaidPayment,
  waitForSubscription,
} from '../fixtures/auth';

test.describe('Waffo sandbox payment', () => {
  let currentUserEmail: string | null = null;

  test.beforeEach(async ({ request }) => {
    currentUserEmail = null;
    await cleanupE2EUsers(request);
  });

  test.afterEach(async ({ request }) => {
    // Waffo delivers the success webhook asynchronously. Poll the E2E API
    // for the paid payment row instead of sleeping a fixed interval — if
    // the webhook is late, cleanup would otherwise remove the user first
    // and leave an orphan payment row polluting the local DB.
    if (currentUserEmail) {
      await waitForPaidPayment(request, currentUserEmail, {
        timeoutMs: 30_000,
      });
    }
    await cleanupE2EUsers(request);
  });

  async function completeHostedCheckout(
    page: import('@playwright/test').Page,
    options: {
      trial: boolean;
      paymentButton: string;
      baseURL: string;
      billingAssertion: RegExp;
    }
  ) {
    const billingUrl = `${options.baseURL.replace(/\/$/, '')}/settings/billing`;
    await page.waitForURL(/https:\/\/.*\.waffo\.(ai|com)\//, {
      timeout: 30_000,
    });
    if (options.trial) {
      await expect(page.getByText('7-day free trial')).toBeVisible({
        timeout: 30_000,
      });
    }
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(page.getByText('Payment', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    const cardMethod = page.getByRole('button', {
      name: 'Credit/Debit Card',
    });
    await cardMethod.click();
    const cardNumber = page.locator('input[autocomplete="cc-number"]');
    if (!(await cardNumber.isVisible().catch(() => false))) {
      await page.waitForTimeout(1_000);
      await cardMethod.click();
    }
    await expect(cardNumber).toBeVisible({ timeout: 30_000 });
    await page
      .getByRole('button', { name: 'Success', exact: true })
      .first()
      .click();
    const payButton = page.getByRole('button', {
      name: options.paymentButton,
      exact: true,
    });
    await expect(payButton).toBeEnabled();
    await payButton.click();
    const doneLink = page.getByRole('link', { name: 'Done', exact: true });
    // Hosted checkouts return to the payment processing page, which polls
    // the current plan until the webhook lands and then navigates to Billing.
    await expect(doneLink).toHaveAttribute(
      'href',
      /\/settings\/payment\?callback=/,
      { timeout: 60_000 }
    );
    await doneLink.click();
    await page.waitForURL(billingUrl, {
      timeout: 60_000,
    });
    // The page must settle into the paid plan on its own — no manual reload.
    // Regression: without the payment-processing hop, Billing rendered the
    // stale plan until a hard refresh.
    await expect
      .poll(async () => page.locator('body').innerText(), {
        timeout: 60_000,
        intervals: [2_000, 4_000, 8_000],
      })
      .toMatch(options.billingAssertion);
  }

  test('monthly subscription shows trial, pays, and returns to Billing', async ({
    page,
    request,
    baseURL,
  }) => {
    const user = await registerE2EUser(request);
    currentUserEmail = user.email;
    await loginByForm(page, user);

    await page.goto('/pricing');
    await page.waitForTimeout(1500);

    const proCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByRole('heading', { name: 'Pro' }) });
    await expect(proCard).toContainText('Get Started');
    await proCard.getByRole('button', { name: /Get Started/i }).click();

    await completeHostedCheckout(page, {
      trial: true,
      paymentButton: 'Subscribe',
      baseURL: baseURL ?? 'http://localhost:3018',
      billingAssertion: /Pro[\s\S]*Active/,
    });
  });

  test('yearly subscription shows trial, pays, and returns to Billing', async ({
    page,
    request,
    baseURL,
  }) => {
    const user = await registerE2EUser(request);
    currentUserEmail = user.email;
    await loginByForm(page, user);
    await page.goto('/pricing');
    await page.waitForTimeout(1_500);
    await page.getByRole('button', { name: 'Yearly', exact: true }).click();
    const proCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByRole('heading', { name: 'Pro' }) });
    await expect(proCard).toContainText('/year');
    await proCard.getByRole('button', { name: /Get Started/i }).click();
    await completeHostedCheckout(page, {
      trial: true,
      paymentButton: 'Subscribe',
      baseURL: baseURL ?? 'http://localhost:3018',
      billingAssertion: /Pro[\s\S]*Active/,
    });
  });

  test('lifetime purchase pays and returns to Billing', async ({
    page,
    request,
    baseURL,
  }) => {
    const user = await registerE2EUser(request);
    currentUserEmail = user.email;
    await loginByForm(page, user);
    await page.goto('/pricing');
    const lifetimeCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByRole('heading', { name: /Lifetime/i }) });
    await lifetimeCard
      .getByRole('button', { name: /Lifetime Access|Get Lifetime/i })
      .click();
    await completeHostedCheckout(page, {
      trial: false,
      paymentButton: 'Pay',
      baseURL: baseURL ?? 'http://localhost:3018',
      billingAssertion: /Lifetime/i,
    });
  });

  test('renewal keeps the subscription active after sandbox payment_succeeded', async ({
    page,
    request,
    baseURL,
  }) => {
    const user = await registerE2EUser(request);
    currentUserEmail = user.email;
    await loginByForm(page, user);

    await page.goto('/pricing');
    await page.waitForTimeout(1_500);

    const proCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByRole('heading', { name: 'Pro' }) });
    await proCard.getByRole('button', { name: /Get Started/i }).click();

    await completeHostedCheckout(page, {
      trial: true,
      paymentButton: 'Subscribe',
      baseURL: baseURL ?? 'http://localhost:3018',
      billingAssertion: /Pro[\s\S]*Active/,
    });

    // Waffo test mode delivers `subscription.payment_succeeded` (the renewal
    // event) immediately after `subscription.activated`. The renewal handler
    // must keep the subscription active, leave cancellation unset, and must
    // not create duplicate payment rows.
    const first = await waitForSubscription(request, user.email, {
      timeoutMs: 30_000,
    });
    expect(first).not.toBeNull();
    expect(first!.paymentCount).toBe(1);
    expect(first!.subscription).toMatchObject({
      status: 'active',
      cancelAtPeriodEnd: false,
      interval: 'month',
    });
    expect(first!.subscription!.periodEnd).not.toBeNull();

    // Give a late renewal event time to land, then re-verify no regression.
    await page.waitForTimeout(5_000);
    const settled = await waitForSubscription(request, user.email, {
      timeoutMs: 10_000,
    });
    expect(settled).not.toBeNull();
    expect(settled!.paymentCount).toBe(1);
    expect(settled!.subscription?.status).toBe('active');
    expect(settled!.subscription?.cancelAtPeriodEnd).toBe(false);
  });
});
