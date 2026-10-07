import { asc, desc, eq, isNotNull, sql } from 'drizzle-orm';

import type { ExerciseInfo } from '@/engine/types';

import { db } from '../client';
import { exercises, workoutSets } from '../schema';

export type ExerciseRow = typeof exercises.$inferSelect;

export function listExercises(): ExerciseRow[] {
  return db.select().from(exercises).orderBy(asc(exercises.name)).all();
}

export function getExercise(id: string): ExerciseRow | null {
  return db.select().from(exercises).where(eq(exercises.id, id)).get() ?? null;
}

export function toExerciseInfo(row: ExerciseRow): ExerciseInfo {
  return {
    id: row.id,
    category: row.category,
    trackingType: row.trackingType,
    activity: row.activity ?? undefined,
    benchmarkId: row.benchmarkId ?? undefined,
  };
}

export function exerciseInfoMap(): Record<string, ExerciseInfo> {
  return Object.fromEntries(listExercises().map((row) => [row.id, toExerciseInfo(row)]));
}

export function toggleFavourite(id: string) {
  db.update(exercises)
    .set({ isFavourite: sql`NOT ${exercises.isFavourite}` })
    .where(eq(exercises.id, id))
    .run();
}

/** Most recently performed exercises, newest first. */
export function recentExerciseIds(limit = 8): string[] {
  return db
    .select({ id: workoutSets.exerciseId, last: sql<number>`max(${workoutSets.completedAt})` })
    .from(workoutSets)
    .where(isNotNull(workoutSets.completedAt))
    .groupBy(workoutSets.exerciseId)
    .orderBy(desc(sql`max(${workoutSets.completedAt})`))
    .limit(limit)
    .all()
    .map((r) => r.id);
}
