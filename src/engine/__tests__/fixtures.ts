import { DAY_MS } from '../config';
import type { ExerciseInfo, PersonalRecord, SetInput, WorkoutInput } from '../types';
import type { WorkoutContext } from '../xp';

/** Wednesday 2026-10-07 18:00 UTC (tests run with TZ=UTC). */
export const NOW = Date.UTC(2026, 9, 7, 18);
export const daysAgo = (n: number, from = NOW) => from - n * DAY_MS;

export const exercises: Record<string, ExerciseInfo> = {
  bench: { id: 'bench', category: 'free_weight', trackingType: 'weight_reps', benchmarkId: 'bench_press' },
  squat: { id: 'squat', category: 'free_weight', trackingType: 'weight_reps', benchmarkId: 'back_squat' },
  curl: { id: 'curl', category: 'free_weight', trackingType: 'weight_reps' },
  leg_press: { id: 'leg_press', category: 'machine', trackingType: 'weight_reps' },
  push_up: { id: 'push_up', category: 'bodyweight', trackingType: 'reps', benchmarkId: 'push_ups' },
  plank: { id: 'plank', category: 'bodyweight', trackingType: 'time' },
  run: { id: 'run', category: 'cardio', trackingType: 'distance_time', activity: 'run', benchmarkId: 'run_5k' },
  bike: { id: 'bike', category: 'cardio', trackingType: 'distance_time', activity: 'cycle' },
};

let setCounter = 0;
export function set(exerciseId: string, fields: Partial<SetInput> = {}): SetInput {
  setCounter++;
  return {
    id: `s${setCounter}`,
    exerciseId,
    isWarmup: false,
    completedAt: NOW - 60_000 + setCounter,
    ...fields,
  };
}

export function lift(exerciseId: string, weightKg: number, reps: number, fields: Partial<SetInput> = {}) {
  return set(exerciseId, { weightKg, reps, ...fields });
}

export function workout(sets: SetInput[], endedAt = NOW): WorkoutInput {
  return { id: 'w1', startedAt: endedAt - 3600_000, endedAt, sets };
}

export function record(
  exerciseId: string,
  metric: PersonalRecord['metric'],
  value: number,
  achievedAt = daysAgo(60),
): PersonalRecord {
  return { exerciseId, metric, value, setId: 'old', achievedAt };
}

/** A veteran user: has done every fixture exercise and activity, no streak, nothing earned today. */
export function context(overrides: Partial<WorkoutContext> = {}): WorkoutContext {
  return {
    exercises,
    profile: { sex: 'male', birthYear: 1998 },
    bodyweightKg: 80,
    records: [],
    seenExerciseIds: Object.keys(exercises),
    seenActivities: ['run', 'cycle'],
    benchmarkUnlocks: [],
    today: { consistencyXp: 0, cardioMinutes: 0, prsCounted: 0 },
    streakWeeks: 0,
    ...overrides,
  };
}
