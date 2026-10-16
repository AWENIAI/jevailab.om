import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

export const imageTemplates = sqliteTable(
  'image_templates',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    tagsJson: text('tags_json').notNull(),
    description: text('description').notNull(),
    coverUrl: text('cover_url').notNull(),
    exampleUrl: text('example_url').notNull(),
    inputPolicy: text('input_policy').notNull(),
    defaultMode: text('default_mode').notNull(),
    defaultRatio: text('default_ratio').notNull(),
    defaultCount: integer('default_count').notNull(),
    revision: integer('revision').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    basePrompt: text('base_prompt').notNull(),
    negativePrompt: text('negative_prompt').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('image_templates_enabled_idx').on(table.enabled, table.sortOrder)]
);

export const imageAssets = sqliteTable(
  'image_assets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull(),
    sourceFilename: text('source_filename').notNull(),
    mediaType: text('media_type').notNull(),
    byteSize: integer('byte_size').notNull(),
    width: integer('width'),
    height: integer('height'),
    state: text('state').notNull(),
    moderationVersion: text('moderation_version'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    uniqueIndex('image_assets_storage_key_unique').on(table.storageKey),
    index('image_assets_user_created_idx').on(table.userId, table.createdAt),
  ]
);

export const imageWallets = sqliteTable('image_wallets', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  availableCredits: integer('available_credits').notNull().default(0),
  reservedCredits: integer('reserved_credits').notNull().default(0),
  version: integer('version').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const imageQuotes = sqliteTable(
  'image_quotes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    templateId: text('template_id'),
    templateRevision: integer('template_revision'),
    referenceAssetId: text('reference_asset_id').references(() => imageAssets.id),
    paramsHash: text('params_hash').notNull(),
    mode: text('mode').notNull(),
    ratio: text('ratio').notNull(),
    resolvedRatio: text('resolved_ratio').notNull(),
    outputCount: integer('output_count').notNull(),
    unitCredits: integer('unit_credits').notNull(),
    totalCredits: integer('total_credits').notNull(),
    priceVersion: text('price_version').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('image_quotes_user_created_idx').on(table.userId, table.createdAt)]
);

export const imageGenerationJobs = sqliteTable(
  'image_generation_jobs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    quoteId: text('quote_id').notNull().references(() => imageQuotes.id),
    idempotencyKey: text('idempotency_key').notNull(),
    paramsHash: text('params_hash').notNull(),
    templateId: text('template_id'),
    templateRevision: integer('template_revision'),
    referenceAssetId: text('reference_asset_id').references(() => imageAssets.id),
    mode: text('mode').notNull(),
    ratio: text('ratio').notNull(),
    resolvedRatio: text('resolved_ratio').notNull(),
    requestedCount: integer('requested_count').notNull(),
    deliveredCount: integer('delivered_count').notNull().default(0),
    unitCredits: integer('unit_credits').notNull(),
    reservedCredits: integer('reserved_credits').notNull(),
    chargedCredits: integer('charged_credits').notNull().default(0),
    releasedCredits: integer('released_credits').notNull().default(0),
    priceVersion: text('price_version').notNull(),
    status: text('status').notNull(),
    internalRequestSnapshot: text('internal_request_snapshot').notNull(),
    userPromptSnapshot: text('user_prompt_snapshot').notNull(),
    policyVersion: text('policy_version').notNull(),
    consentAcceptedAt: integer('consent_accepted_at', { mode: 'timestamp_ms' }).notNull(),
    providerRequestId: text('provider_request_id'),
    errorCode: text('error_code'),
    settledAt: integer('settled_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    uniqueIndex('image_jobs_user_idempotency_unique').on(table.userId, table.idempotencyKey),
    index('image_jobs_user_created_idx').on(table.userId, table.createdAt),
    index('image_jobs_status_idx').on(table.status, table.createdAt),
  ]
);

export const imageGenerationOutputs = sqliteTable(
  'image_generation_outputs',
  {
    id: text('id').primaryKey(),
    jobId: text('job_id').notNull().references(() => imageGenerationJobs.id, { onDelete: 'cascade' }),
    sequenceNo: integer('sequence_no').notNull(),
    state: text('state').notNull(),
    quarantineStorageKey: text('quarantine_storage_key'),
    privateStorageKey: text('private_storage_key'),
    width: integer('width'),
    height: integer('height'),
    mediaType: text('media_type'),
    providerRequestId: text('provider_request_id'),
    moderationVersion: text('moderation_version'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('image_outputs_job_sequence_unique').on(table.jobId, table.sequenceNo),
    index('image_outputs_job_idx').on(table.jobId),
  ]
);

export const imageCreditLedger = sqliteTable(
  'image_credit_ledger',
  {
    id: text('id').primaryKey(),
    eventKey: text('event_key').notNull(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    jobId: text('job_id').references(() => imageGenerationJobs.id),
    eventType: text('event_type').notNull(),
    availableDelta: integer('available_delta').notNull().default(0),
    reservedDelta: integer('reserved_delta').notNull().default(0),
    availableAfter: integer('available_after').notNull(),
    reservedAfter: integer('reserved_after').notNull(),
    reason: text('reason'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('image_ledger_event_key_unique').on(table.eventKey),
    index('image_ledger_user_created_idx').on(table.userId, table.createdAt),
  ]
);
