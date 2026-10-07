import { rebuildDerivedData } from '@/db/repositories/derived';
import { deleteWorkout } from '@/db/repositories/workouts';
import { requestSync } from '@/features/sync/useSync';

/**
 * Deletes a finished workout everywhere: its sets go, XP/records/unlocks are
 * rebuilt from the remaining history (so totals and PRs stay consistent), and
 * the deletion syncs so the server re-scores leaderboard XP.
 */
export function deleteFinishedWorkout(id: string) {
  deleteWorkout(id);
  rebuildDerivedData();
  requestSync();
}
