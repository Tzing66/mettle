// Routines: saved workouts you can start in one tap, and shared copies.
import { desc, eq } from 'drizzle-orm';

import { db } from '../client';
import { newId } from '../ids';
import { routines, workoutSets, type RoutineItem } from '../schema';

import { createCustomExercise, getExercise, listExercises } from './exercises';
import { defaultSetValues, groupByExercise, lastSessionSets, planWorkout, setsForWorkout } from './workouts';

export type RoutineRow = typeof routines.$inferSelect;

export const MAX_ROUTINE_EXERCISES = 40;

export function listRoutines(): RoutineRow[] {
  return db.select().from(routines).orderBy(desc(routines.updatedAt)).all();
}

export function getRoutine(id: string): RoutineRow | null {
  return db.select().from(routines).where(eq(routines.id, id)).get() ?? null;
}

export function createRoutine(name: string, items: RoutineItem[]): string {
  const id = newId();
  db.insert(routines).values({ id, name: name.trim().slice(0, 60), items: items.slice(0, MAX_ROUTINE_EXERCISES), updatedAt: new Date() }).run();
  return id;
}

export function renameRoutine(id: string, name: string) {
  db.update(routines).set({ name: name.trim().slice(0, 60), updatedAt: new Date() }).where(eq(routines.id, id)).run();
}

export function deleteRoutine(id: string) {
  db.delete(routines).where(eq(routines.id, id)).run();
}

/** A workout's exercises and sets as routine items (completed sets for a finished workout, all for a plan). */
export function routineItemsFromWorkout(workoutId: string, completedOnly: boolean): RoutineItem[] {
  const sets = setsForWorkout(workoutId).filter((s) => !completedOnly || s.completedAt);
  return groupByExercise(sets).map((g) => ({
    exerciseId: g.exerciseId,
    sets: g.sets.map((s) => ({ isWarmup: s.isWarmup, weightKg: s.weightKg, reps: s.reps, durationS: s.durationS, distanceM: s.distanceM })),
  }));
}

/**
 * Plans a workout from a routine. Weights come from the routine, except for
 * shared routines (no weights), which use your last session or a default.
 */
export function planFromRoutine(routineId: string): string | null {
  const routine = getRoutine(routineId);
  if (!routine) return null;
  const id = planWorkout();
  db.transaction((tx) => {
    for (const item of routine.items) {
      const exercise = getExercise(item.exerciseId);
      if (!exercise) continue; // deleted custom exercise, or one this app version doesn't have
      const previous = item.fillWeights ? lastSessionSets(exercise.id) : [];
      const sets = item.sets.length ? item.sets : [defaultSetValues(exercise)];
      sets.forEach((s, i) => {
        let weightKg = s.weightKg;
        if (item.fillWeights && exercise.trackingType === 'weight_reps') {
          weightKg = previous[i]?.weightKg ?? previous[previous.length - 1]?.weightKg ?? defaultSetValues(exercise).weightKg;
        } else if (item.fillWeights) {
          weightKg = previous[i]?.weightKg ?? null;
        }
        tx.insert(workoutSets)
          .values({ id: newId(), workoutId: id, exerciseId: exercise.id, setIndex: i, isWarmup: s.isWarmup, weightKg, reps: s.reps, durationS: s.durationS, distanceM: s.distanceM })
          .run();
      });
    }
  });
  return id;
}

// ---------------------------------------------------------------- sharing

/** Wire format for supabase share_routine / get_shared_routine. Never contains weights. */
export interface SharedItem {
  exercise_id: string;
  sets: { is_warmup?: boolean; reps?: number; duration_s?: number; distance_m?: number }[];
  custom?: { name: string; category: string; tracking_type: string };
}

export function toSharedItems(items: RoutineItem[]): SharedItem[] {
  return items.flatMap((item) => {
    const exercise = getExercise(item.exerciseId);
    if (!exercise) return [];
    return [
      {
        exercise_id: exercise.id,
        sets: item.sets.map((s) => ({
          is_warmup: s.isWarmup,
          ...(s.reps !== null ? { reps: s.reps } : {}),
          ...(s.durationS !== null ? { duration_s: s.durationS } : {}),
          ...(s.distanceM !== null ? { distance_m: s.distanceM } : {}),
        })),
        ...(exercise.isBuiltin ? {} : { custom: { name: exercise.name, category: exercise.category, tracking_type: exercise.trackingType } }),
      },
    ];
  });
}

const CATEGORIES = new Set(['free_weight', 'machine', 'bodyweight', 'cardio']);
const TRACKING = new Set(['weight_reps', 'reps', 'time', 'distance_time']);

/**
 * Turns shared items into routine items on this phone. A friend's custom
 * exercise becomes one of yours (reusing one with the same name and type).
 * Exercises this app doesn't know are skipped. Returns the items and how many were skipped.
 */
export function fromSharedItems(shared: SharedItem[]): { items: RoutineItem[]; skipped: number } {
  const mine = listExercises();
  const items: RoutineItem[] = [];
  let skipped = 0;
  for (const s of shared.slice(0, MAX_ROUTINE_EXERCISES)) {
    let exerciseId: string | null = null;
    if (s.custom) {
      const { name, category, tracking_type } = s.custom;
      if (!name?.trim() || !CATEGORIES.has(category) || !TRACKING.has(tracking_type)) {
        skipped++;
        continue;
      }
      const existing = mine.find((e) => !e.isBuiltin && e.name.toLowerCase() === name.trim().toLowerCase() && e.trackingType === tracking_type);
      exerciseId =
        existing?.id ??
        createCustomExercise({ name: name.slice(0, 80), category: category as never, trackingType: tracking_type as never }).id;
    } else if (getExercise(s.exercise_id)?.isBuiltin) {
      exerciseId = s.exercise_id;
    }
    if (!exerciseId) {
      skipped++;
      continue;
    }
    items.push({
      exerciseId,
      fillWeights: true,
      sets: (s.sets ?? []).slice(0, 20).map((x) => ({
        isWarmup: !!x.is_warmup,
        weightKg: null,
        reps: typeof x.reps === 'number' ? x.reps : null,
        durationS: typeof x.duration_s === 'number' ? x.duration_s : null,
        distanceM: typeof x.distance_m === 'number' ? x.distance_m : null,
      })),
    });
  }
  return { items, skipped };
}
