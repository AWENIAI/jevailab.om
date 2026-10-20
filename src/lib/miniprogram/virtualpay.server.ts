import { and, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/db';
import { miniprogramOrders } from '@/db/miniprogram.schema';
import { serverEnv } from '@/env/server';
import { logOperationalEvent } from '@/lib/observability';
import { getWechatAccessToken } from './wechat-access-token.server';
import { getWechatOpenId, getWechatSessionKey } from './auth.server';
import { hexHmacSha256 } from './crypto.server';
import { MiniProgramApiError } from './responses.server';
import { grantImageCredits, getWalletSummary } from './wallet.server';
import {
  getOrderStatusForPayment,
  getPaymentDeliveryPlan,
  getProduct,
  validatePaidOrderAmount,
} from './virtualpay-policy';
export {
  MINIPROGRAM_PRODUCTS,
  type MiniProgramProductId,
} from './virtualpay-products';

type QueryOrderResult = {
  errcode: number;
  errmsg?: string;
  order?: {
    order_id: string;
    status: number;
    order_fee?: number;
    paid_fee?: number;
    wx_order_id?: string;
    paid_time?: number;
  };
};

function getPayConfig() {
  const offerId = serverEnv.WECHAT_VIRTUAL_PAY_OFFER_ID;
  const appKey = serverEnv.WECHAT_VIRTUAL_PAY_APP_KEY;
  if (!offerId || !appKey) {
    throw new MiniProgramApiError('PAYMENT_UNAVAILABLE', '虚拟支付尚未配置');
  }
  return {
    offerId,
    appKey,
    env: Number(serverEnv.WECHAT_VIRTUAL_PAY_ENV) === 1 ? 1 : 0,
  };
}

function createOutTradeNo(): string {
  return `mp${Date.now().toString(36)}${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export async function createVirtualPayOrder(
  userId: string,
  input: Record<string, unknown>
) {
  const product = getProduct(input.productId);
  if (!product) {
    throw new MiniProgramApiError('BAD_REQUEST', '额度包不存在');
  }
  const config = getPayConfig();
  const openid = await getWechatOpenId(userId);
  const sessionKey = await getWechatSessionKey(userId);
  const outTradeNo = createOutTradeNo();
  const signData = JSON.stringify({
    offerId: config.offerId,
    buyQuantity: 1,
    env: config.env,
    currencyType: 'CNY',
    productId: product.productId,
    goodsPrice: product.priceFen,
    outTradeNo,
    attach: userId,
  });
  const paySig = await hexHmacSha256(
    config.appKey,
    `requestVirtualPayment&${signData}`
  );
  const signature = await hexHmacSha256(sessionKey, signData);
  const now = new Date();
  await getDb().insert(miniprogramOrders).values({
    id: crypto.randomUUID(),
    outTradeNo,
    userId,
    openid,
    productId: product.productId,
    credits: product.credits,
    priceFen: product.priceFen,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  });
  return {
    outTradeNo,
    productId: product.productId,
    productName: product.name,
    credits: product.credits,
    priceFen: product.priceFen,
    priceText: product.priceText,
    status: 'PENDING',
    payData: {
      signData,
      mode: 'short_series_goods',
      paySig,
      signature,
    },
  };
}

async function queryOrder(
  openid: string,
  outTradeNo: string
): Promise<QueryOrderResult> {
  const config = getPayConfig();
  const body = JSON.stringify({
    openid,
    env: config.env,
    order_id: outTradeNo,
  });
  const paySig = await hexHmacSha256(
    config.appKey,
    `/xpay/query_order&${body}`
  );
  const accessToken = await getWechatAccessToken();
  const url = `https://api.weixin.qq.com/xpay/query_order?access_token=${encodeURIComponent(accessToken)}&pay_sig=${encodeURIComponent(paySig)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!response.ok) {
    throw new MiniProgramApiError(
      'PAYMENT_UNAVAILABLE',
      '微信查单服务暂不可用'
    );
  }
  const payload = (await response.json()) as QueryOrderResult;
  if (payload.errcode !== 0) {
    logOperationalEvent.warn('wechat virtual pay query failed', {
      errcode: payload.errcode,
    });
    throw new MiniProgramApiError(
      'PAYMENT_UNAVAILABLE',
      payload.errmsg ?? '微信查单失败'
    );
  }
  return payload;
}

