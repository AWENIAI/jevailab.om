import { MINIPROGRAM_PRODUCTS } from './virtualpay-products';

export type VirtualPayQueryOrder = {
  order?: {
    status?: number;
    order_fee?: number;
    paid_fee?: number;
    wx_order_id?: string;
  };
};

export type PaymentDeliveryPlan =
  | {
      kind: 'paid';
      wxOrderId: string | null;
    }
  | {
      kind: 'pending' | 'closed' | 'refunded';
      wxOrderId: string | null;
    };

export function getProduct(productId: unknown) {
  if (typeof productId !== 'string') return undefined;
  return MINIPROGRAM_PRODUCTS.find(
    (product) => product.productId === productId
  );
}

export function getPaymentDeliveryPlan(
  query: VirtualPayQueryOrder
): PaymentDeliveryPlan {
  const order = query.order;
  const status = order?.status;
  const wxOrderId = order?.wx_order_id ?? null;
  if (status === 2) {
    return { kind: 'paid', wxOrderId };
  }
  if (status === 3 || status === 4) {
    return { kind: 'paid', wxOrderId };
  }
  if (status === 6) return { kind: 'closed', wxOrderId };
  if (status === 5 || status === 7 || status === 8) {
    return { kind: 'refunded', wxOrderId };
  }
  return { kind: 'pending', wxOrderId };
}

export function validatePaidOrderAmount({
  expectedPriceFen,
  orderFee,
  paidFee,
}: {
  expectedPriceFen: number;
  orderFee?: number;
  paidFee?: number;
}): boolean {
  return (
    Number.isSafeInteger(expectedPriceFen) &&
    expectedPriceFen > 0 &&
    Number.isSafeInteger(orderFee) &&
    orderFee === expectedPriceFen &&
    Number.isSafeInteger(paidFee) &&
    paidFee === expectedPriceFen
  );
}

export function getOrderStatusForPayment(
  plan: PaymentDeliveryPlan
): 'PENDING' | 'CLOSED' | 'REFUNDED' {
  if (plan.kind === 'closed') return 'CLOSED';
  if (plan.kind === 'refunded') return 'REFUNDED';
  return 'PENDING';
}
