import { BillingPeriod, TaxCategory, WaffoPancake } from '@waffo/pancake-ts';
import { loadEnv } from 'vite';

/**
 * Creates jevailab's three Waffo Pancake test products.
 *
 * Required local-only variables in .env.local or the current shell:
 * WAFFO_MERCHANT_ID, WAFFO_PRIVATE_KEY, WAFFO_STORE_ID.
 *
 * Product IDs are printed so they can be copied into .env.local and the
 * GitHub Actions secrets. This script never writes secrets to disk.
 */

const fileEnv = loadEnv('development', process.cwd(), '');
const runtimeEnv = { ...fileEnv, ...process.env };
const merchantId = runtimeEnv.WAFFO_MERCHANT_ID;
const privateKey = runtimeEnv.WAFFO_PRIVATE_KEY;
const storeId = runtimeEnv.WAFFO_STORE_ID;

if (!merchantId) throw new Error('WAFFO_MERCHANT_ID is not set');
if (!privateKey) throw new Error('WAFFO_PRIVATE_KEY is not set');
if (!storeId) throw new Error('WAFFO_STORE_ID is not set');

const client = new WaffoPancake({ merchantId, privateKey });

const { product: monthly } = await client.subscriptionProducts.create({
  storeId,
  name: 'jevailab Pro Monthly (Test)',
  description: 'Monthly subscription for jevailab AI image generation.',
  billingPeriod: BillingPeriod.Monthly,
  prices: {
    USD: {
      amount: '99.90',
      taxCategory: TaxCategory.SaaS,
    },
  },
});

const { product: yearly } = await client.subscriptionProducts.create({
  storeId,
  name: 'jevailab Pro Yearly (Test)',
  description: 'Yearly subscription for jevailab AI image generation.',
  billingPeriod: BillingPeriod.Yearly,
  prices: {
    USD: {
      amount: '999.90',
      taxCategory: TaxCategory.SaaS,
    },
  },
});

const { product: lifetime } = await client.onetimeProducts.create({
  storeId,
  name: 'jevailab Lifetime (Test)',
  description: 'One-time lifetime access to jevailab AI image generation.',
  prices: {
    USD: {
      amount: '199.90',
      taxCategory: TaxCategory.SaaS,
    },
  },
});

console.log('Waffo test products created. Copy these public product IDs:');
console.log(`VITE_WAFFO_PRODUCT_PRO_MONTHLY='${monthly.id}'`);
console.log(`VITE_WAFFO_PRODUCT_PRO_YEARLY='${yearly.id}'`);
console.log(`VITE_WAFFO_PRODUCT_LIFETIME='${lifetime.id}'`);
