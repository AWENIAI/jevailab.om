import { expect, test } from '@playwright/test';
import { cleanupE2EUsers, registerE2EUser } from '../fixtures/auth';

test.describe('image creator draft handoff', () => {
  test.beforeAll(async ({ request }) => {
    await cleanupE2EUsers(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupE2EUsers(request);
  });

  test('guest edits locally without uploading', async ({ page }) => {
    let referenceUploadRequests = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().includes('_serverFn')) {
        const body = request.postData() ?? '';
        if (body.includes('uploadImageCreatorReference')) {
          referenceUploadRequests += 1;
        }
      }
    });

    await page.goto('/#create');
    const creator = page.getByTestId('image-creator-form');
    await expect(creator).toBeVisible();

    await page
      .getByRole('button', { name: '蓝天跃动艺术海报', exact: true })
      .click();
    await creator.getByTestId('image-creator-reference').setInputFiles({
      name: 'reference.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64'
      ),
    });
    await creator.locator('textarea').fill('warm summer light');
    await creator.getByRole('button', { name: '16:9' }).click();
    await creator.getByRole('checkbox').check();

    await expect(creator.getByText('reference.png').first()).toBeVisible();
    await expect(creator.locator('img[alt="reference.png"]')).toBeVisible();
    await expect(creator.getByTestId('image-creator-submit')).toBeEnabled();
    expect(referenceUploadRequests).toBe(0);
  });

  test('generate resumes after sign-in', async ({ page, request }) => {
    const user = await registerE2EUser(request);

    await page.goto('/#create');
    const creator = page.getByTestId('image-creator-form');
    await page
      .getByRole('button', { name: '蓝天跃动艺术海报', exact: true })
      .click();
    await creator.getByTestId('image-creator-reference').setInputFiles({
      name: 'reference.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64'
      ),
    });
    await creator.locator('textarea').fill('warm summer light');
    await creator.getByRole('button', { name: '16:9' }).click();
    await creator.getByRole('checkbox').check();

    const loginNavigation = page.waitForURL(/\/auth\/login\?callbackUrl=/);
    await creator.getByTestId('image-creator-submit').click();
    await loginNavigation;

    const authSwitchLink = page
      .getByTestId('auth-card-footer')
      .getByRole('link');
    await expect(authSwitchLink).toHaveAttribute(
      'href',
      '/auth/register?callbackUrl=%2F%3Fcreate%3D1'
    );
    await page.getByRole('link', { name: '注册' }).click();
    await expect(page).toHaveURL(/\/auth\/register\?callbackUrl=/);
    await page.getByRole('link', { name: '登录' }).click();
    await expect(page).toHaveURL(/\/auth\/login\?callbackUrl=/);

    const loginForm = page
      .locator('form')
      .filter({ has: page.locator('input[name="email"]') });
    await expect(loginForm).toBeVisible();
    await page.waitForLoadState('networkidle');
    await loginForm.locator('input[name="email"]').fill(user.email);
    await loginForm.locator('input[name="password"]').fill(user.password);
    await expect(loginForm.locator('input[name="email"]')).toHaveValue(
      user.email
    );
    await expect(loginForm.locator('input[name="password"]')).toHaveValue(
      user.password
    );
    await loginForm.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/\?create=1$/);
    await expect(creator.locator('textarea')).toHaveValue('warm summer light');
    await expect(creator.getByRole('button', { name: '16:9' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(creator.getByRole('checkbox')).toBeChecked();
    await expect(creator.locator('img[alt="reference.png"]')).toBeVisible();
  });
});
