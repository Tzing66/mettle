import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm';

import type { SetInput, WorkoutInput } from '@/engine/types';

import { db } from '../client';
import { newId } from '../ids';
import { personalRecords, workoutSets, workouts } from '../schema';
import type { ExerciseRow } from './exercises';

export type WorkoutRow = typeof workouts.$inferSelect;
export type SetRow = typeof workoutSets.$inferSelect;

export function getActiveWorkout(): WorkoutRow | null {
  return db.select().from(workouts).where(isNull(workouts.endedAt)).orderBy(desc(workouts.startedAt)).get() ?? null;
}

export function getWorkout(id: string): WorkoutRow | null {
  return db.select().from(workouts).where(eq(workouts.id, id)).get() ?? null;
}

export function startWorkout(): string {
  const id = newId();
  db.insert(workouts).values({ id, startedAt: new Date() }).run();
  return id;
}

export function discardWorkout(id: string) {
  db.delete(workouts).where(eq(workouts.id, id)).run();
}

/** Sets in insertion order, so exercises appear in the order they were added. */
export function setsForWorkout(workoutId: string): SetRow[] {
  return db.select().from(workoutSets).where(eq(workoutSets.workoutId, workoutId)).orderBy(sql`rowid`).all();
}

/** Groups sets by exercise, preserving first-appearance order. */
export function groupByExercise(sets: SetRow[]): { exerciseId: string; sets: SetRow[] }[] {
  const groups = new Map<string, SetRow[]>();
  for (const s of sets) {
    const list = groups.get(s.exerciseId) ?? [];
    list.push(s);
    groups.set(s.exerciseId, list);
  }
  return [...groups].map(([exerciseId, list]) => ({
    exerciseId,
    sets: list.sort((a, b) => a.setIndex - b.setIndex),
  }));
}

/** Sets from the most recent finished workout that included this exercise. */
export function lastSessionSets(exerciseId: string, excludeWorkoutId?: string): SetRow[] {
  const last = db
    .select({ workoutId: workoutSets.workoutId })
    .from(workoutSets)
    .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
    .where(
      and(
        eq(workoutSets.exerciseId, exerciseId),
        isNotNull(workouts.endedAt),
        isNotNull(workoutSets.completedAt),
        excludeWorkoutId ? ne(workouts.id, excludeWorkoutId) : undefined,
      ),
    )
    .orderBy(desc(workouts.endedAt))
    .get();
  if (!last) return [];
  return db
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.workoutId, last.workoutId), eq(workoutSets.exerciseId, exerciseId), isNotNull(workoutSets.completedAt)))
    .orderBy(asc(workoutSets.setIndex))
    .all();
}

type SetValues = Pick<SetRow, 'isWarmup' | 'weightKg' | 'reps' | 'durationS' | 'distanceM'>;

/** Starting values for an exercise you've never logged. */
export function defaultSetValues(exercise: ExerciseRow): SetValues {
  const base = { isWarmup: false, weightKg: null, reps: null, durationS: null, distanceM: null };
  switch (exercise.trackingType) {
    case 'weight_reps': {
      const weightKg = exercise.equipment === 'dumbbell' ? 10 : exercise.equipment === 'kettlebells' ? 12 : 20;
      return { ...base, weightKg, reps: 8 };
    }
    case 'reps':
      return { ...base, reps: 10 };
    case 'time':
      return { ...base, durationS: exercise.category === 'cardio' ? 15 * 60 : 30 };
    case 'distance_time':
      return { ...base, distanceM: exercise.activity === 'swim' ? 400 : exercise.activity === 'cycle' ? 10000 : 5000, durationS: 30 * 60 };
  }
}

/** Adds an exercise pre-filled with last session's sets (or sensible defaults). */
export function addExerciseToWorkout(workoutId: string, exercise: ExerciseRow) {
  const previous = lastSessionSets(exercise.id, workoutId);
  const values: SetValues[] = previous.length
    ? previous.map((s) => ({ isWarmup: s.isWarmup, weightKg: s.weightKg, reps: s.reps, durationS: s.durationS, distanceM: s.distanceM }))
    : [defaultSetValues(exercise)];
  db.transaction((tx) => {
    values.forEach((v, i) => {
      tx.insert(workoutSets).values({ id: newId(), workoutId, exerciseId: exercise.id, setIndex: i, ...v }).run();
    });
  });
}

