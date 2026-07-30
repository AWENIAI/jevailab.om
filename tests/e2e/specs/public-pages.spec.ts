import { expect, test } from '@playwright/test';
import {
  expectHealthyPage,
  installPageHealthMonitor,
  localizedPath,
  setTheme,
  type LocaleMode,
  type ThemeMode,
} from '../fixtures/page-health';

const publicPages = [
  { path: '/', name: 'home' },
  { path: '/pricing', name: 'pricing' },
  { path: '/blog', name: 'blog index' },
  { path: '/blog/getting-started', name: 'blog detail' },
  { path: '/ai', name: 'ai playground' },
  { path: '/about', name: 'about' },
  { path: '/contact', name: 'contact' },
  { path: '/changelog', name: 'changelog' },
  { path: '/roadmap', name: 'roadmap' },
  { path: '/waitlist', name: 'waitlist' },
  { path: '/cookie', name: 'cookie policy' },
  { path: '/privacy', name: 'privacy policy' },
  { path: '/terms', name: 'terms of service' },
  { path: '/auth/login', name: 'login' },
  { path: '/auth/register', name: 'register' },
  { path: '/auth/forgot-password', name: 'forgot password' },
  { path: '/auth/reset-password', name: 'reset password' },
] as const;

const smokeMatrix: Array<{ locale: LocaleMode; theme: ThemeMode }> = [
  { locale: 'en', theme: 'dark' },
  { locale: 'en', theme: 'light' },
  { locale: 'zh', theme: 'dark' },
  { locale: 'zh', theme: 'light' },
];

test.describe('public page smoke coverage', () => {
  for (const { locale, theme } of smokeMatrix) {
    test(`renders all public pages in ${locale}/${theme}`, async ({ page }) => {
      await setTheme(page, theme);
      const monitor = installPageHealthMonitor(page);

      for (const publicPage of publicPages) {
        await test.step(publicPage.name, async () => {
          await expectHealthyPage(
            page,
            monitor,
            localizedPath(publicPage.path, locale),
            { theme }
          );
        });
      }
    });
  }

  test('opens the home page login modal', async ({ page }) => {
    await setTheme(page, 'dark');
    const monitor = installPageHealthMonitor(page);

    await expectHealthyPage(page, monitor, '/', { theme: 'dark' });
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /^log in$/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[name="email"]')).toBeVisible();
    await expect(dialog.locator('input[name="password"]')).toBeVisible();
    monitor.expectNoErrors('home login modal');
  });

  test('keeps desktop auth action width stable while session loads', async ({
    page,
  }) => {
    let releaseSession = () => {};
    const sessionGate = new Promise<void>((resolve) => {
      releaseSession = resolve;
    });

    await page.route('**/api/auth/get-session', async (route) => {
      await sessionGate;
      await route.continue();
    });

    await page.goto('/');

    const placeholder = page.locator('[data-slot="auth-actions-placeholder"]');
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText('Log in');
    await expect(placeholder).toContainText('Sign up');
    const placeholderBox = await placeholder.boundingBox();
    expect(placeholderBox).not.toBeNull();

    releaseSession();

    const loginButton = page.getByRole('button', { name: 'Log in' });
    const signupLink = page.getByRole('link', { name: 'Sign up' });
    await expect(loginButton).toBeVisible();
    await expect(signupLink).toBeVisible();
    await expect(placeholder).toHaveCount(0);

    const loginBox = await loginButton.boundingBox();
    const signupBox = await signupLink.boundingBox();
    expect(loginBox).not.toBeNull();
    expect(signupBox).not.toBeNull();
    expect(
      Math.abs(
        signupBox!.x + signupBox!.width - loginBox!.x - placeholderBox!.width
      )
    ).toBeLessThanOrEqual(1);
  });

  test('hides open mobile navigation at the desktop breakpoint', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setTheme(page, 'light');

    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\blight\b/);
    await page.getByRole('button', { name: 'Toggle menu' }).click();

    const mobileNavigation = page.getByRole('dialog', {
      name: 'Mobile navigation',
    });
    await expect(mobileNavigation).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(mobileNavigation).toBeHidden();
  });

  test('health check responds with pong', async ({ request }) => {
    const response = await request.get('/api/ping');

    await expect(response).toBeOK();
    expect(await response.json()).toEqual({ message: 'pong' });
  });
});
