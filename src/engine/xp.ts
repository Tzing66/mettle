// The XP engine: given a finished workout and the user's history, returns the
// XP events to append to the ledger plus the records and unlocks to persist.
// Pure and deterministic: no I/O, no clock, no React Native.

import {
  benchmarksConfig,
  xpRules,
  type BenchmarkDef,
  type BenchmarksConfig,
  type XpRules,
} from './config';
import { benchmarksFor, benchmarkValue, findBenchmark, newTiers } from './benchmarks';
import { exceedsEliteCeiling, isSuspiciousE1rmJump } from './plausibility';
import { detectRecords, type RecordOutcome } from './records';
import { streakMultiplier } from './streaks';
import type {
  BenchmarkUnlock,
  ExerciseInfo,
  PersonalRecord,
  Profile,
  SetInput,
  WorkoutInput,
  XpEventDraft,
} from './types';

export interface WorkoutContext {
  exercises: Record<string, ExerciseInfo>;
  profile: Profile;
  /** Rolling-average bodyweight (see rollingBodyweight); null if never logged. */
  bodyweightKg: number | null;
  /** Current bests before this workout. */
  records: PersonalRecord[];
  seenExerciseIds: Iterable<string>;
  seenActivities: Iterable<string>;
  benchmarkUnlocks: Pick<BenchmarkUnlock, 'benchmarkId' | 'tier'>[];
  /** Totals already earned earlier on the same local day. */
  today: { consistencyXp: number; cardioMinutes: number; prsCounted: number };
  /** Consecutive goal-hit weeks (see streakWeeks). */
  streakWeeks: number;
}

export interface WorkoutXpResult {
  events: XpEventDraft[];
  /** New bests to persist (PRs and first-time baselines). */
  records: RecordOutcome[];
  benchmarkUnlocks: BenchmarkUnlock[];
  /** Whether the workout counts toward the weekly goal. */
  qualifies: boolean;
  workingSets: number;
  cardioMinutes: number;
  prsCounted: number;
  consistencyXp: number;
  /** True if the daily cap cut consistency XP. */
  capped: boolean;
}

function isCardio(exercise: ExerciseInfo | undefined): boolean {
  return exercise?.category === 'cardio';
}

function countWorkingSets(sets: SetInput[], exercises: Record<string, ExerciseInfo>): number {
  return sets.filter((s) => !s.isWarmup && exercises[s.exerciseId] && !isCardio(exercises[s.exerciseId]))
    .length;
}

/** Whole minutes of non-warm-up cardio. */
export function countCardioMinutes(sets: SetInput[], exercises: Record<string, ExerciseInfo>): number {
  const seconds = sets
    .filter((s) => !s.isWarmup && isCardio(exercises[s.exerciseId]))
    .reduce((sum, s) => sum + (s.durationS ?? 0), 0);
  return Math.floor(seconds / 60);
}

export function qualifiesAsWorkout(
  sets: SetInput[],
  exercises: Record<string, ExerciseInfo>,
  rules: XpRules = xpRules,
): boolean {
  const { workoutMinWorkingSets, workoutMinCardioMinutes } = rules.consistency;
  return (
    countWorkingSets(sets, exercises) >= workoutMinWorkingSets ||
    countCardioMinutes(sets, exercises) >= workoutMinCardioMinutes
  );
}

/**
 * XP for `addMinutes` more cardio when `minutesSoFar` have already been done
 * today. Diminishing bands, then nothing. Also drives the "+5 min bonus round"
 * chip: cardioXp(today, 5) is what the chip is worth right now.
 */
export function cardioXp(minutesSoFar: number, addMinutes: number, rules: XpRules = xpRules): number {
  const from = Math.max(0, minutesSoFar);
  const to = from + Math.max(0, addMinutes);
  let xp = 0;
  let bandStart = 0;
  for (const band of rules.consistency.cardioBands) {
    const overlap = Math.min(to, band.upToMinutes) - Math.max(from, bandStart);
    if (overlap > 0) xp += overlap * band.xpPerMinute;
    bandStart = band.upToMinutes;
  }
  return xp;
}

