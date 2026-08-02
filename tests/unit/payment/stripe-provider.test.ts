import Stripe from 'stripe';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  insert: vi.fn(),
  values: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}));

const providerMocks = vi.hoisted(() => ({
  findPlanByPlanId: vi.fn(),
  findPriceInPlan: vi.fn(),
  sendPaymentNotification: vi.fn(),
}));

vi.mock('@/db', () => ({
  getDb: () => dbMocks,
}));

vi.mock('@/lib/price-plan', () => ({
  findPlanByPlanId: providerMocks.findPlanByPlanId,
  findPriceInPlan: providerMocks.findPriceInPlan,
}));

vi.mock('@/notification', () => ({
  sendPaymentNotification: providerMocks.sendPaymentNotification,
}));

import { StripeProvider } from '@/payment/provider/stripe';

const WEBHOOK_SECRET = 'whsec_stripe_provider_test_secret';
const monthlyPrice = {
  type: 'subscription' as const,
  priceId: 'price_month',
  amount: 990,
  currency: 'USD',
  interval: 'month' as const,
  trialPeriodDays: 7,
};
const lifetimePrice = {
  type: 'one_time' as const,
  priceId: 'price_lifetime',
  amount: 19900,
  currency: 'USD',
  allowPromotionCode: true,
};
const proPlan = { id: 'pro', prices: [monthlyPrice] };
const lifetimePlan = { id: 'lifetime', prices: [lifetimePrice] };

type MockFunction = ReturnType<typeof vi.fn>;

type StripeClientTestDouble = {
  customers: { list: MockFunction; create: MockFunction };
  checkout: {
    sessions: { create: MockFunction; retrieve: MockFunction };
  };
  subscriptions: { retrieve: MockFunction };
  billingPortal: { sessions: { create: MockFunction } };
};

let eventNumber = 0;

function configureInsert() {
  dbMocks.insert.mockReturnValue({ values: dbMocks.values });
  dbMocks.values.mockResolvedValue(undefined);
}

function configureSelect(rows: unknown[]) {
  configureSelectSequence([rows]);
}

function configureSelectSequence(rowsList: unknown[][]) {
  for (const rows of rowsList) {
    const chain = {
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
    };
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockResolvedValue(rows);
    dbMocks.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue(chain),
    });
  }
}

function configureUpdate(rows: unknown[] = [{ id: 'payment_test' }]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  dbMocks.update.mockReturnValue({ set });
  return { set, where, returning };
}

function getStripeClient(provider: StripeProvider): StripeClientTestDouble {
  return (provider as unknown as { stripe: StripeClientTestDouble }).stripe;
}

function configureStripeClient(provider: StripeProvider) {
  const client = getStripeClient(provider);
  client.customers.list = vi.fn().mockResolvedValue({ data: [] });
  client.customers.create = vi.fn();
  client.checkout.sessions.create = vi.fn();
  client.checkout.sessions.retrieve = vi.fn();
  client.subscriptions.retrieve = vi.fn();
  client.billingPortal.sessions.create = vi.fn();
  return client;
}

function subscription(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const periodStart = 1_754_000_000;
  const periodEnd = 1_756_592_000;
  return {
    id: 'sub_test',
    object: 'subscription',
    customer: 'cus_test',
    status: 'active',
    cancel_at_period_end: false,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    trial_start: null,
    trial_end: null,
    metadata: { userId: 'user_test' },
    items: {
      data: [
        {
          price: { id: 'price_month' },
          plan: { interval: 'month' },
          current_period_start: periodStart,
          current_period_end: periodEnd,
        },
      ],
    },
    ...overrides,
  };
}

function paymentRecord(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: 'payment_test',
    priceId: 'price_month',
    userId: 'user_test',
    customerId: 'cus_test',
    subscriptionId: 'sub_test',
    sessionId: 'cs_test',
    invoiceId: 'in_test',
    type: 'subscription',
    scene: 'subscription',
    interval: 'month',
    status: 'active',
    paid: false,
    periodStart: null,
    periodEnd: null,
    cancelAtPeriodEnd: false,
    trialStart: null,
    trialEnd: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function signedEvent(type: string, object: Record<string, unknown>) {
  eventNumber += 1;
  const payload = JSON.stringify({
    id: `evt_provider_${eventNumber}`,
    object: 'event',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type,
  });
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });
  return { payload, signature };
}

