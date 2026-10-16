CREATE TABLE `image_templates` (
  `id` text PRIMARY KEY NOT NULL, `name` text NOT NULL, `category` text NOT NULL,
  `tags_json` text NOT NULL, `description` text NOT NULL, `cover_url` text NOT NULL,
  `example_url` text NOT NULL, `input_policy` text NOT NULL, `default_mode` text NOT NULL,
  `default_ratio` text NOT NULL, `default_count` integer NOT NULL, `revision` integer NOT NULL,
  `enabled` integer DEFAULT true NOT NULL, `base_prompt` text NOT NULL,
  `negative_prompt` text DEFAULT '' NOT NULL, `sort_order` integer DEFAULT 0 NOT NULL,
  `updated_at` integer NOT NULL
);--> statement-breakpoint
CREATE TABLE `image_assets` (
  `id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `storage_key` text NOT NULL,
  `source_filename` text NOT NULL, `media_type` text NOT NULL, `byte_size` integer NOT NULL,
  `width` integer, `height` integer, `state` text NOT NULL, `moderation_version` text,
  `created_at` integer NOT NULL, `expires_at` integer, `deleted_at` integer,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `image_wallets` (
  `user_id` text PRIMARY KEY NOT NULL, `available_credits` integer DEFAULT 0 NOT NULL,
  `reserved_credits` integer DEFAULT 0 NOT NULL, `version` integer DEFAULT 0 NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `image_quotes` (
  `id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `template_id` text,
  `template_revision` integer, `reference_asset_id` text, `params_hash` text NOT NULL,
  `mode` text NOT NULL, `ratio` text NOT NULL, `resolved_ratio` text NOT NULL,
  `output_count` integer NOT NULL, `unit_credits` integer NOT NULL,
  `total_credits` integer NOT NULL, `price_version` text NOT NULL,
  `created_at` integer NOT NULL, `expires_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`reference_asset_id`) REFERENCES `image_assets`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE TABLE `image_generation_jobs` (
  `id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `quote_id` text NOT NULL,
  `idempotency_key` text NOT NULL, `params_hash` text NOT NULL, `template_id` text,
  `template_revision` integer, `reference_asset_id` text, `mode` text NOT NULL,
  `ratio` text NOT NULL, `resolved_ratio` text NOT NULL, `requested_count` integer NOT NULL,
  `delivered_count` integer DEFAULT 0 NOT NULL, `unit_credits` integer NOT NULL,
  `reserved_credits` integer NOT NULL, `charged_credits` integer DEFAULT 0 NOT NULL,
  `released_credits` integer DEFAULT 0 NOT NULL, `price_version` text NOT NULL,
  `status` text NOT NULL, `internal_request_snapshot` text NOT NULL,
  `user_prompt_snapshot` text NOT NULL, `policy_version` text NOT NULL,
  `consent_accepted_at` integer NOT NULL, `provider_request_id` text,
  `error_code` text, `settled_at` integer, `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL, `deleted_at` integer,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`quote_id`) REFERENCES `image_quotes`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`reference_asset_id`) REFERENCES `image_assets`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE TABLE `image_generation_outputs` (
  `id` text PRIMARY KEY NOT NULL, `job_id` text NOT NULL, `sequence_no` integer NOT NULL,
  `state` text NOT NULL, `quarantine_storage_key` text, `private_storage_key` text,
  `width` integer, `height` integer, `media_type` text, `provider_request_id` text,
  `moderation_version` text, `created_at` integer NOT NULL, `updated_at` integer NOT NULL,
  FOREIGN KEY (`job_id`) REFERENCES `image_generation_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `image_credit_ledger` (
  `id` text PRIMARY KEY NOT NULL, `event_key` text NOT NULL, `user_id` text NOT NULL,
  `job_id` text, `event_type` text NOT NULL, `available_delta` integer DEFAULT 0 NOT NULL,
  `reserved_delta` integer DEFAULT 0 NOT NULL, `available_after` integer NOT NULL,
  `reserved_after` integer NOT NULL, `reason` text, `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`job_id`) REFERENCES `image_generation_jobs`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX `image_assets_storage_key_unique` ON `image_assets` (`storage_key`);--> statement-breakpoint
CREATE INDEX `image_assets_user_created_idx` ON `image_assets` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `image_templates_enabled_idx` ON `image_templates` (`enabled`,`sort_order`);--> statement-breakpoint
CREATE INDEX `image_quotes_user_created_idx` ON `image_quotes` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `image_jobs_user_idempotency_unique` ON `image_generation_jobs` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `image_jobs_user_created_idx` ON `image_generation_jobs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `image_jobs_status_idx` ON `image_generation_jobs` (`status`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `image_outputs_job_sequence_unique` ON `image_generation_outputs` (`job_id`,`sequence_no`);--> statement-breakpoint
CREATE INDEX `image_outputs_job_idx` ON `image_generation_outputs` (`job_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `image_ledger_event_key_unique` ON `image_credit_ledger` (`event_key`);--> statement-breakpoint
CREATE INDEX `image_ledger_user_created_idx` ON `image_credit_ledger` (`user_id`,`created_at`);