async function markDelivered(
  outTradeNo: string,
  query: QueryOrderResult,
  notifyPayload?: string
) {
  const db = getDb();
  const [order] = await db
    .select()
    .from(miniprogramOrders)
    .where(eq(miniprogramOrders.outTradeNo, outTradeNo))
    .limit(1);
  if (!order) {
    throw new MiniProgramApiError('NOT_FOUND', '订单不存在');
  }
  const plan = getPaymentDeliveryPlan(query);
  const wxOrderId = plan.wxOrderId;
  if (plan.kind !== 'paid') {
    await db
      .update(miniprogramOrders)
      .set({
        wxOrderId: wxOrderId ?? order.wxOrderId,
        status: getOrderStatusForPayment(plan),
        notifyPayload: notifyPayload ?? order.notifyPayload,
        updatedAt: new Date(),
      })
      .where(eq(miniprogramOrders.id, order.id));
    return {
      status: getOrderStatusForPayment(plan),
      credited: false,
    };
  }

  if (
    !validatePaidOrderAmount({
      expectedPriceFen: order.priceFen,
      orderFee: query.order?.order_fee,
      paidFee: query.order?.paid_fee,
    })
  ) {
    logOperationalEvent.warn('miniprogram payment amount mismatch', {
      outTradeNo,
      expectedPriceFen: order.priceFen,
      orderFee: query.order?.order_fee,
      paidFee: query.order?.paid_fee,
    });
    await db
      .update(miniprogramOrders)
      .set({
        wxOrderId: wxOrderId ?? order.wxOrderId,
        status: 'AMOUNT_MISMATCH',
        notifyPayload: notifyPayload ?? order.notifyPayload,
        updatedAt: new Date(),
      })
      .where(eq(miniprogramOrders.id, order.id));
    throw new MiniProgramApiError(
      'PAYMENT_UNAVAILABLE',
      '支付金额校验失败，已停止发货'
    );
  }

  const grant = await grantImageCredits({
    userId: order.userId,
    credits: order.credits,
    eventKey: `pay:${order.outTradeNo}`,
    reason: `${order.productId} 创作额度包`,
  });
  await db
    .update(miniprogramOrders)
    .set({
      wxOrderId: wxOrderId ?? order.wxOrderId,
      status: 'DELIVERED',
      deliveredAt: new Date(),
      notifyPayload: notifyPayload ?? order.notifyPayload,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(miniprogramOrders.id, order.id),
        inArray(miniprogramOrders.status, ['PENDING', 'AMOUNT_MISMATCH'])
      )
    );
  return {
    status: 'DELIVERED',
    credited: grant.credited,
    wallet: await getWalletSummary(order.userId),
  };
}

async function updateOrderFromRefundQuery(
  order: typeof miniprogramOrders.$inferSelect,
  query: QueryOrderResult,
  notifyPayload?: string
) {
  const plan = getPaymentDeliveryPlan(query);
  if (plan.kind !== 'refunded' && plan.kind !== 'refund_failed') {
    return null;
  }
  const status = getOrderStatusForPayment(plan);
  await getDb()
    .update(miniprogramOrders)
    .set({
      wxOrderId: plan.wxOrderId ?? order.wxOrderId,
      status,
      notifyPayload: notifyPayload ?? order.notifyPayload,
      updatedAt: new Date(),
    })
    .where(eq(miniprogramOrders.id, order.id));
  return status;
}

export async function queryAndDeliverOrder(userId: string, outTradeNo: string) {
  const [order] = await getDb()
    .select()
    .from(miniprogramOrders)
    .where(
      and(
        eq(miniprogramOrders.outTradeNo, outTradeNo),
        eq(miniprogramOrders.userId, userId)
      )
    )
    .limit(1);
  if (!order) throw new MiniProgramApiError('NOT_FOUND', '订单不存在');
  if (order.status === 'DELIVERED') {
    try {
      const query = await queryOrder(order.openid, outTradeNo);
      const refundStatus = await updateOrderFromRefundQuery(order, query);
      if (refundStatus) {
        return {
          outTradeNo,
          status: refundStatus,
          delivered: false,
          paid: false,
          wallet: await getWalletSummary(userId),
        };
      }
    } catch (error) {
      // A delivered order must remain usable when the optional refund refresh
      // is temporarily unavailable. The payment push will retry separately.
      logOperationalEvent.warn(
        'miniprogram delivered order refund refresh failed',
        error
      );
    }
    return {
      outTradeNo,
      status: 'DELIVERED',
      delivered: true,
      paid: true,
      wallet: await getWalletSummary(userId),
    };
  }
  const query = await queryOrder(order.openid, outTradeNo);
  const result = await markDelivered(outTradeNo, query);
  return {
    outTradeNo,
    status: result.status,
    delivered: result.status === 'DELIVERED',
    paid: result.status === 'DELIVERED',
    wallet:
      result.status === 'DELIVERED'
        ? await getWalletSummary(userId)
        : undefined,
  };
}