async function dispatch(
  provider: StripeProvider,
  type: string,
  object: Record<string, unknown>
) {
  const event = signedEvent(type, object);
  await provider.handleWebhookEvent(event.payload, event.signature);
}

describe('Stripe provider lifecycle', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_provider_key';
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
    eventNumber = 0;

    dbMocks.insert.mockReset();
    dbMocks.values.mockReset();
    dbMocks.select.mockReset();
    dbMocks.update.mockReset();
    providerMocks.findPlanByPlanId.mockReset();
    providerMocks.findPriceInPlan.mockReset();
    providerMocks.sendPaymentNotification.mockReset();
    providerMocks.sendPaymentNotification.mockResolvedValue(undefined);

    providerMocks.findPlanByPlanId.mockImplementation((planId: string) => {
      if (planId === 'pro') return proPlan;
      if (planId === 'lifetime') return lifetimePlan;
      return undefined;
    });
    providerMocks.findPriceInPlan.mockImplementation(
      (_planId: string, priceId: string) => {
        if (priceId === monthlyPrice.priceId) return monthlyPrice;
        if (priceId === lifetimePrice.priceId) return lifetimePrice;
        return undefined;
      }
    );
    configureInsert();
  });

  test('creates a subscription checkout with metadata, locale, and trial', async () => {
    const provider = new StripeProvider();
    const stripe = configureStripeClient(provider);
    configureSelect([{ id: 'user_test' }]);
    stripe.customers.list.mockResolvedValue({
      data: [{ id: 'cus_existing' }],
    });
    stripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test',
      url: 'https://checkout.stripe.com/cs_test',
    });

    await expect(
      provider.createCheckout({
        planId: 'pro',
        priceId: 'price_month',
        customerEmail: 'buyer@example.com',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        locale: 'zh-CN',
        metadata: { userId: 'user_test', userName: 'Buyer' },
      })
    ).resolves.toEqual({
      id: 'cs_test',
      url: 'https://checkout.stripe.com/cs_test',
    });

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing',
        mode: 'subscription',
        line_items: [{ price: 'price_month', quantity: 1 }],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        locale: 'zh',
        metadata: {
          userId: 'user_test',
          userName: 'Buyer',
          planId: 'pro',
          priceId: 'price_month',
        },
        subscription_data: {
          metadata: {
            userId: 'user_test',
            userName: 'Buyer',
            planId: 'pro',
            priceId: 'price_month',
          },
          trial_period_days: 7,
        },
      })
    );
  });

  test('creates a lifetime checkout with invoice creation and payment metadata', async () => {
    const provider = new StripeProvider();
    const stripe = configureStripeClient(provider);
    configureSelect([]);
    configureUpdate([{ id: 'user_test' }]);
    stripe.customers.create.mockResolvedValue({ id: 'cus_new' });
    stripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_lifetime',
      url: 'https://checkout.stripe.com/cs_lifetime',
    });

    await provider.createCheckout({
      planId: 'lifetime',
      priceId: 'price_lifetime',
      customerEmail: 'buyer@example.com',
      metadata: { userId: 'user_test' },
    });

    expect(stripe.customers.create).toHaveBeenCalledWith({
      email: 'buyer@example.com',
      name: undefined,
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_new',
        mode: 'payment',
        allow_promotion_codes: true,
        invoice_creation: { enabled: true },
        payment_intent_data: {
          metadata: {
            userId: 'user_test',
            planId: 'lifetime',
            priceId: 'price_lifetime',
          },
        },
      })
    );
  });

  test('creates a Customer Portal session with the mapped locale', async () => {
    const provider = new StripeProvider();
    const stripe = configureStripeClient(provider);
    stripe.billingPortal.sessions.create.mockResolvedValue({
      url: 'https://billing.stripe.com/session_test',
    });

    await expect(
      provider.createCustomerPortal({
        customerId: 'cus_test',
        returnUrl: 'https://example.com/settings/billing',
        locale: 'zh-CN',
      })
    ).resolves.toEqual({
      url: 'https://billing.stripe.com/session_test',
    });
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_test',
      return_url: 'https://example.com/settings/billing',
      locale: 'zh',
    });
  });

  test('records a subscription checkout as an unpaid subscription row', async () => {
    const provider = new StripeProvider();
    const stripe = configureStripeClient(provider);
    stripe.subscriptions.retrieve.mockResolvedValue(subscription());

    await dispatch(provider, 'checkout.session.completed', {
      id: 'cs_test',
      object: 'checkout.session',
      customer: 'cus_test',
      subscription: 'sub_test',
      invoice: 'in_test',
      metadata: { userId: 'user_test', priceId: 'price_month' },
      mode: 'subscription',
    });

    expect(dbMocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cus_test',
        invoiceId: 'in_test',
        paid: false,
        priceId: 'price_month',
        scene: 'subscription',
        sessionId: 'cs_test',
        status: 'active',
        type: 'subscription',
        userId: 'user_test',
      })
    );
  });

  test('marks a subscription paid after invoice.paid', async () => {
    const provider = new StripeProvider();
    const stripe = configureStripeClient(provider);
    configureSelect([paymentRecord()]);
    const update = configureUpdate();
    stripe.subscriptions.retrieve.mockResolvedValue(subscription());

    await dispatch(provider, 'invoice.paid', {
      id: 'in_test',
      object: 'invoice',
      customer: 'cus_test',
      subscription: 'sub_test',
    });

    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({
        paid: true,
        status: 'active',
        interval: 'month',
        cancelAtPeriodEnd: false,
      })
    );
    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_test');
  });

  test('updates the existing row on a renewal invoice without a new payment row', async () => {
    const provider = new StripeProvider();
    const stripe = configureStripeClient(provider);
    configureSelectSequence([[], [paymentRecord()], [{ id: 'user_test' }]]);
    const update = configureUpdate();
    stripe.subscriptions.retrieve.mockResolvedValue(
      subscription({ metadata: {} })
    );

    await dispatch(provider, 'invoice.paid', {
      id: 'in_renewal',
      object: 'invoice',
      customer: 'cus_test',
      subscription: 'sub_test',
    });

    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({ paid: true, status: 'active' })
    );
    expect(dbMocks.insert).not.toHaveBeenCalled();
  });

  test('marks a lifetime payment paid and sends its notification after invoice.paid', async () => {
    const provider = new StripeProvider();
    const stripe = configureStripeClient(provider);
    configureSelect([
      paymentRecord({
        type: 'one_time',
        scene: 'lifetime',
        subscriptionId: null,
      }),
    ]);
    const update = configureUpdate();
    stripe.checkout.sessions.retrieve.mockResolvedValue({
      id: 'cs_test',
      metadata: { userName: 'Buyer' },
    });

    await dispatch(provider, 'invoice.paid', {
      id: 'in_test',
      object: 'invoice',
      customer: 'cus_test',
      subscription: null,
      amount_paid: 19900,
    });

    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({ paid: true, status: 'completed' })
    );
    expect(providerMocks.sendPaymentNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cus_test',
        sessionId: 'cs_test',
        userName: 'Buyer',
      })
    );
  });

  test('updates cancellation state and subscription status from webhook events', async () => {
    const provider = new StripeProvider();
    const update = configureUpdate();

    await dispatch(
      provider,
      'customer.subscription.updated',
      subscription({
        status: 'past_due',
        cancel_at_period_end: true,
      })
    );
    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'past_due',
        cancelAtPeriodEnd: true,
      })
    );

    update.set.mockClear();
    await dispatch(
      provider,
      'customer.subscription.deleted',
      subscription({ status: 'canceled' })
    );
    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'canceled' })
    );
  });

  test('revokes a lifetime payment after a full charge refund', async () => {
    const provider = new StripeProvider();
    const update = configureUpdate();

    await dispatch(provider, 'charge.refunded', {
      id: 'ch_test',
      object: 'charge',
      customer: 'cus_test',
      refunded: true,
    });

    expect(update.set).toHaveBeenCalledWith(
      expect.objectContaining({ paid: false })
    );
  });

  test('keeps lifetime access for a partial charge refund', async () => {
    const provider = new StripeProvider();
    configureUpdate();

    await dispatch(provider, 'charge.refunded', {
      id: 'ch_test',
      object: 'charge',
      customer: 'cus_test',
      refunded: false,
    });

    expect(dbMocks.update).not.toHaveBeenCalled();
  });
});
