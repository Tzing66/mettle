-- Change tracking for sync: queue a row in sync_outbox whenever synced data
-- changes, but only once the phone is linked to an account and never while
-- applying pulled rows.
INSERT OR IGNORE INTO sync_state (id, applying) VALUES (1, 0);
--> statement-breakpoint
CREATE TRIGGER sync_workouts_insert AFTER INSERT ON workouts WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1)
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('workouts', NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER sync_workouts_update AFTER UPDATE ON workouts WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1)
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('workouts', NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER sync_workouts_delete AFTER DELETE ON workouts WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1)
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('workouts', OLD.id);
END;
--> statement-breakpoint
CREATE TRIGGER sync_workout_sets_insert AFTER INSERT ON workout_sets WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1)
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('workout_sets', NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER sync_workout_sets_update AFTER UPDATE ON workout_sets WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1)
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('workout_sets', NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER sync_workout_sets_delete AFTER DELETE ON workout_sets WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1)
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('workout_sets', OLD.id);
END;
--> statement-breakpoint
CREATE TRIGGER sync_bodyweight_logs_insert AFTER INSERT ON bodyweight_logs WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1)
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('bodyweight_logs', NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER sync_bodyweight_logs_update AFTER UPDATE ON bodyweight_logs WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1)
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('bodyweight_logs', NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER sync_bodyweight_logs_delete AFTER DELETE ON bodyweight_logs WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1)
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('bodyweight_logs', OLD.id);
END;
--> statement-breakpoint
CREATE TRIGGER sync_profile_insert AFTER INSERT ON profile WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1)
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('profiles', 'me');
END;
--> statement-breakpoint
CREATE TRIGGER sync_profile_update AFTER UPDATE ON profile WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1)
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('profiles', 'me');
END;
--> statement-breakpoint
CREATE TRIGGER sync_custom_exercises_insert AFTER INSERT ON exercises WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1) AND NEW.is_builtin = 0
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('custom_exercises', NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER sync_custom_exercises_update AFTER UPDATE ON exercises WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1) AND NEW.is_builtin = 0
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('custom_exercises', NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER sync_custom_exercises_delete AFTER DELETE ON exercises WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1) AND OLD.is_builtin = 0
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('custom_exercises', OLD.id);
END;
--> statement-breakpoint
CREATE TRIGGER sync_builtin_favourite AFTER UPDATE OF is_favourite ON exercises WHEN (SELECT applying = 0 AND user_id IS NOT NULL FROM sync_state WHERE id = 1) AND NEW.is_builtin = 1
BEGIN
  INSERT INTO sync_outbox (table_name, row_id) VALUES ('profiles', 'me');
END;
