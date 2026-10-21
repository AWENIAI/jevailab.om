import { expect, test } from '@playwright/test';
import {
  expectHealthyPage,
  installPageHealthMonitor,
  localizedPath,
  type LocaleMode,
} from '../fixtures/page-health';

const publicPages = [
  { path: '/', name: 'home' },
  { path: '/blog', name: 'blog index' },
  { path: '/blog/create-with-templates', name: 'blog detail' },
  { path: '/about', name: 'about' },
  { path: '/contact', name: 'contact' },
  { path: '/changelog', name: 'changelog' },
  { path: '/roadmap', name: 'roadmap' },
  { path: '/waitlist', name: 'waitlist' },
  { path: '/launch-pricing', name: 'launch pricing' },
  { path: '/cookie', name: 'cookie policy' },
  { path: '/privacy', name: 'privacy policy' },
  { path: '/terms', name: 'terms of service' },
  { path: '/auth/login', name: 'login' },
  { path: '/auth/register', name: 'register' },
  { path: '/auth/forgot-password', name: 'forgot password' },
  { path: '/auth/reset-password', name: 'reset password' },
] as const;

const locales: LocaleMode[] = ['en', 'zh'];

test.describe('public page smoke coverage', () => {
  for (const locale of locales) {
    test(`renders all public pages in ${locale}`, async ({ page }) => {
      const monitor = installPageHealthMonitor(page);

      for (const publicPage of publicPages) {
        await test.step(publicPage.name, async () => {
          await expectHealthyPage(
            page,
            monitor,
            localizedPath(publicPage.path, locale)
          );
        });
      }
    });
  }

  test('opens the home page login modal', async ({ page }) => {
    const monitor = installPageHealthMonitor(page);

    await expectHealthyPage(page, monitor, '/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('navbar-login-trigger').click();

    const dialog = page.getByTestId('auth-login-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[name="email"]')).toBeVisible();
    await expect(dialog.locator('input[name="password"]')).toBeVisible();
    monitor.expectNoErrors('home login modal');
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

  test('health check responds with pong', async ({ request }) => {
    const response = await request.get('/api/ping');

    await expect(response).toBeOK();
    expect(await response.json()).toEqual({ message: 'pong' });
  });

  for (const locale of locales) {
    test(`public ${locale} pages contain no video product copy`, async ({
      page,
    }) => {
      for (const publicPage of publicPages) {
        await test.step(publicPage.name, async () => {
          await page.goto(localizedPath(publicPage.path, locale), {
            waitUntil: 'domcontentloaded',
          });
          await expect(page.locator('body')).toBeVisible();

          const description =
            (await page
              .locator('meta[name="description"]')
              .getAttribute('content')) ?? '';
          const publicCopy = [
            await page.title(),
            description,
            await page.locator('body').innerText(),
          ].join('\n');

          expect(
            publicCopy,
            `${publicPage.name} contains unsupported product copy`
          ).not.toMatch(
            /video|视频|reference (image|photo)|参考图|参考图片|上传照片|priority generation queue|优先生成队列/i
          );
        });
      }
    });
  }

  test('renders localized homepage and pricing details in both languages', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '常见问题' })).toBeVisible();
    await expect(page.getByText('默认私密', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Private by default', { exact: true })
    ).toHaveCount(0);

    await page.goto('/en');
    await expect(page.getByRole('heading', { name: 'FAQ' })).toBeVisible();
    await expect(
      page.getByText('Private by default', { exact: true })
    ).toBeVisible();

    await page.goto('/launch-pricing');
    await expect(page.getByTestId('launch-cta-monthly')).toContainText(
      '选择方案'
    );
    await expect(page.getByText(/立即试用|免费试用/)).toHaveCount(0);

    await page.goto('/en/launch-pricing');
    await expect(page.getByTestId('launch-cta-monthly')).toContainText(
      'Choose plan'
    );
    await expect(page.getByText(/Start trial|Free Trial/i)).toHaveCount(0);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /\/en\/launch-pricing$/);
    await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(
      3
    );
  });
});

test('localized content metadata and sitemap agree', async ({
  page,
  request,
}) => {
  for (const path of [
    '/terms',
    '/blog/create-with-templates',
    '/launch-pricing',
  ]) {
    for (const locale of locales) {
      const localized = localizedPath(path, locale);
      await page.goto(localized);
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute(
        'href',
        new RegExp(`${localized}$`)
      );
      const alternates = page.locator('link[rel="alternate"][hreflang]');
      await expect(alternates).toHaveCount(3);
    }
  }

  const response = await request.get('/sitemap.xml');
  expect(response.ok()).toBe(true);
  const xml = await response.text();
  const canonicalHref = await page
    .locator('link[rel="canonical"]')
    .getAttribute('href');
  expect(canonicalHref).not.toBeNull();
  const siteOrigin = new URL(canonicalHref as string).origin;
  for (const path of [
    '/terms',
    '/en/terms',
    '/blog/create-with-templates',
    '/en/blog/create-with-templates',
  ]) {
    expect(xml).toContain(`<loc>${siteOrigin}${path}</loc>`);
  }
});
