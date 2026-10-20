CREATE TABLE `newsletter_subscriptions` (
	`email` text PRIMARY KEY NOT NULL,
	`subscribed` integer DEFAULT true NOT NULL,
	`subscribed_at` integer NOT NULL,
	`unsubscribed_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `newsletter_subscriptions_status_idx` ON `newsletter_subscriptions` (`subscribed`);
