import { WaffoPancake } from '@waffo/pancake-ts';
import { loadEnv } from 'vite';

const fileEnv = loadEnv('development', process.cwd(), '');
const runtimeEnv = { ...fileEnv, ...process.env };
const merchantId = runtimeEnv.WAFFO_MERCHANT_ID;
const privateKey = runtimeEnv.WAFFO_PRIVATE_KEY;
const client = new WaffoPancake({ merchantId, privateKey });

const result = await client.graphql.query<{
  onetimeProducts: Array<{
    id: string;
    name: string;
    status: string;
    hasProdVersion: boolean;
  }>;
  subscriptionProducts: Array<{
    id: string;
    name: string;
    status: string;
    billingPeriod: string;
  }>;
}>({
  query: `query {
    onetimeProducts { id name status hasProdVersion }
    subscriptionProducts { id name status billingPeriod }
  }`,
});
console.log(JSON.stringify(result.data, null, 2));