export function computeWorkoutXp(
  workout: WorkoutInput,
  ctx: WorkoutContext,
  rules: XpRules = xpRules,
  benchmarks: BenchmarksConfig = benchmarksConfig,
): WorkoutXpResult {
  const { exercises } = ctx;
  const at = workout.endedAt;
  const event = (e: Omit<XpEventDraft, 'ruleVersion' | 'status' | 'createdAt'> & Partial<XpEventDraft>) =>
    ({ ruleVersion: rules.version, status: 'granted', createdAt: at, ...e }) as XpEventDraft;
  const workoutMeta = { workoutId: workout.id };

  // --- Consistency (subject to streak multiplier and daily cap) -------------
  const c = rules.consistency;
  const workingSets = countWorkingSets(workout.sets, exercises);
  const cardioMinutes = countCardioMinutes(workout.sets, exercises);
  const qualifies = qualifiesAsWorkout(workout.sets, exercises, rules);

  const consistency: XpEventDraft[] = [];
  if (qualifies)
    consistency.push(event({ amount: c.workoutComplete, reason: 'workout_complete', sourceType: 'workout', sourceId: workout.id, meta: workoutMeta }));
  if (workingSets > 0)
    consistency.push(event({ amount: Math.min(workingSets * c.perWorkingSet, c.maxSetXpPerWorkout), reason: 'working_sets', sourceType: 'workout', sourceId: workout.id, meta: { ...workoutMeta, sets: workingSets } }));
  const cardio = cardioXp(ctx.today.cardioMinutes, cardioMinutes, rules);
  if (cardio > 0)
    consistency.push(event({ amount: cardio, reason: 'cardio_minutes', sourceType: 'workout', sourceId: workout.id, meta: { ...workoutMeta, minutes: cardioMinutes } }));

  const subtotal = consistency.reduce((s, e) => s + e.amount, 0);
  const multiplier = streakMultiplier(ctx.streakWeeks, rules);
  const bonus = Math.round(subtotal * multiplier);
  if (bonus > 0)
    consistency.push(event({ amount: bonus, reason: 'streak_bonus', sourceType: 'workout', sourceId: workout.id, meta: { ...workoutMeta, streakWeeks: ctx.streakWeeks, multiplier } }));

  let remaining = Math.max(0, c.dailyCap - ctx.today.consistencyXp);
  let capped = false;
  const cappedConsistency: XpEventDraft[] = [];
  for (const e of consistency) {
    const amount = Math.min(e.amount, remaining);
    if (amount < e.amount) capped = true;
    remaining -= amount;
    if (amount > 0) cappedConsistency.push({ ...e, amount });
  }
  const consistencyXp = cappedConsistency.reduce((s, e) => s + e.amount, 0);

  // --- Progress: PRs --------------------------------------------------------
  const p = rules.progress;
  const records = detectRecords(workout.sets, exercises, ctx.records, rules);
  const progress: XpEventDraft[] = [];
  let prSlots = Math.max(0, p.maxPrsPerDay - ctx.today.prsCounted);
  let prsCounted = 0;

  for (const outcome of records) {
    if (outcome.kind !== 'pr' || prSlots === 0) continue;
    const { record, previous } = outcome;
    const benchmark = benchmarkFor(exercises[record.exerciseId], benchmarks);
    const flagged =
      (record.metric === 'e1rm' && isSuspiciousE1rmJump(record.value, record.achievedAt, previous, rules)) ||
      (record.metric === 'e1rm' && benchmark?.kind === 'bodyweight_multiple' && !!ctx.bodyweightKg &&
        exceedsEliteCeiling(benchmark, record.value / ctx.bodyweightKg, ctx.profile.sex, rules));
    progress.push(event({
      amount: p.personalRecord,
      reason: 'personal_record',
      sourceType: 'set',
      sourceId: record.setId,
      status: flagged ? 'pending_review' : 'granted',
      meta: { ...workoutMeta, previous: previous.value, performance: { exerciseId: record.exerciseId, metric: record.metric, value: record.value } },
    }));
    prSlots--;
    prsCounted++;
  }

  // --- Progress: firsts ------------------------------------------------------
  const seenExercises = new Set(ctx.seenExerciseIds);
  const seenActivities = new Set(ctx.seenActivities);
  for (const exerciseId of uniqueInOrder(workout.sets.map((s) => s.exerciseId))) {
    const exercise = exercises[exerciseId];
    if (!exercise) continue;
    if (!seenExercises.has(exerciseId)) {
      seenExercises.add(exerciseId);
      progress.push(event({ amount: p.firstExercise, reason: 'first_exercise', sourceType: 'exercise', sourceId: exerciseId, meta: workoutMeta }));
    }
    if (exercise.activity && !seenActivities.has(exercise.activity)) {
      seenActivities.add(exercise.activity);
      progress.push(event({ amount: p.firstActivity, reason: 'first_activity', sourceType: 'activity', sourceId: exercise.activity, meta: workoutMeta }));
    }
  }

  // --- Progress: benchmark tiers --------------------------------------------
  const benchmarkUnlocks: BenchmarkUnlock[] = [];
  const touched = benchmarksFor(uniqueInOrder(workout.sets.map((s) => s.exerciseId)).map((id) => exercises[id]), benchmarks);
  for (const benchmark of touched) {
    const benchmarkId = benchmark.id;
    const result = benchmarkValue(
      benchmark,
      workout.sets,
      exercises,
      { sex: ctx.profile.sex, bodyweightKg: ctx.bodyweightKg, birthYear: ctx.profile.birthYear },
      rules,
    );
    if (!result) continue;

    const previousE1rm = ctx.records.find((r) => r.exerciseId === result.performance.exerciseId && r.metric === 'e1rm');
    const flagged =
      exceedsEliteCeiling(benchmark, result.value, ctx.profile.sex, rules) ||
      (result.performance.metric === 'e1rm' &&
        isSuspiciousE1rmJump(result.performance.value, result.achievedAt, previousE1rm, rules));
    const status = flagged ? 'pending_review' : 'granted';

    for (const tier of newTiers(benchmark, result.value, ctx.profile.sex, ctx.benchmarkUnlocks, benchmarks)) {
      benchmarkUnlocks.push({ benchmarkId, tier, value: result.value, unlockedAt: at, status });
      progress.push(event({
        amount: p.benchmarkTier[tier],
        reason: 'benchmark_tier',
        sourceType: 'benchmark',
        sourceId: `${benchmarkId}:${tier}`,
        status,
        meta: { ...workoutMeta, benchmarkId, tier, value: result.value, setId: result.setId, performance: result.performance },
      }));
    }
  }

  return {
    events: [...cappedConsistency, ...progress],
    records,
    benchmarkUnlocks,
    qualifies,
    workingSets,
    cardioMinutes,
    prsCounted,
    consistencyXp,
    capped,
  };
}

function benchmarkFor(exercise: ExerciseInfo | undefined, config: BenchmarksConfig): BenchmarkDef | undefined {
  return exercise?.benchmarkId ? findBenchmark(exercise.benchmarkId, config) : undefined;
}

function uniqueInOrder<T>(items: T[]): T[] {
  return [...new Set(items)];
}
