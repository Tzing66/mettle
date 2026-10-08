// Finishing a workout end to end, still pure: derive today's/this week's context
// from history, run the XP engine, award the weekly goal, and find pending
// events that this workout's performances confirm. The DB layer only loads
// the inputs and writes the outputs.

import { xpRules, type XpRules } from './config';
import { placementEvent, placementTests } from './placement';
import { confirmedPendingIds, rollingBodyweight, type BodyweightLog, type Performance } from './plausibility';
import { setMetrics } from './records';
import { dayKey, streakWeeks, weekKey, weeklyGoalEvent } from './streaks';
import type { BenchmarkUnlock, ExerciseInfo, PersonalRecord, Profile, WorkoutInput, XpEventDraft, XpReason } from './types';
import { computeWorkoutXp, countCardioMinutes, qualifiesAsWorkout, type WorkoutXpResult } from './xp';

export interface LedgerEvent extends XpEventDraft {
  id: string;
}

export interface FinishInput {
  workout: WorkoutInput;
  profile: Profile & { weeklyTargetDays: number };
  exercises: Record<string, ExerciseInfo>;
  bodyweightLogs: BodyweightLog[];
  records: PersonalRecord[];
  /** Exercises used in any earlier finished workout. */
  seenExerciseIds: string[];
  /** Earlier finished workouts from at least the current week (today included). */
  recentWorkouts: WorkoutInput[];
  ledger: LedgerEvent[];
  benchmarkUnlocks: Pick<BenchmarkUnlock, 'benchmarkId' | 'tier'>[];
}

export interface FinishOutput {
  result: WorkoutXpResult;
  weeklyGoal: XpEventDraft | null;
  /** Every new event to append: workout events plus the weekly goal. */
  events: XpEventDraft[];
  /** Pending ledger events this workout confirms. */
  confirmedEventIds: string[];
  streakWeeks: number;
  bodyweightKg: number | null;
  /** The placement award, when this workout placed the user. */
  placement: XpEventDraft | null;
}

const CONSISTENCY: XpReason[] = ['workout_complete', 'working_sets', 'cardio_minutes', 'streak_bonus'];

export function finishSession(input: FinishInput, rules: XpRules = xpRules): FinishOutput {
  const { workout, exercises, ledger } = input;
  const at = workout.endedAt;
  const today = dayKey(at);
  const thisWeek = weekKey(at);

  const todaysEvents = ledger.filter((e) => dayKey(e.createdAt) === today);
  const todaysWorkouts = input.recentWorkouts.filter((w) => dayKey(w.endedAt) === today);
  const goalWeeks = ledger.filter((e) => e.reason === 'weekly_goal').map((e) => e.sourceId);
  const streak = streakWeeks(goalWeeks, at);
  const bodyweightKg = rollingBodyweight(input.bodyweightLogs, at, rules);

  // --- Placement: the first workout with a benchmark test places the user ------
  const placed = ledger.some((e) => e.reason === 'placement');
  const tests = placed
    ? []
    : placementTests([workout], { exercises, sex: input.profile.sex, bodyweightKg, birthYear: input.profile.birthYear }, rules);
  const placeNow = tests.length > 0;

  const seenActivities = new Set<string>();
  for (const id of input.seenExerciseIds) {
    const activity = exercises[id]?.activity;
    if (activity) seenActivities.add(activity);
  }

  const result = computeWorkoutXp(
    workout,
    {
      exercises,
      profile: input.profile,
      bodyweightKg,
      records: input.records,
      seenExerciseIds: input.seenExerciseIds,
      seenActivities,
      benchmarkUnlocks: input.benchmarkUnlocks,
      today: {
        consistencyXp: todaysEvents.filter((e) => CONSISTENCY.includes(e.reason)).reduce((s, e) => s + e.amount, 0),
        cardioMinutes: todaysWorkouts.reduce((s, w) => s + countCardioMinutes(w.sets, exercises), 0),
        prsCounted: todaysEvents.filter((e) => e.reason === 'personal_record').length,
      },
      streakWeeks: streak,
      deferBenchmarkXp: placeNow,
    },
    rules,
  );

  // Placement is awarded after the workout's own XP, topping total XP up to the placed rank's floor.
  const placement = placeNow
    ? placementEvent(
        {
          at,
          tests,
          totalXpSoFar: ledger.reduce((s, e) => s + e.amount, 0) + result.events.reduce((s, e) => s + e.amount, 0),
          tierXp: result.benchmarkUnlocks.reduce((s, u) => s + rules.progress.benchmarkTier[u.tier], 0),
        },
        rules,
      )
    : null;

  const trainingDays = input.recentWorkouts
    .filter((w) => weekKey(w.endedAt) === thisWeek && qualifiesAsWorkout(w.sets, exercises, rules))
    .map((w) => dayKey(w.endedAt));
  if (result.qualifies) trainingDays.push(today);

  const weeklyGoal = weeklyGoalEvent(
    {
      weekKey: thisWeek,
      trainingDayKeys: trainingDays,
      targetDays: input.profile.weeklyTargetDays,
      alreadyAwarded: goalWeeks.includes(thisWeek),
      at,
    },
    rules,
  );

  const performances: Performance[] = workout.sets.flatMap((set) => {
    const exercise = exercises[set.exerciseId];
    return exercise
      ? setMetrics(set, exercise, rules).map((m) => ({ ...m, exerciseId: set.exerciseId, achievedAt: set.completedAt }))
      : [];
  });
  const pending = ledger.flatMap((e) =>
    e.status === 'pending_review' && e.meta?.performance
      ? [{ id: e.id, createdAt: e.createdAt, performance: e.meta.performance }]
      : [],
  );

  return {
    result,
    weeklyGoal,
    events: [...result.events, ...(placement ? [placement] : []), ...(weeklyGoal ? [weeklyGoal] : [])],
    confirmedEventIds: confirmedPendingIds(pending, performances),
    streakWeeks: streak,
    bodyweightKg,
    placement,
  };
}
