// Local-first SQLite schema (plan.md §5). Units: kg / metres / seconds.
// Timestamps are epoch ms. Ids are text (UUIDs) so rows can sync to Supabase in Phase 2.

import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type { ExerciseCategory, RecordMetric, Sex, TrackingType, XpReason, XpSourceType, XpStatus } from '@/engine/types';

const createdAt = () =>
  integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`);

export const profile = sqliteTable('profile', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  sexForStandards: text('sex_for_standards').$type<Sex>().notNull(),
  birthYear: integer('birth_year').notNull(),
  heightCm: real('height_cm'),
  unitPref: text('unit_pref').$type<'kg' | 'lb'>().notNull().default('kg'),
  weeklyTargetDays: integer('weekly_target_days').notNull().default(3),
  createdAt: createdAt(),
});

export const bodyweightLogs = sqliteTable(
  'bodyweight_logs',
  {
    id: text('id').primaryKey(),
    weightKg: real('weight_kg').notNull(),
    loggedAt: integer('logged_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('bodyweight_logs_logged_at_idx').on(t.loggedAt)],
);

export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** 2–3 letter code shown on the picker tile until custom icons exist. */
  shortName: text('short_name').notNull().default(''),
  category: text('category').$type<ExerciseCategory>().notNull(),
  equipment: text('equipment'),
  primaryMuscles: text('primary_muscles', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  trackingType: text('tracking_type').$type<TrackingType>().notNull(),
  /** Cardio activity type ('run', 'swim', ...). */
  activity: text('activity'),
  icon: text('icon'),
  benchmarkId: text('benchmark_id'),
  isFavourite: integer('is_favourite', { mode: 'boolean' }).notNull().default(false),
  /** False for user-created exercises; true for the seeded catalogue. */
  isBuiltin: integer('is_builtin', { mode: 'boolean' }).notNull().default(true),
});

export const workouts = sqliteTable(
  'workouts',
  {
    id: text('id').primaryKey(),
    /** 'planning': exercises being set up, timer not running. 'active': in progress or finished (see endedAt). */
    status: text('status').$type<'planning' | 'active'>().notNull().default('active'),
    /** Creation time while planning; reset to the real start when the workout starts. */
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
    notes: text('notes'),
  },
  (t) => [index('workouts_started_at_idx').on(t.startedAt)],
);

export const workoutSets = sqliteTable(
  'workout_sets',
  {
    id: text('id').primaryKey(),
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id),
    setIndex: integer('set_index').notNull(),
    isWarmup: integer('is_warmup', { mode: 'boolean' }).notNull().default(false),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
    durationS: real('duration_s'),
    distanceM: real('distance_m'),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  },
  (t) => [
    index('workout_sets_workout_idx').on(t.workoutId),
    index('workout_sets_exercise_completed_idx').on(t.exerciseId, t.completedAt),
  ],
);

export const personalRecords = sqliteTable(
  'personal_records',
  {
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id),
    metric: text('metric').$type<RecordMetric>().notNull(),
    value: real('value').notNull(),
    setId: text('set_id').notNull(),
    achievedAt: integer('achieved_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.exerciseId, t.metric] })],
);

/** Append-only XP ledger. Total XP = sum(amount). Never update amounts; rebalancing adds events. */
export const xpEvents = sqliteTable(
  'xp_events',
  {
    id: text('id').primaryKey(),
    amount: integer('amount').notNull(),
    reason: text('reason').$type<XpReason>().notNull(),
    sourceType: text('source_type').$type<XpSourceType>().notNull(),
    sourceId: text('source_id').notNull(),
    ruleVersion: text('rule_version').notNull(),
    status: text('status').$type<XpStatus>().notNull().default('granted'),
    /** JSON: workoutId, performance ref for auto-confirm, breakdown details. */
    meta: text('meta', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    index('xp_events_created_at_idx').on(t.createdAt),
    index('xp_events_status_idx').on(t.status),
    index('xp_events_source_idx').on(t.sourceType, t.sourceId),
  ],
);

export const benchmarkUnlocks = sqliteTable(
  'benchmark_unlocks',
  {
    benchmarkId: text('benchmark_id').notNull(),
    tier: text('tier').notNull(),
    value: real('value').notNull(),
    status: text('status').$type<XpStatus>().notNull().default('granted'),
    unlockedAt: integer('unlocked_at', { mode: 'timestamp_ms' }).notNull(),
  },
  // Each tier pays once.
  (t) => [uniqueIndex('benchmark_unlocks_benchmark_tier_uq').on(t.benchmarkId, t.tier)],
);
