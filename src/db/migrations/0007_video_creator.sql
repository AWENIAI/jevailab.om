CREATE TABLE `video_templates` (
  `id` text PRIMARY KEY NOT NULL, `name` text NOT NULL, `version` integer NOT NULL,
  `storage_key` text NOT NULL, `preview_url` text, `duration_seconds` integer NOT NULL,
  `aspect_ratio` text NOT NULL, `enabled` integer DEFAULT false NOT NULL,
  `authorization_status` text NOT NULL, `authorization_evidence` text,
  `seedance_prompt` text DEFAULT '' NOT NULL, `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);--> statement-breakpoint
CREATE TABLE `video_assets` (
  `id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `storage_key` text NOT NULL,
  `source_filename` text NOT NULL, `media_type` text NOT NULL, `byte_size` integer NOT NULL,
  `state` text NOT NULL, `moderation_version` text, `authorization_accepted_at` integer,
  `created_at` integer NOT NULL, `deleted_at` integer,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `video_template_licenses` (
  `id` text PRIMARY KEY NOT NULL, `template_id` text NOT NULL,
  `rights_holder` text NOT NULL, `permitted_scope` text NOT NULL,
  `territory` text NOT NULL, `starts_at` integer, `expires_at` integer,
  `evidence_storage_key` text NOT NULL, `verified_by` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`template_id`) REFERENCES `video_templates`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `provider_pricing` (
  `id` text PRIMARY KEY NOT NULL, `provider` text NOT NULL, `model` text NOT NULL,
  `resolution` text NOT NULL, `rate_version` text NOT NULL, `billable_mode` text NOT NULL,
  `units_per_second` integer NOT NULL, `enabled` integer DEFAULT false NOT NULL,
  `effective_at` integer NOT NULL, `checked_at` integer, `change_reason` text,
  `created_at` integer NOT NULL
);--> statement-breakpoint
CREATE TABLE `video_quotes` (
  `id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `template_id` text NOT NULL,
  `template_version` integer NOT NULL, `model` text NOT NULL, `resolution` text NOT NULL,
  `input_seconds` integer NOT NULL, `output_seconds` integer NOT NULL,
  `price_version` text NOT NULL, `quoted_units` integer NOT NULL, `expires_at` integer NOT NULL,
  `consumed_at` integer, `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`template_id`) REFERENCES `video_templates`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE TABLE `video_jobs` (
  `id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `quote_id` text NOT NULL,
  `idempotency_key` text NOT NULL, `asset_id` text NOT NULL, `template_id` text NOT NULL,
  `template_version` integer NOT NULL, `model` text NOT NULL, `resolution` text NOT NULL,
  `input_seconds` integer NOT NULL, `output_seconds` integer NOT NULL,
  `price_version` text NOT NULL, `quoted_units` integer NOT NULL, `held_units` integer NOT NULL,
  `captured_units` integer DEFAULT 0 NOT NULL, `released_units` integer DEFAULT 0 NOT NULL,
  `status` text NOT NULL, `provider_task_id` text, `provider_credits_consumed` integer,
  `error_code` text, `authorization_accepted_at` integer NOT NULL, `settled_at` integer,
  `created_at` integer NOT NULL, `updated_at` integer NOT NULL, `deleted_at` integer,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`quote_id`) REFERENCES `video_quotes`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`asset_id`) REFERENCES `video_assets`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`template_id`) REFERENCES `video_templates`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE TABLE `video_credit_accounts` (
  `user_id` text PRIMARY KEY NOT NULL, `paid_available_units` integer DEFAULT 0 NOT NULL,
  `held_units` integer DEFAULT 0 NOT NULL, `promo_available_units` integer DEFAULT 0 NOT NULL,
  `version` integer DEFAULT 0 NOT NULL, `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `video_credit_ledger` (
  `id` text PRIMARY KEY NOT NULL, `event_key` text NOT NULL, `user_id` text NOT NULL,
  `job_id` text, `event_type` text NOT NULL, `paid_available_delta` integer DEFAULT 0 NOT NULL,
  `held_delta` integer DEFAULT 0 NOT NULL, `paid_available_after` integer NOT NULL,
  `held_after` integer NOT NULL, `reason` text, `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`job_id`) REFERENCES `video_jobs`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE TABLE `video_dispatch_outbox` (
  `id` text PRIMARY KEY NOT NULL, `job_id` text NOT NULL, `state` text NOT NULL,
  `attempt_no` integer DEFAULT 0 NOT NULL, `send_started_at` integer, `lease_until` integer,
  `last_error` text, `created_at` integer NOT NULL, `updated_at` integer NOT NULL,
  FOREIGN KEY (`job_id`) REFERENCES `video_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `video_webhook_inbox` (
  `id` text PRIMARY KEY NOT NULL, `provider` text NOT NULL, `task_id` text NOT NULL,
  `event_key` text NOT NULL, `received_at` integer NOT NULL, `processed_at` integer,
  `state` text NOT NULL
);--> statement-breakpoint
CREATE TABLE `video_outputs` (
  `id` text PRIMARY KEY NOT NULL, `job_id` text NOT NULL, `sequence_no` integer NOT NULL,
  `storage_key` text NOT NULL, `media_type` text NOT NULL, `byte_size` integer,
  `created_at` integer NOT NULL, `deleted_at` integer,
  FOREIGN KEY (`job_id`) REFERENCES `video_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `video_templates_version_unique` ON `video_templates` (`id`,`version`);--> statement-breakpoint
CREATE INDEX `video_templates_enabled_idx` ON `video_templates` (`enabled`,`updated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `video_assets_storage_key_unique` ON `video_assets` (`storage_key`);--> statement-breakpoint
CREATE INDEX `video_assets_user_created_idx` ON `video_assets` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `video_template_licenses_template_idx` ON `video_template_licenses` (`template_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `provider_pricing_version_unique` ON `provider_pricing` (`model`,`resolution`,`rate_version`);--> statement-breakpoint
CREATE INDEX `video_quotes_user_created_idx` ON `video_quotes` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `video_jobs_quote_unique` ON `video_jobs` (`quote_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `video_jobs_user_idempotency_unique` ON `video_jobs` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `video_jobs_provider_task_unique` ON `video_jobs` (`provider_task_id`);--> statement-breakpoint
CREATE INDEX `video_jobs_user_created_idx` ON `video_jobs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `video_jobs_status_idx` ON `video_jobs` (`status`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `video_ledger_event_key_unique` ON `video_credit_ledger` (`event_key`);--> statement-breakpoint
CREATE INDEX `video_ledger_user_created_idx` ON `video_credit_ledger` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `video_outbox_job_unique` ON `video_dispatch_outbox` (`job_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `video_webhook_event_unique` ON `video_webhook_inbox` (`event_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `video_outputs_job_sequence_unique` ON `video_outputs` (`job_id`,`sequence_no`);
--> statement-breakpoint
INSERT INTO `provider_pricing` (
  `id`, `provider`, `model`, `resolution`, `rate_version`, `billable_mode`,
  `units_per_second`, `enabled`, `effective_at`, `checked_at`, `change_reason`, `created_at`
) VALUES
  ('kie-seedance-480-20261017', 'kie', 'bytedance/seedance-2-mini', '480p', 'kie-public-2026-10-17', 'input_and_output', 24, 1, 1792220400000, 1792220400000, 'initial reviewed rate', 1792220400000),
  ('kie-seedance-720-20261017', 'kie', 'bytedance/seedance-2-mini', '720p', 'kie-public-2026-10-17', 'input_and_output', 50, 1, 1792220400000, 1792220400000, 'initial reviewed rate', 1792220400000),
  ('kie-wan-480-20261017', 'kie', 'wan/2-2-animate-replace', '480p', 'kie-public-2026-10-17', 'input', 60, 1, 1792220400000, 1792220400000, 'initial reviewed rate', 1792220400000),
  ('kie-wan-580-20261017', 'kie', 'wan/2-2-animate-replace', '580p', 'kie-public-2026-10-17', 'input', 95, 0, 1792220400000, 1792220400000, 'disabled by default', 1792220400000),
  ('kie-wan-720-20261017', 'kie', 'wan/2-2-animate-replace', '720p', 'kie-public-2026-10-17', 'input', 125, 1, 1792220400000, 1792220400000, 'initial reviewed rate', 1792220400000);
