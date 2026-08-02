import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createCheckout: vi.fn(),
}));

vi.mock('creem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('creem')>();
  return {
    ...actual,
    Creem: class {
      checkouts = {
        create: mocks.createCheckout,
      };
    },
  };
});

vi.mock('@/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@/notification', () => ({
  sendPaymentNotification: vi.fn(),
}));

import { CreemProvider } from '@/payment/provider/creem';

describe('Creem provider boundary', () => {
  beforeEach(() => {
    process.env.CREEM_API_KEY = 'key_test';
    process.env.CREEM_WEBHOOK_SECRET = 'whsec_test';
    mocks.createCheckout.mockReset();
    mocks.createCheckout.mockResolvedValue({
      id: 'CHK_test',
      checkoutUrl: 'https://checkout.creem.io/pay/CHK_test',
    });
  });

  test('creates a hosted Creem checkout session', async () => {
    const provider = new CreemProvider();

    await expect(
      provider.createCheckout({
        planId: 'pro',
        priceId: 'PROD_monthly',
        customerEmail: 'buyer@example.com',
      })
    ).resolves.toEqual({
      id: 'CHK_test',
      url: 'https://checkout.creem.io/pay/CHK_test',
    });

    expect(mocks.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'PROD_monthly',
        successUrl: '',
        requestId: expect.any(String),
        metadata: {},
      })
    );
  });

  test('appends the site theme to the hosted checkout URL', async () => {
    const provider = new CreemProvider();

    const dark = await provider.createCheckout({
      planId: 'pro',
      priceId: 'PROD_monthly',
      customerEmail: 'buyer@example.com',
      theme: 'dark',
    });
    expect(dark.url).toBe('https://checkout.creem.io/pay/CHK_test?theme=dark');

    mocks.createCheckout.mockResolvedValue({
      id: 'CHK_test',
      checkoutUrl:
        'https://checkout.creem.io/pay/CHK_test?discount_code=LAUNCH50',
    });

    const light = await provider.createCheckout({
      planId: 'pro',
      priceId: 'PROD_monthly',
      customerEmail: 'buyer@example.com',
      theme: 'light',
    });
    expect(light.url).toBe(
      'https://checkout.creem.io/pay/CHK_test?discount_code=LAUNCH50&theme=light'
    );
  });
});
