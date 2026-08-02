import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { E2E_TEST_SECRET, type E2EUser, createE2EUser } from './test-data';

const e2eHeaders = {
  'x-e2e-secret': E2E_TEST_SECRET,
};

export async function cleanupE2EUsers(request: APIRequestContext) {
  const response = await request.delete('/api/e2e/users', {
    headers: e2eHeaders,
  });

  expect(response.ok(), await response.text()).toBeTruthy();
}

export async function registerE2EUser(
  request: APIRequestContext,
  overrides: Partial<E2EUser> = {}
) {
  const user = createE2EUser(overrides);
  const origin = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
  const response = await request.post('/api/auth/sign-up/email', {
    headers: {
      Origin: origin,
      Referer: `${origin}/auth/register`,
    },
    data: {
      email: user.email,
      password: user.password,
      name: user.name,
      callbackURL: '/dashboard',
    },
  });

  expect(response.ok(), await response.text()).toBeTruthy();

  await updateE2EUser(request, {
    email: user.email,
    emailVerified: true,
    role: user.role ?? 'user',
  });

  return user;
}

export async function updateE2EUser(
  request: APIRequestContext,
  data: {
    email: string;
    emailVerified?: boolean;
    role?: 'admin' | 'user' | null;
  }
) {
  const response = await request.patch('/api/e2e/users', {
    headers: e2eHeaders,
    data,
  });

  expect(response.ok(), await response.text()).toBeTruthy();
}

export async function loginByForm(page: Page, user: E2EUser) {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.locator('input[name="email"]').fill(user.email);
  await page.locator('input[name="password"]').fill(user.password);
  const signInButton = page.getByRole('button', {
    name: /^sign in$|^登录$/i,
  });
  await expect(signInButton).toBeEnabled();
  await signInButton.click();
  await expect(page).toHaveURL(/\/dashboard\/?$/);
}

/**
 * Poll until a paid payment row for the given E2E user exists, or the
 * timeout expires. Used by hosted-checkout E2E specs to wait for the
 * asynchronous provider webhook to land before test teardown removes
 * the user.
 */
export async function waitForPaidPayment(
  request: APIRequestContext,
  email: string,
  {
    timeoutMs = 30_000,
    intervalMs = 1_000,
  }: {
    timeoutMs?: number;
    intervalMs?: number;
  } = {}
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await request.get(
      `/api/e2e/users?email=${encodeURIComponent(email)}&paid=true`,
      { headers: e2eHeaders }
    );
    if (response.ok()) {
      const body = (await response.json()) as { paymentCount?: number };
      if ((body.paymentCount ?? 0) > 0) return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

export interface E2ESubscriptionRow {
  status: string;
  interval: string | null;
  periodStart: number | null;
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Poll until a paid payment row for the given E2E user exists, returning the
 * payment count and the latest subscription row exposed by the E2E API.
 * Used by the Waffo renewal journey to assert webhook lifecycle state.
 */
export async function waitForSubscription(
  request: APIRequestContext,
  email: string,
  {
    timeoutMs = 30_000,
    intervalMs = 1_000,
  }: {
    timeoutMs?: number;
    intervalMs?: number;
  } = {}
): Promise<{
  paymentCount: number;
  subscription: E2ESubscriptionRow | null;
} | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await request.get(
      `/api/e2e/users?email=${encodeURIComponent(email)}&paid=true`,
      { headers: e2eHeaders }
    );
    if (response.ok()) {
      const body = (await response.json()) as {
        paymentCount?: number;
        subscription?: E2ESubscriptionRow | null;
      };
      if ((body.paymentCount ?? 0) > 0) {
        return {
          paymentCount: body.paymentCount ?? 0,
          subscription: body.subscription ?? null,
        };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}
