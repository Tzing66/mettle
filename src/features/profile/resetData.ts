import { sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { addBodyweight, listBodyweight } from '@/db/repositories/profile';
import { bodyweightLogs, workouts } from '@/db/schema';

/**
 * Wipes training data: workouts (and their sets), bodyweight history, XP,
 * records and benchmark unlocks. Keeps the account, profile, custom
 * exercises, favourites and group memberships.
 *
 * The current bodyweight is kept as one fresh entry, because strength
 * benchmarks need a bodyweight to score lifts.
 *
 * When the phone is linked to an account, the sync triggers queue every
 * deletion, so the cloud copy (and server leaderboard XP) reset on next sync.
 */
export function resetTrainingData() {
  const current = listBodyweight().at(-1)?.weightKg ?? null;
  db.transaction((tx) => {
    tx.delete(workouts).run(); // sets cascade
    tx.delete(bodyweightLogs).run();
    tx.run(sql`DELETE FROM xp_events`);
    tx.run(sql`DELETE FROM personal_records`);
    tx.run(sql`DELETE FROM benchmark_unlocks`);
  });
  if (current !== null) addBodyweight(current);
}