/** Adds one more set, copying the last set of that exercise ("repeat set"). */
export function addSet(workoutId: string, exerciseId: string): string {
  const existing = db
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.workoutId, workoutId), eq(workoutSets.exerciseId, exerciseId)))
    .orderBy(desc(workoutSets.setIndex))
    .get();
  const id = newId();
  db.insert(workoutSets)
    .values({
      id,
      workoutId,
      exerciseId,
      setIndex: (existing?.setIndex ?? -1) + 1,
      isWarmup: false,
      weightKg: existing?.weightKg ?? null,
      reps: existing?.reps ?? null,
      durationS: existing?.durationS ?? null,
      distanceM: existing?.distanceM ?? null,
    })
    .run();
  return id;
}

export function updateSet(id: string, patch: Partial<SetValues>) {
  db.update(workoutSets).set(patch).where(eq(workoutSets.id, id)).run();
}

export function setCompleted(id: string, completed: boolean) {
  db.update(workoutSets)
    .set({ completedAt: completed ? new Date() : null })
    .where(eq(workoutSets.id, id))
    .run();
}

export function deleteSet(id: string) {
  db.delete(workoutSets).where(eq(workoutSets.id, id)).run();
}

export function removeExerciseFromWorkout(workoutId: string, exerciseId: string) {
  db.delete(workoutSets).where(and(eq(workoutSets.workoutId, workoutId), eq(workoutSets.exerciseId, exerciseId))).run();
}

export function listFinishedWorkouts(limit = 200): WorkoutRow[] {
  return db.select().from(workouts).where(isNotNull(workouts.endedAt)).orderBy(desc(workouts.endedAt)).limit(limit).all();
}

export function completedSetsForWorkouts(workoutIds: string[]): SetRow[] {
  if (workoutIds.length === 0) return [];
  return db
    .select()
    .from(workoutSets)
    .where(and(inArray(workoutSets.workoutId, workoutIds), isNotNull(workoutSets.completedAt)))
    .orderBy(asc(workoutSets.completedAt))
    .all();
}

export function toSetInput(s: SetRow): SetInput {
  return {
    id: s.id,
    exerciseId: s.exerciseId,
    isWarmup: s.isWarmup,
    weightKg: s.weightKg ?? undefined,
    reps: s.reps ?? undefined,
    durationS: s.durationS ?? undefined,
    distanceM: s.distanceM ?? undefined,
    completedAt: (s.completedAt ?? new Date()).getTime(),
  };
}

/** Finished workouts ending at or after `since`, with their completed sets, as engine input. */
export function finishedWorkoutInputs(since: Date): WorkoutInput[] {
  const rows = db
    .select()
    .from(workouts)
    .where(and(isNotNull(workouts.endedAt), gte(workouts.endedAt, since)))
    .all();
  const sets = completedSetsForWorkouts(rows.map((w) => w.id));
  return rows.map((w) => ({
    id: w.id,
    startedAt: w.startedAt.getTime(),
    endedAt: w.endedAt!.getTime(),
    sets: sets.filter((s) => s.workoutId === w.id).map(toSetInput),
  }));
}

/** Exercises that appear in any finished workout. */
export function seenExerciseIds(): string[] {
  return db
    .selectDistinct({ id: workoutSets.exerciseId })
    .from(workoutSets)
    .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
    .where(and(isNotNull(workouts.endedAt), isNotNull(workoutSets.completedAt)))
    .all()
    .map((r) => r.id);
}

export function listRecords() {
  return db.select().from(personalRecords).all();
}

/** Completed working sets for one exercise across finished workouts, oldest first. */
export function exerciseHistory(exerciseId: string): (SetRow & { endedAt: Date })[] {
  return db
    .select({ set: workoutSets, endedAt: workouts.endedAt })
    .from(workoutSets)
    .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
    .where(and(eq(workoutSets.exerciseId, exerciseId), isNotNull(workouts.endedAt), isNotNull(workoutSets.completedAt), eq(workoutSets.isWarmup, false)))
    .orderBy(asc(workouts.endedAt))
    .all()
    .map((r) => ({ ...r.set, endedAt: r.endedAt! }));
}
