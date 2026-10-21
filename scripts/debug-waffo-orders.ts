import { WaffoPancake } from '@waffo/pancake-ts';
import { loadEnv } from 'vite';

const fileEnv = loadEnv('development', process.cwd(), '');
const runtimeEnv = { ...fileEnv, ...process.env };
const merchantId = runtimeEnv.WAFFO_MERCHANT_ID;
const privateKey = runtimeEnv.WAFFO_PRIVATE_KEY;
let storeId = runtimeEnv.WAFFO_STORE_ID;

if (!merchantId) throw new Error('WAFFO_MERCHANT_ID is not set');
if (!privateKey) throw new Error('WAFFO_PRIVATE_KEY is not set');

const client = new WaffoPancake({ merchantId, privateKey });

if (!storeId) {
  const storesResult = await client.graphql.query<{
    stores: Array<{ id: string; name: string; status: string }>;
  }>({
    query: 'query { stores { id name status } }',
  });
  const stores = storesResult.data?.stores ?? [];
  if (stores.length === 0) throw new Error('No Waffo stores found');
  if (stores.length > 1)
    throw new Error('Multiple Waffo stores found; set WAFFO_STORE_ID');
  storeId = stores[0]!.id;
  console.log('resolvedStoreId', storeId);
}

const storeWebhooks = await client.graphql.query<{
  store: {
    storeWebhooks: Array<{
      id: string;
      channel: string;
      url: string;
      events: string[];
      testMode: boolean;
      status: string;
    }> | null;
  };
}>({
  query: `query ($storeId: String!) {
    store(id: $storeId) {
      storeWebhooks { id channel url events testMode createdAt updatedAt }
    }
  }`,
  variables: { storeId },
});

console.log('storeWebhooks');
for (const hook of storeWebhooks.data?.store?.storeWebhooks ?? []) {
  console.log(JSON.stringify(hook));
}

type WebhookDelivery = {
  id: string;
  eventType: string;
  eventId: string;
  webhookUrl: string;
  status: string;
  httpStatus: number | null;
  responseBody: string | null;
  attemptCount: number;
  createdAt: string;
};

type OrderSummary = {
  id: string;
  status: string;
  buyerEmail: string;
  metadata?: string | null;
  createdAt: string;
};

const webhookResult = await client.graphql.query<{
  webhookDeliveries: WebhookDelivery[];
  webhookDeliveriesCount: number;
}>({
  query: `query ($storeId: String!) {
    webhookDeliveries(storeId: $storeId, limit: 20) {
      id eventType eventId webhookUrl status httpStatus responseBody attemptCount createdAt
    }
    webhookDeliveriesCount(storeId: $storeId)
  }`,
  variables: { storeId },
});

console.log(
  'webhookDeliveriesCount',
  webhookResult.data?.webhookDeliveriesCount
);
for (const delivery of webhookResult.data?.webhookDeliveries ?? []) {
  console.log(
    JSON.stringify({
      id: delivery.id,
      eventType: delivery.eventType,
      eventId: delivery.eventId,
      status: delivery.status,
      httpStatus: delivery.httpStatus,
      responseBody: delivery.responseBody,
      attemptCount: delivery.attemptCount,
      createdAt: delivery.createdAt,
    })
  );
}

const onetimeOrders = await client.graphql.query<{
  onetimeOrders: OrderSummary[];
}>({
  query: `query ($storeId: String!) {
    onetimeOrders(storeId: $storeId, limit: 10) {
      id status testMode orderMerchantExternalId metadata buyerEmail createdAt
    }
  }`,
  variables: { storeId },
});

console.log('onetimeOrders');
for (const order of onetimeOrders.data?.onetimeOrders ?? []) {
  console.log(JSON.stringify(order));
}

const subscriptionOrders = await client.graphql.query<{
  subscriptionOrders: OrderSummary[];
}>({
  query: `query ($storeId: String!) {
    subscriptionOrders(storeId: $storeId, limit: 10) {
      id status createdAt
    }
  }`,
  variables: { storeId },
});

console.log('subscriptionOrders');
for (const order of subscriptionOrders.data?.subscriptionOrders ?? []) {
  console.log(JSON.stringify(order));
}
