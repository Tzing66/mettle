// Saving a workout that already happened. Live scoring assumes "now", so a
// past workout is scored by replaying history in order instead.
import { rebuildDerivedData } from '@/db/repositories/derived';
import { savePastWorkout } from '@/db/repositories/workouts';

/** Returns false (and deletes the workout) when no set has any values. */
export function savePast(workoutId: string, startedAt: Date, durationMin: number): boolean {
  const kept = savePastWorkout(workoutId, startedAt, new Date(startedAt.getTime() + durationMin * 60_000));
  if (kept === 0) return false;
  rebuildDerivedData();
  return true;
}
