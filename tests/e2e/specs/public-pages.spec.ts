import { expect, test, type Locator } from '@playwright/test';
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
    await page.getByTestId('navbar-login-trigger').click();

    const dialog = page.getByTestId('auth-login-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[name="email"]')).toBeVisible();
    await expect(dialog.locator('input[name="password"]')).toBeVisible();
    monitor.expectNoErrors('home login modal');
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`renders one theme-specific marketing image in ${theme} mode`, async ({
      page,
    }) => {
      await setTheme(page, theme);
      await page.goto('/');
      await expect(page.locator('html')).toHaveClass(
        new RegExp(`\\b${theme}\\b`)
      );

      const heroImage = page.locator('#hero img');
      await expect(heroImage).toHaveCount(1);
      await expect(heroImage).toHaveAttribute('alt', /.+/);
      await expect(heroImage).toHaveAttribute('width', '2796');
      await expect(heroImage).toHaveAttribute('height', '2008');

      const featuresImage = page.locator('#features img');
      await expect(featuresImage).toHaveCount(1);
      await expect(featuresImage).toHaveAttribute('width');
      await expect(featuresImage).toHaveAttribute('height');

      await expect(page.locator('#features2 img')).toHaveCount(1);
    });
  }

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
    const placeholderBox = await placeholder.boundingBox();
    expect(placeholderBox).not.toBeNull();

    releaseSession();

    const loginButton = page.getByTestId('navbar-login-trigger');
    const signupLink = page.getByTestId('navbar-signup-link');
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
    await page.getByTestId('mobile-nav-toggle').click();

    const mobileNavigation = page.getByTestId('mobile-navigation');
    await expect(mobileNavigation).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(mobileNavigation).toBeHidden();
  });

  test('renders mobile auth actions without nested buttons', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const nestedButtonErrors: string[] = [];
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        message.text().includes('cannot be a descendant')
      ) {
        nestedButtonErrors.push(message.text());
      }
    });

    await page.goto('/');
    await page.getByTestId('mobile-nav-toggle').click();

    const mobileNavigation = page.getByTestId('mobile-navigation');
    await expect(mobileNavigation).toBeVisible();
    await expect(
      mobileNavigation.getByTestId('mobile-nav-login-trigger')
    ).toBeVisible();
    await expect(
      mobileNavigation.getByTestId('mobile-nav-signup-link')
    ).toHaveAttribute('href', '/auth/register');
    expect(nestedButtonErrors).toEqual([]);

    await mobileNavigation.getByTestId('mobile-nav-login-trigger').click();
    await expect(page).toHaveURL(/\/auth\/login\/?$/);
  });

  test('uses consistent mobile navigation interaction backgrounds', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setTheme(page, 'light');

    const openMobileNavigation = async () => {
      await page.getByTestId('mobile-nav-toggle').click();
      const navigation = page.getByTestId('mobile-navigation');
      await expect(navigation).toBeVisible();
      return navigation;
    };
    const backgroundColor = (locator: Locator) =>
      locator.evaluate((element) => getComputedStyle(element).backgroundColor);

    await page.goto('/');
    let mobileNavigation = await openMobileNavigation();
    const featuresLink = mobileNavigation.locator('a[href="/#features"]');
    const idleBackground = await backgroundColor(featuresLink);
    await featuresLink.hover();
    await expect
      .poll(() => backgroundColor(featuresLink))
      .not.toBe(idleBackground);

    await page.goto('/pricing');
    mobileNavigation = await openMobileNavigation();
    const pricingLink = mobileNavigation.locator('a[href="/pricing"]');
    expect(await backgroundColor(pricingLink)).not.toBe(
      await backgroundColor(mobileNavigation.locator('a[href="/#features"]'))
    );

    await page.goto('/contact');
    mobileNavigation = await openMobileNavigation();
    const pagesTrigger = mobileNavigation.getByTestId('mobile-nav-group-pages');
    expect(await backgroundColor(pagesTrigger)).not.toBe(
      await backgroundColor(
        mobileNavigation.locator('button[aria-expanded]').first()
      )
    );

    await pagesTrigger.click();
    const contactLink = mobileNavigation.locator('a[href="/contact"]');
    await expect(contactLink).toBeVisible();
    expect(await backgroundColor(contactLink)).not.toBe(
      await backgroundColor(mobileNavigation.locator('a[href="/about"]'))
    );
  });

  test('health check responds with pong', async ({ request }) => {
    const response = await request.get('/api/ping');

    await expect(response).toBeOK();
    expect(await response.json()).toEqual({ message: 'pong' });
  });
});
