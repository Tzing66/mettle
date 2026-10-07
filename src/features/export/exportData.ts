import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { listExercises } from '@/db/repositories/exercises';
import { completedSetsForWorkouts, listFinishedWorkouts } from '@/db/repositories/workouts';
import { dayKey } from '@/engine';

import { setsToCsv, type ExportSet } from './csv';

/** Every completed set from every finished workout, oldest first. */
export function buildWorkoutExport(): { csv: string; setCount: number } {
  const workouts = listFinishedWorkouts(100_000).reverse();
  const byId = new Map(workouts.map((w) => [w.id, w]));
  const exercises = new Map(listExercises().map((e) => [e.id, e]));
  const sets = completedSetsForWorkouts(workouts.map((w) => w.id)).sort(
    (a, b) => byId.get(a.workoutId)!.startedAt.getTime() - byId.get(b.workoutId)!.startedAt.getTime() || a.setIndex - b.setIndex,
  );

  const rows: ExportSet[] = sets.map((s) => {
    const w = byId.get(s.workoutId)!;
    const ex = exercises.get(s.exerciseId);
    return {
      workoutId: w.id,
      workoutStartedAt: w.startedAt,
      workoutEndedAt: w.endedAt!,
      exerciseName: ex?.name ?? s.exerciseId,
      category: ex?.category ?? '',
      setNumber: s.setIndex + 1,
      isWarmup: s.isWarmup,
      weightKg: s.weightKg,
      reps: s.reps,
      durationS: s.durationS,
      distanceM: s.distanceM,
      completedAt: s.completedAt,
    };
  });
  return { csv: setsToCsv(rows), setCount: rows.length };
}

/** Writes the CSV to the cache directory and opens the share sheet. */
export async function shareWorkoutExport(): Promise<{ setCount: number }> {
  const { csv, setCount } = buildWorkoutExport();
  const file = new File(Paths.cache, `mettle-workouts-${dayKey(Date.now())}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing isn’t available on this device.');
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Export workouts',
  });
  return { setCount };
}
