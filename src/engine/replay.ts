// Rebuilds every derived fact (XP ledger, personal records, benchmark unlocks)
// by replaying finished workouts in order through finishSession. Used after a
// sync brings in workouts from another device, and whenever derived data has
// to be recomputed from the source of truth (the sets).

import { xpRules, type XpRules } from './config';
import type { BodyweightLog } from './plausibility';
import { finishSession, type FinishInput, type LedgerEvent } from './session';
import type { BenchmarkUnlock, ExerciseInfo, PersonalRecord, WorkoutInput } from './types';

export interface ReplayInput {
  profile: FinishInput['profile'];
  exercises: Record<string, ExerciseInfo>;
  bodyweightLogs: BodyweightLog[];
  /** Finished workouts with their completed sets, any order. */
  workouts: WorkoutInput[];
}

export interface ReplayOutput {
  /** Ledger in creation order; each event carries meta.workoutId. */
  events: LedgerEvent[];
  records: PersonalRecord[];
  unlocks: BenchmarkUnlock[];
}

export function replayHistory(input: ReplayInput, rules: XpRules = xpRules): ReplayOutput {
  const workouts = [...input.workouts].sort((a, b) => a.endedAt - b.endedAt || a.id.localeCompare(b.id));
  const ledger: LedgerEvent[] = [];
  const records = new Map<string, PersonalRecord>();
  const unlocks: BenchmarkUnlock[] = [];
  const seen = new Set<string>();
  const done: WorkoutInput[] = [];
  let n = 0;

  for (const workout of workouts) {
    if (workout.sets.length === 0) continue;
    const out = finishSession(
      {
        workout,
        profile: input.profile,
        exercises: input.exercises,
        bodyweightLogs: input.bodyweightLogs,
        records: [...records.values()],
        seenExerciseIds: [...seen],
        recentWorkouts: done,
        ledger,
        benchmarkUnlocks: unlocks,
      },
      rules,
    );

    for (const id of out.confirmedEventIds) {
      const e = ledger.find((x) => x.id === id);
      if (!e) continue;
      e.status = 'granted';
      if (e.reason === 'benchmark_tier') {
        const [benchmarkId, tier] = e.sourceId.split(':');
        const u = unlocks.find((x) => x.benchmarkId === benchmarkId && x.tier === tier);
        if (u) u.status = 'granted';
      }
    }
    for (const e of out.events) ledger.push({ ...e, id: `replay-${++n}`, meta: { ...e.meta, workoutId: workout.id } });
    for (const { record } of out.result.records) records.set(`${record.exerciseId}|${record.metric}`, record);
    unlocks.push(...out.result.benchmarkUnlocks);
    for (const s of workout.sets) seen.add(s.exerciseId);
    done.push(workout);
  }

  return { events: ledger, records: [...records.values()], unlocks };
}
