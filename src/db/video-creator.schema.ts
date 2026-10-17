import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

export const videoTemplates = sqliteTable(
  'video_templates',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    version: integer('version').notNull(),
    storageKey: text('storage_key').notNull(),
    previewUrl: text('preview_url'),
    durationSeconds: integer('duration_seconds').notNull(),
    aspectRatio: text('aspect_ratio').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
    authorizationStatus: text('authorization_status').notNull(),
    authorizationEvidence: text('authorization_evidence'),
    seedancePrompt: text('seedance_prompt').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('video_templates_version_unique').on(table.id, table.version),
    index('video_templates_enabled_idx').on(table.enabled, table.updatedAt),
  ]
);

export const videoTemplateLicenses = sqliteTable(
  'video_template_licenses',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id')
      .notNull()
      .references(() => videoTemplates.id, { onDelete: 'cascade' }),
    rightsHolder: text('rights_holder').notNull(),
    permittedScope: text('permitted_scope').notNull(),
    territory: text('territory').notNull(),
    startsAt: integer('starts_at', { mode: 'timestamp_ms' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    evidenceStorageKey: text('evidence_storage_key').notNull(),
    verifiedBy: text('verified_by').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('video_template_licenses_template_idx').on(table.templateId)]
);

export const videoAssets = sqliteTable(
  'video_assets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull(),
    sourceFilename: text('source_filename').notNull(),
    mediaType: text('media_type').notNull(),
    byteSize: integer('byte_size').notNull(),
    state: text('state').notNull(),
    moderationVersion: text('moderation_version'),
    authorizationAcceptedAt: integer('authorization_accepted_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    uniqueIndex('video_assets_storage_key_unique').on(table.storageKey),
    index('video_assets_user_created_idx').on(table.userId, table.createdAt),
  ]
);

export const providerPricing = sqliteTable(
  'provider_pricing',
  {
    id: text('id').primaryKey(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    resolution: text('resolution').notNull(),
    rateVersion: text('rate_version').notNull(),
    billableMode: text('billable_mode').notNull(),
    unitsPerSecond: integer('units_per_second').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
    effectiveAt: integer('effective_at', { mode: 'timestamp_ms' }).notNull(),
    checkedAt: integer('checked_at', { mode: 'timestamp_ms' }),
    changeReason: text('change_reason'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('provider_pricing_version_unique').on(
      table.model,
      table.resolution,
      table.rateVersion
    ),
  ]
);

export const videoQuotes = sqliteTable(
  'video_quotes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    templateId: text('template_id').notNull().references(() => videoTemplates.id),
    templateVersion: integer('template_version').notNull(),
    model: text('model').notNull(),
    resolution: text('resolution').notNull(),
    inputSeconds: integer('input_seconds').notNull(),
    outputSeconds: integer('output_seconds').notNull(),
    priceVersion: text('price_version').notNull(),
    quotedUnits: integer('quoted_units').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    consumedAt: integer('consumed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('video_quotes_user_created_idx').on(table.userId, table.createdAt)]
);

export const videoJobs = sqliteTable(
  'video_jobs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    quoteId: text('quote_id').notNull().references(() => videoQuotes.id),
    idempotencyKey: text('idempotency_key').notNull(),
    assetId: text('asset_id').notNull().references(() => videoAssets.id),
    templateId: text('template_id').notNull().references(() => videoTemplates.id),
    templateVersion: integer('template_version').notNull(),
    model: text('model').notNull(),
    resolution: text('resolution').notNull(),
    inputSeconds: integer('input_seconds').notNull(),
    outputSeconds: integer('output_seconds').notNull(),
    priceVersion: text('price_version').notNull(),
    quotedUnits: integer('quoted_units').notNull(),
    heldUnits: integer('held_units').notNull(),
    capturedUnits: integer('captured_units').notNull().default(0),
    releasedUnits: integer('released_units').notNull().default(0),
    status: text('status').notNull(),
    providerTaskId: text('provider_task_id'),
    providerCreditsConsumed: integer('provider_credits_consumed'),
    errorCode: text('error_code'),
    authorizationAcceptedAt: integer('authorization_accepted_at', { mode: 'timestamp_ms' }).notNull(),
    settledAt: integer('settled_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    uniqueIndex('video_jobs_quote_unique').on(table.quoteId),
    uniqueIndex('video_jobs_user_idempotency_unique').on(table.userId, table.idempotencyKey),
    uniqueIndex('video_jobs_provider_task_unique').on(table.providerTaskId),
    index('video_jobs_user_created_idx').on(table.userId, table.createdAt),
    index('video_jobs_status_idx').on(table.status, table.createdAt),
  ]
);

export const videoCreditAccounts = sqliteTable('video_credit_accounts', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  paidAvailableUnits: integer('paid_available_units').notNull().default(0),
  heldUnits: integer('held_units').notNull().default(0),
  promoAvailableUnits: integer('promo_available_units').notNull().default(0),
  version: integer('version').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const videoCreditLedger = sqliteTable(
  'video_credit_ledger',
  {
    id: text('id').primaryKey(),
    eventKey: text('event_key').notNull(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    jobId: text('job_id').references(() => videoJobs.id),
    eventType: text('event_type').notNull(),
    paidAvailableDelta: integer('paid_available_delta').notNull().default(0),
    heldDelta: integer('held_delta').notNull().default(0),
    paidAvailableAfter: integer('paid_available_after').notNull(),
    heldAfter: integer('held_after').notNull(),
    reason: text('reason'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('video_ledger_event_key_unique').on(table.eventKey),
    index('video_ledger_user_created_idx').on(table.userId, table.createdAt),
  ]
);

export const videoDispatchOutbox = sqliteTable('video_dispatch_outbox', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => videoJobs.id, { onDelete: 'cascade' }),
  state: text('state').notNull(),
  attemptNo: integer('attempt_no').notNull().default(0),
  sendStartedAt: integer('send_started_at', { mode: 'timestamp_ms' }),
  leaseUntil: integer('lease_until', { mode: 'timestamp_ms' }),
  lastError: text('last_error'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [uniqueIndex('video_outbox_job_unique').on(table.jobId)]);

export const videoWebhookInbox = sqliteTable('video_webhook_inbox', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  taskId: text('task_id').notNull(),
  eventKey: text('event_key').notNull(),
  receivedAt: integer('received_at', { mode: 'timestamp_ms' }).notNull(),
  processedAt: integer('processed_at', { mode: 'timestamp_ms' }),
  state: text('state').notNull(),
}, (table) => [uniqueIndex('video_webhook_event_unique').on(table.eventKey)]);

export const videoOutputs = sqliteTable('video_outputs', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => videoJobs.id, { onDelete: 'cascade' }),
  sequenceNo: integer('sequence_no').notNull(),
  storageKey: text('storage_key').notNull(),
  mediaType: text('media_type').notNull(),
  byteSize: integer('byte_size'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
}, (table) => [uniqueIndex('video_outputs_job_sequence_unique').on(table.jobId, table.sequenceNo)]);
