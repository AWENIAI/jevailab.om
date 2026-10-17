ALTER TABLE `video_webhook_inbox` ADD `provider_code` integer;
--> statement-breakpoint
ALTER TABLE `video_webhook_inbox` ADD `provider_state` text;
--> statement-breakpoint
ALTER TABLE `video_webhook_inbox` ADD `failure_code` text;
--> statement-breakpoint
ALTER TABLE `video_webhook_inbox` ADD `failure_message` text;
--> statement-breakpoint
CREATE INDEX `video_webhook_inbox_task_state_idx`
  ON `video_webhook_inbox` (`task_id`,`state`,`received_at`);
