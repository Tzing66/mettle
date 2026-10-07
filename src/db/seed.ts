import catalogue from '@config/exercises.json';
import { sql } from 'drizzle-orm';

import type { ExerciseCategory, TrackingType } from '@/engine/types';

import { db } from './client';
import { exercises } from './schema';

interface CatalogueEntry {
  id: string;
  name: string;
  short: string;
  category: ExerciseCategory;
  trackingType: TrackingType;
  equipment: string | null;
  primaryMuscles: string[];
  activity?: string;
  benchmarkId?: string;
}

/** Upserts the built-in catalogue. Safe to run on every launch; keeps favourites. */
export function seedExercises() {
  const rows = (catalogue.exercises as CatalogueEntry[]).map((e) => ({
    id: e.id,
    name: e.name,
    shortName: e.short,
    category: e.category,
    trackingType: e.trackingType,
    equipment: e.equipment,
    primaryMuscles: e.primaryMuscles,
    activity: e.activity ?? null,
    benchmarkId: e.benchmarkId ?? null,
    isBuiltin: true,
  }));

  db.transaction((tx) => {
    for (const row of rows) {
      tx.insert(exercises)
        .values(row)
        .onConflictDoUpdate({
          target: exercises.id,
          set: {
            name: sql`excluded.name`,
            shortName: sql`excluded.short_name`,
            category: sql`excluded.category`,
            trackingType: sql`excluded.tracking_type`,
            equipment: sql`excluded.equipment`,
            primaryMuscles: sql`excluded.primary_muscles`,
            activity: sql`excluded.activity`,
            benchmarkId: sql`excluded.benchmark_id`,
          },
        })
        .run();
    }
  });
}

let seeded = false;

/** Seeds once per app launch. */
export function ensureSeeded() {
  if (seeded) return;
  seedExercises();
  seeded = true;
}
