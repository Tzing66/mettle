// Pure converters between local SQLite rows (camelCase, Date) and cloud
// Postgres rows (snake_case, ISO strings). Kept separate so they're easy to test.

import type { ExerciseRow } from '@/db/repositories/exercises';
import type { BodyweightRow, ProfileRow } from '@/db/repositories/profile';
import type { SetRow, WorkoutRow } from '@/db/repositories/workouts';

export type CloudTable = 'profiles' | 'custom_exercises' | 'workouts' | 'workout_sets' | 'bodyweight_logs';

/** Upload order respects foreign keys (sets need their workout, custom exercises before sets). */
export const PUSH_ORDER: CloudTable[] = ['profiles', 'custom_exercises', 'workouts', 'workout_sets', 'bodyweight_logs'];

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const date = (s: string | null | undefined) => (s ? new Date(s) : null);

export interface CloudRow {
  updated_at: string;
  deleted_at?: string | null;
  [key: string]: unknown;
}

// ---- local → cloud

export function profileToCloud(p: ProfileRow, userId: string, favouriteIds: string[]) {
  return {
    user_id: userId,
    display_name: p.displayName,
    sex_for_standards: p.sexForStandards,
    birth_year: p.birthYear,
    unit_pref: p.unitPref,
    weekly_target_days: p.weeklyTargetDays,
    rest_seconds: p.restSeconds,
    favourite_exercise_ids: favouriteIds,
    // Lets the server count days and weeks in the user's local time.
    utc_offset_minutes: -new Date().getTimezoneOffset() || 0, // `|| 0` avoids -0 at UTC
  };
}

export function customExerciseToCloud(e: ExerciseRow, userId: string) {
  return {
    id: e.id,
    user_id: userId,
    name: e.name,
    short_name: e.shortName,
    category: e.category,
    tracking_type: e.trackingType,
    is_favourite: e.isFavourite,
    deleted_at: null,
  };
}

export function workoutToCloud(w: WorkoutRow, userId: string) {
  return {
    id: w.id,
    user_id: userId,
    status: w.status,
    started_at: iso(w.startedAt),
    ended_at: iso(w.endedAt),
    notes: w.notes,
    deleted_at: null,
  };
}

export function setToCloud(s: SetRow, userId: string) {
  return {
    id: s.id,
    user_id: userId,
    workout_id: s.workoutId,
    exercise_id: s.exerciseId,
    set_index: s.setIndex,
    is_warmup: s.isWarmup,
    weight_kg: s.weightKg,
    reps: s.reps,
    duration_s: s.durationS,
    distance_m: s.distanceM,
    completed_at: iso(s.completedAt),
    deleted_at: null,
  };
}

export function bodyweightToCloud(b: BodyweightRow, userId: string) {
  return { id: b.id, user_id: userId, weight_kg: b.weightKg, logged_at: iso(b.loggedAt), deleted_at: null };
}

// ---- cloud → local

export function profileFromCloud(r: CloudRow) {
  return {
    displayName: r.display_name as string,
    sexForStandards: r.sex_for_standards as ProfileRow['sexForStandards'],
    birthYear: r.birth_year as number,
    unitPref: r.unit_pref as ProfileRow['unitPref'],
    weeklyTargetDays: r.weekly_target_days as number,
    restSeconds: r.rest_seconds as number,
    favouriteIds: (r.favourite_exercise_ids as string[] | null) ?? [],
  };
}

export function customExerciseFromCloud(r: CloudRow) {
  return {
    id: r.id as string,
    name: r.name as string,
    shortName: (r.short_name as string) ?? '',
    category: r.category as ExerciseRow['category'],
    trackingType: r.tracking_type as ExerciseRow['trackingType'],
    isFavourite: !!r.is_favourite,
    isBuiltin: false,
    primaryMuscles: [] as string[],
  };
}

export function workoutFromCloud(r: CloudRow) {
  return {
    id: r.id as string,
    status: r.status as WorkoutRow['status'],
    startedAt: date(r.started_at as string)!,
    endedAt: date(r.ended_at as string | null),
    notes: (r.notes as string | null) ?? null,
  };
}

export function setFromCloud(r: CloudRow) {
  return {
    id: r.id as string,
    workoutId: r.workout_id as string,
    exerciseId: r.exercise_id as string,
    setIndex: r.set_index as number,
    isWarmup: !!r.is_warmup,
    weightKg: (r.weight_kg as number | null) ?? null,
    reps: (r.reps as number | null) ?? null,
    durationS: (r.duration_s as number | null) ?? null,
    distanceM: (r.distance_m as number | null) ?? null,
    completedAt: date(r.completed_at as string | null),
  };
}

export function bodyweightFromCloud(r: CloudRow) {
  return { id: r.id as string, weightKg: r.weight_kg as number, loggedAt: date(r.logged_at as string)! };
}
