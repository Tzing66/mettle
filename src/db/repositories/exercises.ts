import { asc, desc, eq, isNotNull, sql } from 'drizzle-orm';

import type { ExerciseInfo } from '@/engine/types';

import { db } from '../client';
import { newId } from '../ids';
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

/** Initials of the name (max 3 letters), extended until it doesn't clash with an existing code. */
export function shortCodeFor(name: string, taken: Set<string>): string {
  const words = name.replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const initials = words.map((w) => w[0].toUpperCase()).join('').slice(0, 3) || 'EX';
  const pool = words.join('').toUpperCase() || 'EX';
  let code = initials.length >= 2 ? initials : pool.slice(0, 2);
  for (let i = 0; taken.has(code); i++) code = i < pool.length ? initials.slice(0, 2) + pool[i] : `${initials.slice(0, 2)}${i}`;
  return code;
}

export interface CustomExerciseInput {
  name: string;
  category: ExerciseRow['category'];
  trackingType: ExerciseRow['trackingType'];
}

/** User-created exercise. Never touched by the catalogue seed; earns normal XP but no benchmarks. */
export function createCustomExercise({ name, category, trackingType }: CustomExerciseInput): ExerciseRow {
  const taken = new Set(listExercises().map((e) => e.shortName));
  const row = {
    id: `custom_${newId()}`,
    name: name.trim(),
    shortName: shortCodeFor(name, taken),
    category,
    trackingType,
    equipment: null,
    primaryMuscles: [],
    activity: null,
    benchmarkId: null,
    isFavourite: false,
    isBuiltin: false,
  };
  db.insert(exercises).values(row).run();
  return getExercise(row.id)!;
}