export async function listVirtualPayOrders(userId: string) {
  const rows = await getDb()
    .select()
    .from(miniprogramOrders)
    .where(eq(miniprogramOrders.userId, userId))
    .orderBy(desc(miniprogramOrders.createdAt))
    .limit(50);
  return {
    items: rows.map((row) => ({
      id: row.id,
      outTradeNo: row.outTradeNo,
      productId: row.productId,
      credits: row.credits,
      priceFen: row.priceFen,
      priceText: `¥${(row.priceFen / 100).toFixed(2)}`,
      status: row.status,
      createdAt: row.createdAt.getTime(),
      deliveredAt: row.deliveredAt?.getTime() ?? null,
    })),
  };
}

export async function deliverFromNotify(
  outTradeNo: string,
  openid: string,
  payload: string,
  platformOrderId?: string
) {
  const [order] = await getDb()
    .select()
    .from(miniprogramOrders)
    .where(eq(miniprogramOrders.outTradeNo, outTradeNo))
    .limit(1);
  if (!order) {
    logOperationalEvent.warn('miniprogram payment notify unknown order', {
      outTradeNo,
    });
    return { ok: false as const, retryable: false };
  }
  if (order.openid !== openid) {
    logOperationalEvent.warn('miniprogram payment notify openid mismatch', {
      outTradeNo,
    });
    return { ok: false as const, retryable: false };
  }
  if (order.status === 'DELIVERED') {
    try {
      const query = await queryOrder(order.openid, order.outTradeNo);
      await updateOrderFromRefundQuery(order, query, payload);
    } catch (error) {
      // The delivery itself is already complete; do not make the platform
      // resend a delivery notification just because refund lookup failed.
      logOperationalEvent.warn(
        'miniprogram delivered order refund refresh failed',
        error
      );
    }
    return { ok: true as const, credited: false };
  }
  const query = await queryOrder(order.openid, order.outTradeNo);
  if (
    platformOrderId &&
    query.order?.wx_order_id &&
    query.order.wx_order_id !== platformOrderId
  ) {
    logOperationalEvent.warn(
      'miniprogram payment notify platform order mismatch',
      { outTradeNo }
    );
    return { ok: false as const, retryable: false };
  }
  const result = await markDelivered(order.outTradeNo, query, payload);
  return {
    ok: result.status === 'DELIVERED' || result.status === 'PENDING',
    credited:
      result.status === 'DELIVERED' && 'credited' in result
        ? result.credited
        : false,
  };
}

export async function syncRefundFromNotify(
  outTradeNo: string,
  openid: string,
  payload: string,
  platformOrderId?: string
) {
  const [order] = await getDb()
    .select()
    .from(miniprogramOrders)
    .where(eq(miniprogramOrders.outTradeNo, outTradeNo))
    .limit(1);
  if (!order) {
    logOperationalEvent.warn('miniprogram refund notify unknown order', {
      outTradeNo,
    });
    return { ok: false as const, retryable: false };
  }
  if (order.openid !== openid) {
    logOperationalEvent.warn('miniprogram refund notify openid mismatch', {
      outTradeNo,
    });
    return { ok: false as const, retryable: false };
  }

  const query = await queryOrder(order.openid, order.outTradeNo);
  if (
    platformOrderId &&
    query.order?.wx_order_id &&
    query.order.wx_order_id !== platformOrderId
  ) {
    logOperationalEvent.warn(
      'miniprogram refund notify platform order mismatch',
      { outTradeNo }
    );
    return { ok: false as const, retryable: false };
  }

  const status = await updateOrderFromRefundQuery(order, query, payload);
  if (!status) {
    // A refund push can arrive before query_order reflects the terminal state.
    // Acknowledge it, but never alter wallet credits from a refund event.
    logOperationalEvent.info('miniprogram refund notify pending', {
      outTradeNo,
      queryStatus: query.order?.status,
    });
    return { ok: true as const, updated: false };
  }
  return { ok: true as const, updated: true, status };
}
