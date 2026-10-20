import { describe, expect, test } from 'vitest';
import { getImageCreatorQuote } from '@/lib/image-creator/pricing';
import {
  getOrderStatusForPayment,
  getPaymentDeliveryPlan,
  getProduct,
  validatePaidOrderAmount,
} from '@/lib/miniprogram/virtualpay-policy';
import {
  getFalModelForInput,
  buildFalImageInput,
} from '@/lib/miniprogram/image-provider.server';

describe('mini program image pricing', () => {
  test('charges 1K and 2K per delivered image', () => {
    expect(getImageCreatorQuote({ mode: '1K_SD', count: 4 })).toMatchObject({
      unitCredits: 2,
      totalCredits: 8,
    });
    expect(getImageCreatorQuote({ mode: '2K_HD', count: 4 })).toMatchObject({
      unitCredits: 5,
      totalCredits: 20,
    });
  });
});

describe('mini program fal requests', () => {
  test('caps a single request at four images', () => {
    expect(
      buildFalImageInput({
        prompt: 'portrait',
        mode: '2K_HD',
        ratio: '3:4',
        count: 9,
      }).num_images
    ).toBe(4);
  });

  test('uses the edit endpoint only when a reference image is supplied', () => {
    expect(
      getFalModelForInput({
        prompt: 'portrait',
        mode: '1K_SD',
        ratio: '3:4',
        count: 1,
      })
    ).toBe('fal-ai/nano-banana-pro');
    expect(
      getFalModelForInput({
        prompt: 'portrait',
        mode: '1K_SD',
        ratio: '3:4',
        count: 1,
        referenceImageUrl: 'https://example.com/reference.jpg',
      })
    ).toBe('fal-ai/nano-banana-pro/edit');
  });
});

describe('mini program virtual payment policy', () => {
  test('exposes the configured credit packages and prices', () => {
    expect(getProduct('quota_60')).toMatchObject({
      credits: 60,
      priceFen: 990,
    });
    expect(getProduct('quota_200')).toMatchObject({
      credits: 200,
      priceFen: 2990,
    });
    expect(getProduct('quota_600')).toMatchObject({
      credits: 600,
      priceFen: 7990,
    });
  });

  test('accepts only a paid order whose paid and order fees match', () => {
    expect(
      validatePaidOrderAmount({
        expectedPriceFen: 990,
        orderFee: 990,
        paidFee: 990,
      })
    ).toBe(true);
    expect(
      validatePaidOrderAmount({
        expectedPriceFen: 990,
        orderFee: 1,
        paidFee: 1,
      })
    ).toBe(false);
    expect(
      validatePaidOrderAmount({
        expectedPriceFen: 990,
        orderFee: 990,
        paidFee: undefined,
      })
    ).toBe(false);
  });

  test('maps paid, pending, closed, refunded, and refund-failed query states', () => {
    expect(
      getPaymentDeliveryPlan({
        order: { status: 2, wx_order_id: 'wx_1' },
      })
    ).toEqual({ kind: 'paid', wxOrderId: 'wx_1' });
    expect(getPaymentDeliveryPlan({ order: { status: 1 } })).toEqual({
      kind: 'pending',
      wxOrderId: null,
    });
    expect(
      getOrderStatusForPayment(
        getPaymentDeliveryPlan({
          order: { status: 6 },
        })
      )
    ).toBe('CLOSED');
    expect(
      getOrderStatusForPayment(
        getPaymentDeliveryPlan({
          order: { status: 8 },
        })
      )
    ).toBe('REFUNDED');
    expect(
      getOrderStatusForPayment(
        getPaymentDeliveryPlan({
          order: { status: 7 },
        })
      )
    ).toBe('REFUND_FAILED');
    expect(
      getOrderStatusForPayment(
        getPaymentDeliveryPlan({
          order: { status: 5 },
        })
      )
    ).toBe('REFUNDED');
  });
});
