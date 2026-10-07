// Loads everything the engine needs, runs finishSession, and writes the
// results in one transaction. All game logic lives in src/engine.

import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { newId } from '@/db/ids';
import { exerciseInfoMap, listExercises } from '@/db/repositories/exercises';
import { getProfile, listBodyweight } from '@/db/repositories/profile';
import {
  completedSetsForWorkouts,
  finishedWorkoutInputs,
  getWorkout,
  listRecords,
  seenExerciseIds,
  toSetInput,
} from '@/db/repositories/workouts';
import { listBenchmarkUnlocks, listLedger, toLedgerEvent, totalXpFromDb } from '@/db/repositories/xp';
import { benchmarkUnlocks, personalRecords, workoutSets, workouts, xpEvents } from '@/db/schema';
import {
  findBenchmark,
  finishSession,
  rankChange,
  weekStart,
  type BenchmarkUnlock,
  type RankChange,
  type RecordOutcome,
  type XpEventDraft,
} from '@/engine';

export interface WorkoutSummary {
  workoutId: string;
  durationMs: number;
  exerciseCount: number;
  setCount: number;
  volumeKg: number;
  events: XpEventDraft[];
  prs: (Extract<RecordOutcome, { kind: 'pr' }> & { exerciseName: string })[];
  unlocks: (BenchmarkUnlock & { benchmarkName: string })[];
  rank: RankChange;
  xpGained: number;
  capped: boolean;
  streakWeeks: number;
}

/** Ends the workout. Returns null (and deletes the workout) if no sets were completed. */
export function finishWorkout(workoutId: string): WorkoutSummary | null {
  const workout = getWorkout(workoutId);
  const profile = getProfile();
  if (!workout || !profile) return null;

  const endedAt = Date.now();
  const sets = completedSetsForWorkouts([workoutId]).map(toSetInput);
  if (sets.length === 0) {
    db.delete(workouts).where(eq(workouts.id, workoutId)).run();
    return null;
  }

  const exercises = exerciseInfoMap();
  const ledger = listLedger().map(toLedgerEvent);
  const xpBefore = totalXpFromDb();

  const out = finishSession({
    workout: { id: workoutId, startedAt: workout.startedAt.getTime(), endedAt, sets },
    profile: { sex: profile.sexForStandards, birthYear: profile.birthYear, weeklyTargetDays: profile.weeklyTargetDays },
    exercises,
    bodyweightLogs: listBodyweight().map((l) => ({ weightKg: l.weightKg, loggedAt: l.loggedAt.getTime() })),
    records: listRecords().map((r) => ({ ...r, achievedAt: r.achievedAt.getTime() })),
    seenExerciseIds: seenExerciseIds(),
    recentWorkouts: finishedWorkoutInputs(new Date(weekStart(endedAt))),
    ledger,
    benchmarkUnlocks: listBenchmarkUnlocks().map((u) => ({ benchmarkId: u.benchmarkId, tier: u.tier as BenchmarkUnlock['tier'] })),
  });

  db.transaction((tx) => {
    tx.update(workouts).set({ endedAt: new Date(endedAt) }).where(eq(workouts.id, workoutId)).run();
    tx.delete(workoutSets).where(and(eq(workoutSets.workoutId, workoutId), isNull(workoutSets.completedAt))).run();

    for (const e of out.events) {
      // Tag every event (including the weekly goal) with the workout that earned it.
      tx.insert(xpEvents).values({ ...e, id: newId(), createdAt: new Date(e.createdAt), meta: { ...e.meta, workoutId } }).run();
    }

    for (const { record } of out.result.records) {
      tx.insert(personalRecords)
        .values({ ...record, achievedAt: new Date(record.achievedAt) })
        .onConflictDoUpdate({
          target: [personalRecords.exerciseId, personalRecords.metric],
          set: { value: record.value, setId: record.setId, achievedAt: new Date(record.achievedAt) },
        })
        .run();
    }

    for (const u of out.result.benchmarkUnlocks) {
      tx.insert(benchmarkUnlocks).values({ ...u, unlockedAt: new Date(u.unlockedAt) }).onConflictDoNothing().run();
    }

    if (out.confirmedEventIds.length) {
      tx.update(xpEvents).set({ status: 'granted' }).where(inArray(xpEvents.id, out.confirmedEventIds)).run();
      const confirmedTiers = ledger
        .filter((e) => out.confirmedEventIds.includes(e.id) && e.reason === 'benchmark_tier')
        .map((e) => e.sourceId);
      for (const key of confirmedTiers) {
        const [benchmarkId, tier] = key.split(':');
        tx.update(benchmarkUnlocks)
          .set({ status: 'granted' })
          .where(and(eq(benchmarkUnlocks.benchmarkId, benchmarkId), eq(benchmarkUnlocks.tier, tier)))
          .run();
      }
    }
  });

  const xpGained = out.events.reduce((s, e) => s + e.amount, 0);
  const names = new Map(listExercises().map((e) => [e.id, e.name]));
  const exerciseIds = new Set(sets.map((s) => s.exerciseId));

  return {
    workoutId,
    durationMs: endedAt - workout.startedAt.getTime(),
    exerciseCount: exerciseIds.size,
    setCount: sets.filter((s) => !s.isWarmup).length,
    volumeKg: sets.reduce((v, s) => v + (s.isWarmup ? 0 : (s.weightKg ?? 0) * (s.reps ?? 0)), 0),
    events: out.events,
    prs: out.result.records
      .filter((o): o is Extract<RecordOutcome, { kind: 'pr' }> => o.kind === 'pr')
      .map((o) => ({ ...o, exerciseName: names.get(o.record.exerciseId) ?? o.record.exerciseId })),
    unlocks: out.result.benchmarkUnlocks.map((u) => ({ ...u, benchmarkName: findBenchmark(u.benchmarkId)?.name ?? u.benchmarkId })),
    rank: rankChange(xpBefore, xpBefore + xpGained),
    xpGained,
    capped: out.result.capped,
    streakWeeks: out.streakWeeks,
  };
}

/** Workout count, for the "first workout" empty states. */
export function finishedWorkoutCount(): number {
  return db.select({ n: sql<number>`count(*)` }).from(workouts).where(sql`${workouts.endedAt} is not null`).get()?.n ?? 0;
}
