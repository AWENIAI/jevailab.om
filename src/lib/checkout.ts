import { getPricePlans } from '@/lib/price-plan';
import type { PaymentType, PlanInterval, PricePlan } from '@/payment/types';

export type CheckoutTarget = {
  planId: string;
  priceId: string;
};

type CheckoutSelection = {
  planId: string;
  paymentType?: PaymentType;
  interval?: PlanInterval;
};

export function resolveCheckoutTarget({
  planId,
  paymentType,
  interval,
}: CheckoutSelection): CheckoutTarget | null {
  const plan = getPricePlans()[planId];
  if (!plan || plan.disabled) return null;

  const price = plan.prices.find(
    (candidate) =>
      !candidate.disabled &&
      candidate.priceId.trim() &&
      (!paymentType || candidate.type === paymentType) &&
      (!interval || candidate.interval === interval)
  );

  return price ? { planId: plan.id, priceId: price.priceId } : null;
}

export function getDefaultCheckoutTarget(): CheckoutTarget | null {
  return resolveCheckoutTarget({
    planId: 'pro',
    paymentType: 'subscription',
    interval: 'month',
  });
}

export function getCheckoutTargetForPlan(
  plan: PricePlan,
  options: Omit<CheckoutSelection, 'planId'> = {}
): CheckoutTarget | null {
  return resolveCheckoutTarget({
    planId: plan.id,
    ...options,
  });
}
