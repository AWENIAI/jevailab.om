import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  update: vi.fn(),
  insert: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
  values: vi.fn(),
}));

vi.mock('@/db', () => ({
  getDb: () => dbMocks,
}));

vi.mock('@/notification', () => ({
  sendPaymentNotification: vi.fn(),
}));

import { CreemProvider } from '@/payment/provider/creem';
import { handleCreemWebhookRequest } from '@/routes/api/webhooks/creem';

const WEBHOOK_SECRET = 'whsec_creem_route_test';

function sign(payload: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
}

function creemRequest(payload: string, signature?: string): Request {
  const headers: Record<string, string> = {};
  if (signature) headers['creem-signature'] = signature;
  return new Request('https://example.com/api/webhooks/creem', {
    method: 'POST',
    body: payload,
    headers,
  });
}

function dependencies(provider: CreemProvider) {
  return {
    isPaymentEnabled: () => true,
    getPaymentProviderName: () => 'creem' as const,
    handleWebhookEvent: provider.handleWebhookEvent.bind(provider),
  };
}

// Signed but unhandled event type: parses, hits the default branch, no DB.
const unhandledPayload = JSON.stringify({
  id: 'evt_unhandled',
  eventType: 'subscription.unknown',
  created_at: 1_757_000_000,
  object: {},
});

const timestamp = '2026-09-05T00:00:00.000Z';
const checkoutPayload = JSON.stringify({
  id: 'evt_checkout_completed',
  eventType: 'checkout.completed',
  created_at: Date.parse(timestamp),
  object: {
    id: 'CHK_test',
    mode: 'test',
    object: 'checkout',
    status: 'completed',
    request_id: 'checkout_dedup_key',
    metadata: { userId: 'user_buyer' },
    product: {
      id: 'PROD_lifetime',
      mode: 'test',
      object: 'product',
      name: 'Lifetime',
      description: 'Lifetime plan',
      price: 19900,
      currency: 'USD',
      billing_type: 'onetime',
      billing_period: 'once',
      status: 'active',
      tax_mode: 'inclusive',
      tax_category: 'saas',
      created_at: timestamp,
      updated_at: timestamp,
    },
    customer: {
      id: 'cus_creem_buyer',
      mode: 'test',
      object: 'customer',
      email: 'buyer@example.com',
      country: 'US',
      created_at: timestamp,
      updated_at: timestamp,
    },
  },
});

describe('Creem webhook HTTP route', () => {
  beforeEach(() => {
    process.env.CREEM_API_KEY = 'key_test';
    process.env.CREEM_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.CREEM_DEBUG = 'true';
  });

  test('acknowledges a successfully processed signed event', async () => {
    const response = await handleCreemWebhookRequest(
      creemRequest(unhandledPayload, sign(unhandledPayload)),
      dependencies(new CreemProvider())
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(dbMocks.insert).not.toHaveBeenCalled();
    expect(dbMocks.update).not.toHaveBeenCalled();
  });

  test('rejects an invalid Creem signature without acknowledging it', async () => {
    const response = await handleCreemWebhookRequest(
      creemRequest(unhandledPayload, 'invalid-signature'),
      dependencies(new CreemProvider())
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid Creem signature',
    });
    expect(dbMocks.insert).not.toHaveBeenCalled();
    expect(dbMocks.update).not.toHaveBeenCalled();
  });

  test('rejects a missing signature header', async () => {
    const response = await handleCreemWebhookRequest(
      creemRequest(unhandledPayload),
      dependencies(new CreemProvider())
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Missing payload or signature',
    });
  });

  test('acknowledges a processing failure with 200 to avoid endless retries', async () => {
    dbMocks.update.mockReturnValue({ set: dbMocks.set });
    dbMocks.set.mockReturnValue({ where: dbMocks.where });
    dbMocks.where.mockRejectedValueOnce(
      new Error('D1_ERROR: temporary database unavailable')
    );

    const response = await handleCreemWebhookRequest(
      creemRequest(checkoutPayload, sign(checkoutPayload)),
      dependencies(new CreemProvider())
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      error: 'Webhook processing failed',
      received: true,
    });
  });
});
