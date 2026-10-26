import { expect, test } from '@playwright/test';
import {
  expectHealthyPage,
  installPageHealthMonitor,
  localizedPath,
  supportedLocales,
  type LocaleMode,
} from '../fixtures/page-health';

const publicPages = [
  { path: '/', name: 'home' },
  { path: '/create', name: 'AI image creator' },
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

const locales: LocaleMode[] = [...supportedLocales];

test.describe('public page smoke coverage', () => {
  test('defaults to English and light mode without the retired AI tab', async ({
    page,
  }) => {
    const monitor = installPageHealthMonitor(page);

    await expectHealthyPage(page, monitor, '/', {
      expectedPath: /\/$/,
    });

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveClass(/\blight\b/);
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
    await expect(
      page.getByRole('heading', {
        name: 'Create AI images from a template and your words',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'AI', exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'AI', exact: true })
    ).toHaveCount(0);

    await page.waitForLoadState('networkidle');
    await page.getByTestId('locale-switcher-trigger').click();
    const languageMenu = page.getByRole('menu');
    await expect(languageMenu).toBeVisible();
    await expect(languageMenu.getByRole('menuitem')).toHaveCount(2);
    await expect(
      languageMenu.getByRole('menuitem', { name: /English/ })
    ).toBeVisible();
    await expect(
      languageMenu.getByRole('menuitem', { name: /中文/ })
    ).toBeVisible();
    await languageMenu.getByRole('menuitem', { name: /中文/ }).click();
    await expect(page).toHaveURL(/\/zh\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(
      page.getByRole('heading', {
        name: '从模板与文字，创作你的 AI 图片',
      })
    ).toBeVisible();
    monitor.expectNoErrors('default locale and theme');
  });

  test('redirects explicit English locale URLs to the default path', async ({
    page,
  }) => {
    await page.goto('/en/launch-pricing');
    await expect(page).toHaveURL(/\/launch-pricing\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('permanently redirects the retired AI route to the localized homepage', async ({
    page,
    request,
  }) => {
    const englishRedirect = await request.get('/ai', {
      maxRedirects: 0,
    });
    expect(englishRedirect.status()).toBe(301);
    expect(englishRedirect.headers().location).toBe('/');

    const chineseRedirect = await request.get('/zh/ai', {
      maxRedirects: 0,
    });
    expect(chineseRedirect.status()).toBe(301);
    expect(chineseRedirect.headers().location).toBe('/zh/');

    await page.goto('/ai');
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', {
        name: 'Create AI images from a template and your words',
      })
    ).toBeVisible();

    await page.goto('/zh/ai');
    await expect(page).toHaveURL(/\/zh\/?$/);
    await expect(
      page.getByRole('heading', { name: '从模板与文字，创作你的 AI 图片' })
    ).toBeVisible();
  });

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
      mobileNavigation.getByRole('link', { name: 'AI', exact: true })
    ).toHaveCount(0);
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

  test('publishes the bilingual content-report channel and CSAM prohibition', async ({
    page,
  }) => {
    await page.goto('/terms');
    await expect(
      page.getByText(/violence, graphic injury, gore/i)
    ).toBeVisible();
    await expect(
      page.getByText(/child sexual abuse material \(CSAM\)/i)
    ).toBeVisible();
    await expect(
      page.locator(
        'a[href="mailto:support@jevailab.com?subject=Content%20Report"]'
      )
    ).toHaveAttribute(
      'href',
      /mailto:support@jevailab\.com\?subject=Content%20Report/
    );
    await expect(page.getByText(/two business days/i)).toBeVisible();

    await page.goto('/zh/terms');
    await expect(page.getByText('暴力或血腥')).toBeVisible();
    await expect(
      page.locator('li').filter({ hasText: '儿童性虐待材料' })
    ).toBeVisible();
    await expect(
      page.locator(
        'a[href="mailto:support@jevailab.com?subject=Content%20Report"]'
      )
    ).toHaveAttribute(
      'href',
      /mailto:support@jevailab\.com\?subject=Content%20Report/
    );
    await expect(page.getByText('两个工作日')).toBeVisible();
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

  test('renders localized homepage and pricing details in all languages', async ({
    page,
  }) => {
    await page.goto('/zh');
    await expect(page.getByRole('heading', { name: '常见问题' })).toBeVisible();
    await expect(page.getByText('默认私密', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Private by default', { exact: true })
    ).toHaveCount(0);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'FAQ' })).toBeVisible();
    await expect(
      page.getByText('Private by default', { exact: true })
    ).toBeVisible();

    await page.goto('/zh/launch-pricing');
    await expect(page.getByTestId('launch-cta-monthly')).toContainText(
      '立即试用'
    );
    await expect(page.getByText(/免费试用/)).toHaveCount(0);

    await page.goto('/launch-pricing');
    await expect(page.getByTestId('launch-cta-monthly')).toContainText(
      'Try now'
    );
    await expect(page.getByText(/Free Trial/i)).toHaveCount(0);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /\/launch-pricing$/);
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
    '/create',
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
  const siteOrigin = new URL(response.url()).origin;
  for (const path of [
    '/terms',
    '/zh/terms',
    '/blog/create-with-templates',
    '/zh/blog/create-with-templates',
  ]) {
    expect(xml).toContain(`<loc>${siteOrigin}${path}</loc>`);
  }
});
