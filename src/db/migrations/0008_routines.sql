CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`items` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER sync_routines_insert AFTER INSERT ON routines WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1)
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('routines', NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER sync_routines_update AFTER UPDATE ON routines WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1)
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('routines', NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER sync_routines_delete AFTER DELETE ON routines WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1)
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('routines', OLD.id);
END;
