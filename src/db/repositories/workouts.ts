import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm';

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

/** Starts a workout immediately: the timer runs from now ("add exercises as you go"). */
export function startWorkout(): string {
  const id = newId();
  db.insert(workouts).values({ id, status: 'active', startedAt: new Date() }).run();
  return id;
}

/** Creates a workout in planning mode: set up exercises first, timer starts on beginWorkout. */
export function planWorkout(): string {
  const id = newId();
  db.insert(workouts).values({ id, status: 'planning', startedAt: new Date() }).run();
  return id;
}

/** Moves a planned workout to active and starts its clock now. */
export function beginWorkout(id: string) {
  db.update(workouts).set({ status: 'active', startedAt: new Date() }).where(eq(workouts.id, id)).run();
}

/** Plans a new workout with the same exercises and set targets as a finished one. */
export function repeatWorkout(sourceId: string): string {
  const source = db
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.workoutId, sourceId), isNotNull(workoutSets.completedAt)))
    .orderBy(sql`rowid`)
    .all();
  const id = planWorkout();
  db.transaction((tx) => {
    for (const s of source) {
      tx.insert(workoutSets)
        .values({
          id: newId(),
          workoutId: id,
          exerciseId: s.exerciseId,
          setIndex: s.setIndex,
          isWarmup: s.isWarmup,
          weightKg: s.weightKg,
          reps: s.reps,
          durationS: s.durationS,
          distanceM: s.distanceM,
        })
        .run();
    }
  });
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
function defaultSetValues(exercise: ExerciseRow): SetValues {
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

/** Sets a new exercise starts with when there's no history: 3 for strength, 1 for cardio and holds. */
function defaultSetCount(exercise: ExerciseRow): number {
  return exercise.trackingType === 'weight_reps' || exercise.trackingType === 'reps' ? 3 : 1;
}

/** Adds an exercise pre-filled with last session's sets (or sensible defaults). */
export function addExerciseToWorkout(workoutId: string, exercise: ExerciseRow) {
  const previous = lastSessionSets(exercise.id, workoutId);
  const values: SetValues[] = previous.length
    ? previous.map((s) => ({ isWarmup: s.isWarmup, weightKg: s.weightKg, reps: s.reps, durationS: s.durationS, distanceM: s.distanceM }))
    : Array.from({ length: defaultSetCount(exercise) }, () => defaultSetValues(exercise));
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

type NumericField = 'weightKg' | 'reps' | 'durationS' | 'distanceM';

/**
 * Edits one set and carries the change down to later, unfinished sets of the
 * same exercise that still had the old value. Change set 1 from 60 to 65 kg
 * and sets 2–3 (also 60) follow; a set you'd already made different stays put.
 */
export function updateSetCascade(id: string, field: NumericField, value: number | null) {
  const target = db.select().from(workoutSets).where(eq(workoutSets.id, id)).get();
  if (!target) return;
  const old = target[field];
  db.transaction((tx) => {
    tx.update(workoutSets).set({ [field]: value }).where(eq(workoutSets.id, id)).run();
    const later = tx
      .select()
      .from(workoutSets)
      .where(
        and(
          eq(workoutSets.workoutId, target.workoutId),
          eq(workoutSets.exerciseId, target.exerciseId),
          isNull(workoutSets.completedAt),
          gt(workoutSets.setIndex, target.setIndex),
        ),
      )
      .all();
    for (const s of later) {
      if (s[field] === old) tx.update(workoutSets).set({ [field]: value }).where(eq(workoutSets.id, s.id)).run();
    }
  });
}

/**
 * Sets how many sets an exercise has. Adds copies of the last set, or removes
 * unfinished sets from the end. Never removes completed sets or the last set.
 */
export function setSetCount(workoutId: string, exerciseId: string, count: number) {
  const sets = db
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.workoutId, workoutId), eq(workoutSets.exerciseId, exerciseId)))
    .orderBy(asc(workoutSets.setIndex))
    .all();
  const target = Math.max(1, count);
  if (target > sets.length) {
    for (let i = sets.length; i < target; i++) addSet(workoutId, exerciseId);
    return;
  }
  const removable = sets.filter((s) => s.completedAt === null).reverse();
  const toRemove = removable.slice(0, Math.min(sets.length - target, removable.length, sets.length - 1));
  if (toRemove.length) db.delete(workoutSets).where(inArray(workoutSets.id, toRemove.map((s) => s.id))).run();
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

/**
 * Deletes a workout and (by cascade) its sets. Sync triggers queue the
 * deletion. Callers rebuild derived data afterwards (features/workout/deleteWorkout).
 */
export function deleteWorkout(id: string) {
  db.delete(workouts).where(eq(workouts.id, id)).run();
}
