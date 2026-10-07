CREATE TABLE `benchmark_unlocks` (
	`benchmark_id` text NOT NULL,
	`tier` text NOT NULL,
	`value` real NOT NULL,
	`status` text DEFAULT 'granted' NOT NULL,
	`unlocked_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `benchmark_unlocks_benchmark_tier_uq` ON `benchmark_unlocks` (`benchmark_id`,`tier`);--> statement-breakpoint
CREATE TABLE `bodyweight_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`weight_kg` real NOT NULL,
	`logged_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bodyweight_logs_logged_at_idx` ON `bodyweight_logs` (`logged_at`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`equipment` text,
	`primary_muscles` text DEFAULT '[]' NOT NULL,
	`tracking_type` text NOT NULL,
	`activity` text,
	`icon` text,
	`benchmark_id` text,
	`is_favourite` integer DEFAULT false NOT NULL,
	`is_builtin` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `personal_records` (
	`exercise_id` text NOT NULL,
	`metric` text NOT NULL,
	`value` real NOT NULL,
	`set_id` text NOT NULL,
	`achieved_at` integer NOT NULL,
	PRIMARY KEY(`exercise_id`, `metric`),
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`sex_for_standards` text NOT NULL,
	`birth_year` integer NOT NULL,
	`height_cm` real,
	`unit_pref` text DEFAULT 'kg' NOT NULL,
	`weekly_target_days` integer DEFAULT 3 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`set_index` integer NOT NULL,
	`is_warmup` integer DEFAULT false NOT NULL,
	`weight_kg` real,
	`reps` integer,
	`duration_s` real,
	`distance_m` real,
	`completed_at` integer,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workout_sets_workout_idx` ON `workout_sets` (`workout_id`);--> statement-breakpoint
CREATE INDEX `workout_sets_exercise_completed_idx` ON `workout_sets` (`exercise_id`,`completed_at`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `workouts_started_at_idx` ON `workouts` (`started_at`);--> statement-breakpoint
CREATE TABLE `xp_events` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`rule_version` text NOT NULL,
	`status` text DEFAULT 'granted' NOT NULL,
	`meta` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `xp_events_created_at_idx` ON `xp_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `xp_events_status_idx` ON `xp_events` (`status`);--> statement-breakpoint
CREATE INDEX `xp_events_source_idx` ON `xp_events` (`source_type`,`source_id`);