// Pure CSV building for "export my data". Values stay in stored units
// (kg, metres, seconds) so the file is unambiguous; ISO timestamps in UTC.

import { estimateOneRepMax } from '@/engine';

export interface ExportSet {
  workoutId: string;
  workoutStartedAt: Date;
  workoutEndedAt: Date;
  exerciseName: string;
  category: string;
  setNumber: number;
  isWarmup: boolean;
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
  distanceM: number | null;
  completedAt: Date | null;
}

export const SET_COLUMNS = [
  'workout_id',
  'workout_started_at',
  'workout_ended_at',
  'exercise',
  'category',
  'set_number',
  'warmup',
  'weight_kg',
  'reps',
  'duration_s',
  'distance_m',
  'estimated_1rm_kg',
  'completed_at',
] as const;

export function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: readonly string[], rows: (string | number | boolean | null)[][]): string {
  return [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n') + '\n';
}

export function setsToCsv(sets: ExportSet[]): string {
  return toCsv(
    SET_COLUMNS,
    sets.map((s) => {
      const e1rm = s.isWarmup ? null : estimateOneRepMax(s.weightKg ?? undefined, s.reps ?? undefined);
      return [
        s.workoutId,
        s.workoutStartedAt.toISOString(),
        s.workoutEndedAt.toISOString(),
        s.exerciseName,
        s.category,
        s.setNumber,
        s.isWarmup,
        s.weightKg,
        s.reps,
        s.durationS,
        s.distanceM,
        e1rm === null ? null : Math.round(e1rm * 10) / 10,
        s.completedAt?.toISOString() ?? null,
      ];
    }),
  );
}
