// Recomputes XP ledger, personal records and benchmark unlocks from the sets.
// Derived data is never synced; each device rebuilds it after pulling history.

import { replayHistory } from '@/engine/replay';

import { db } from '../client';
import { newId } from '../ids';
import { benchmarkUnlocks, personalRecords, xpEvents } from '../schema';

import { exerciseInfoMap } from './exercises';
import { getProfile, listBodyweight } from './profile';
import { finishedWorkoutInputs } from './workouts';

export function rebuildDerivedData(): { events: number; xp: number } {
  const profile = getProfile();
  if (!profile) return { events: 0, xp: 0 };

  const out = replayHistory({
    profile: { sex: profile.sexForStandards, birthYear: profile.birthYear, weeklyTargetDays: profile.weeklyTargetDays },
    exercises: exerciseInfoMap(),
    bodyweightLogs: listBodyweight().map((l) => ({ weightKg: l.weightKg, loggedAt: l.loggedAt.getTime() })),
    workouts: finishedWorkoutInputs(new Date(0)),
  });

  db.transaction((tx) => {
    tx.delete(xpEvents).run();
    tx.delete(personalRecords).run();
    tx.delete(benchmarkUnlocks).run();
    for (const e of out.events) {
      tx.insert(xpEvents).values({ ...e, id: newId(), createdAt: new Date(e.createdAt), meta: e.meta ?? null }).run();
    }
    for (const r of out.records) tx.insert(personalRecords).values({ ...r, achievedAt: new Date(r.achievedAt) }).run();
    for (const u of out.unlocks) tx.insert(benchmarkUnlocks).values({ ...u, unlockedAt: new Date(u.unlockedAt) }).run();
  });

  return { events: out.events.length, xp: out.events.reduce((s, e) => s + e.amount, 0) };
}
