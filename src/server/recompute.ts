// Server-side XP: rebuild a user's ledger from their synced rows with the same
// engine the app uses. Bundled into the recompute-xp Edge Function by
// scripts/build-edge.mjs, so this file (and everything it imports) must stay
// free of React Native, Expo and DB code.

import catalogue from '@config/exercises.json';

import { xpRules } from '@/engine/config';
import { replayHistory } from '@/engine/replay';
import type { ExerciseInfo, WorkoutInput } from '@/engine/types';

export interface CloudProfile {
  sex_for_standards: 'male' | 'female';
  birth_year: number;
  weekly_target_days: number;
  /** Minutes east of UTC on the user's phone; days and weeks are counted in their local time. */
  utc_offset_minutes: number | null;
}
export interface CloudWorkout {
  id: string;
  started_at: string;
  ended_at: string | null;
}
export interface CloudSet {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_index: number;
  is_warmup: boolean;
  weight_kg: number | null;
  reps: number | null;
  duration_s: number | null;
  distance_m: number | null;
  completed_at: string | null;
}
export interface CloudBodyweight {
  weight_kg: number;
  logged_at: string;
}
export interface CloudCustomExercise {
  id: string;
  category: ExerciseInfo['category'];
  tracking_type: ExerciseInfo['trackingType'];
}

export interface LedgerRow {
  seq: number;
  amount: number;
  reason: string;
  status: 'granted' | 'pending_review';
  source_type: string;
  source_id: string;
  workout_id: string | null;
  rule_version: string;
  created_at: string;
}

export interface ServerLedger {
  events: LedgerRow[];
  totalXp: number;
  grantedXp: number;
  ruleVersion: string;
}

const builtins: Record<string, ExerciseInfo> = Object.fromEntries(
  (catalogue.exercises as { id: string; category: ExerciseInfo['category']; trackingType: ExerciseInfo['trackingType']; activity?: string; benchmarkId?: string }[]).map(
    (e) => [e.id, { id: e.id, category: e.category, trackingType: e.trackingType, activity: e.activity, benchmarkId: e.benchmarkId }],
  ),
);

/**
 * The engine reads calendar days in the runtime's local zone; the server runs
 * in UTC. Shifting every timestamp by the user's offset makes UTC calendar days
 * equal the user's local days; durations are unaffected. Shift back on output.
 */
export function computeServerLedger(input: {
  profile: CloudProfile;
  workouts: CloudWorkout[];
  sets: CloudSet[];
  bodyweight: CloudBodyweight[];
  customExercises: CloudCustomExercise[];
}): ServerLedger {
  const shift = (input.profile.utc_offset_minutes ?? 0) * 60_000;
  const t = (iso: string) => Date.parse(iso) + shift;

  const exercises: Record<string, ExerciseInfo> = { ...builtins };
  for (const c of input.customExercises) exercises[c.id] = { id: c.id, category: c.category, trackingType: c.tracking_type };

  const setsByWorkout = new Map<string, CloudSet[]>();
  for (const s of input.sets) {
    if (!s.completed_at || !exercises[s.exercise_id]) continue;
    const list = setsByWorkout.get(s.workout_id) ?? [];
    list.push(s);
    setsByWorkout.set(s.workout_id, list);
  }

  const workouts: WorkoutInput[] = input.workouts
    .filter((w) => w.ended_at)
    .map((w) => ({
      id: w.id,
      startedAt: t(w.started_at),
      endedAt: t(w.ended_at!),
      sets: (setsByWorkout.get(w.id) ?? [])
        .sort((a, b) => a.set_index - b.set_index)
        .map((s) => ({
          id: s.id,
          exerciseId: s.exercise_id,
          isWarmup: s.is_warmup,
          weightKg: s.weight_kg ?? undefined,
          reps: s.reps ?? undefined,
          durationS: s.duration_s ?? undefined,
          distanceM: s.distance_m ?? undefined,
          completedAt: t(s.completed_at!),
        })),
    }));

  const out = replayHistory({
    profile: { sex: input.profile.sex_for_standards, birthYear: input.profile.birth_year, weeklyTargetDays: input.profile.weekly_target_days },
    exercises,
    bodyweightLogs: input.bodyweight.map((b) => ({ weightKg: b.weight_kg, loggedAt: t(b.logged_at) })),
    workouts,
  });

  const events: LedgerRow[] = out.events.map((e, i) => ({
    seq: i + 1,
    amount: e.amount,
    reason: e.reason,
    status: e.status,
    source_type: e.sourceType,
    source_id: e.sourceId,
    workout_id: (e.meta?.workoutId as string | undefined) ?? null,
    rule_version: e.ruleVersion,
    created_at: new Date(e.createdAt - shift).toISOString(),
  }));

  return {
    events,
    totalXp: events.reduce((s, e) => s + e.amount, 0),
    grantedXp: events.filter((e) => e.status === 'granted').reduce((s, e) => s + e.amount, 0),
    ruleVersion: xpRules.version,
  };
}
