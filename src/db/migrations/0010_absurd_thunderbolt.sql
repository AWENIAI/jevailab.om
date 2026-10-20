CREATE TABLE `image_dispatch_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`state` text NOT NULL,
	`attempt_no` integer DEFAULT 0 NOT NULL,
	`send_started_at` integer,
	`lease_until` integer,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `image_outbox_job_unique` ON `image_dispatch_outbox` (`job_id`);--> statement-breakpoint
CREATE INDEX `image_outbox_state_idx` ON `image_dispatch_outbox` (`state`,`created_at`);--> statement-breakpoint
CREATE TABLE `miniprogram_accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`openid` text NOT NULL,
	`unionid` text,
	`encrypted_session_key` text,
	`session_key_iv` text,
	`session_key_updated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `miniprogram_accounts_openid_unique` ON `miniprogram_accounts` (`openid`);--> statement-breakpoint
CREATE INDEX `miniprogram_accounts_unionid_idx` ON `miniprogram_accounts` (`unionid`);--> statement-breakpoint
CREATE TABLE `miniprogram_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`out_trade_no` text NOT NULL,
	`wx_order_id` text,
	`user_id` text NOT NULL,
	`openid` text NOT NULL,
	`product_id` text NOT NULL,
	`credits` integer NOT NULL,
	`price_fen` integer NOT NULL,
	`status` text NOT NULL,
	`delivered_at` integer,
	`notify_payload` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `miniprogram_orders_out_trade_no_unique` ON `miniprogram_orders` (`out_trade_no`);--> statement-breakpoint
CREATE UNIQUE INDEX `miniprogram_orders_wx_order_id_unique` ON `miniprogram_orders` (`wx_order_id`);--> statement-breakpoint
CREATE INDEX `miniprogram_orders_user_created_idx` ON `miniprogram_orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `miniprogram_orders_status_idx` ON `miniprogram_orders` (`status`,`created_at`);--> statement-breakpoint
ALTER TABLE `image_quotes` ADD `consumed_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `image_quotes_id_user_unique` ON `image_quotes` (`id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `image_jobs_quote_unique` ON `image_generation_jobs` (`quote_id`);