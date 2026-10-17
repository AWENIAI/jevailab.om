import { and, desc, eq, lte } from 'drizzle-orm';
import { getDb } from '@/db';
import { providerPricing } from '@/db/video-creator.schema';
import type { VideoQuoteInput } from './contracts';
import { quoteVideoCreditsAtRate } from './pricing';

export async function quoteConfiguredVideoCredits(input: VideoQuoteInput) {
  const [rate] = await getDb()
    .select()
    .from(providerPricing)
    .where(
      and(
        eq(providerPricing.provider, 'kie'),
        eq(providerPricing.model, input.model),
        eq(providerPricing.resolution, input.resolution),
        eq(providerPricing.enabled, true),
        lte(providerPricing.effectiveAt, new Date())
      )
    )
    .orderBy(desc(providerPricing.effectiveAt), desc(providerPricing.createdAt))
    .limit(1);
  if (!rate) {
    throw new Error('No enabled server-side video price is available.');
  }
  return quoteVideoCreditsAtRate(input, {
    unitsPerSecond: rate.unitsPerSecond,
    billableMode: rate.billableMode === 'input' ? 'input' : 'input_and_output',
    enabled: rate.enabled,
    // Budget calculations have an independent conservative source. Pricing
    // rows stay in integer website-credit units, never browser-controlled USD.
    usdMicrosPerSecond: 0,
    priceVersion: rate.rateVersion,
  });
}
