import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

export const miniprogramAccounts = sqliteTable(
  'miniprogram_accounts',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    openid: text('openid').notNull(),
    unionid: text('unionid'),
    encryptedSessionKey: text('encrypted_session_key'),
    sessionKeyIv: text('session_key_iv'),
    sessionKeyUpdatedAt: integer('session_key_updated_at', {
      mode: 'timestamp_ms',
    }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('miniprogram_accounts_openid_unique').on(table.openid),
    index('miniprogram_accounts_unionid_idx').on(table.unionid),
  ]
);

export const miniprogramOrders = sqliteTable(
  'miniprogram_orders',
  {
    id: text('id').primaryKey(),
    outTradeNo: text('out_trade_no').notNull(),
    wxOrderId: text('wx_order_id'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    openid: text('openid').notNull(),
    productId: text('product_id').notNull(),
    credits: integer('credits').notNull(),
    priceFen: integer('price_fen').notNull(),
    status: text('status').notNull(),
    deliveredAt: integer('delivered_at', { mode: 'timestamp_ms' }),
    notifyPayload: text('notify_payload'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('miniprogram_orders_out_trade_no_unique').on(
      table.outTradeNo
    ),
    uniqueIndex('miniprogram_orders_wx_order_id_unique').on(table.wxOrderId),
    index('miniprogram_orders_user_created_idx').on(
      table.userId,
      table.createdAt
    ),
    index('miniprogram_orders_status_idx').on(table.status, table.createdAt),
  ]
);

export const imageDispatchOutbox = sqliteTable(
  'image_dispatch_outbox',
  {
    id: text('id').primaryKey(),
    jobId: text('job_id').notNull(),
    state: text('state').notNull(),
    attemptNo: integer('attempt_no').notNull().default(0),
    sendStartedAt: integer('send_started_at', { mode: 'timestamp_ms' }),
    leaseUntil: integer('lease_until', { mode: 'timestamp_ms' }),
    lastError: text('last_error'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('image_outbox_job_unique').on(table.jobId),
    index('image_outbox_state_idx').on(table.state, table.createdAt),
  ]
);
