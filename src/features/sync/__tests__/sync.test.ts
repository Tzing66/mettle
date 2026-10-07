/**
 * Sync against a real SQLite database (same migrations and triggers as the
 * app) and an in-memory fake of the Supabase API.
 */
jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));
jest.mock('@/db/client', () => require('@/test/sqliteDb').createTestDbModule());

import { db } from '@/db/client';
import { getExercise, toggleFavourite } from '@/db/repositories/exercises';
import { addBodyweight, createProfile, getProfile, listBodyweight, updateProfile } from '@/db/repositories/profile';
import {
  addExerciseToWorkout,
  deleteSet,
  discardWorkout,
  listFinishedWorkouts,
  setCompleted,
  setsForWorkout,
  startWorkout,
  updateSet,
} from '@/db/repositories/workouts';
import { listLedger, totalXpFromDb } from '@/db/repositories/xp';
import { syncOutbox } from '@/db/schema';
import { ensureSeeded } from '@/db/seed';
import { finishWorkout } from '@/features/workout/finishWorkout';
import { computeServerLedger, type CloudProfile } from '@/server/recompute';
import { FakeCloud } from '@/test/fakeCloud';

import { getSyncState, linkAccount, pendingChangeCount, resetLocalForAccount, syncAccount, unlinkAccount, type SyncClient } from '../sync';

const USER = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 5, 18);

let cloud: FakeCloud;
const client = () => cloud as unknown as SyncClient;

function logWorkout(t: number, exerciseId: string, kg: number) {
  jest.setSystemTime(t);
  const id = startWorkout();
  addExerciseToWorkout(id, getExercise(exerciseId)!);
  for (const s of setsForWorkout(id)) {
    updateSet(s.id, { weightKg: kg, reps: 5 });
    setCompleted(s.id, true);
  }
  jest.setSystemTime(t + 40 * 60_000);
  finishWorkout(id);
  return id;
}

beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  jest.setSystemTime(T0 - DAY);
  ensureSeeded();
  createProfile({ displayName: 'Offline me', sexForStandards: 'male', birthYear: 1995, unitPref: 'kg', weeklyTargetDays: 3 }, 80);
  cloud = new FakeCloud();
});
afterAll(() => jest.useRealTimers());

describe('before signing in', () => {
  it('logging works offline and nothing is queued', () => {
    logWorkout(T0, 'bench_press', 60);
    logWorkout(T0 + DAY, 'back_squat', 80);
    toggleFavourite('deadlift');
    expect(pendingChangeCount()).toBe(0);
    expect(getSyncState().userId).toBeNull();
  });
});

describe('first sign-in', () => {
  it('links the phone and queues everything for upload', () => {
    expect(linkAccount(USER)).toBe('linked');
    expect(pendingChangeCount()).toBeGreaterThan(5);
    expect(linkAccount(USER)).toBe('same');
  });

  it('uploads profile, workouts, sets and bodyweight with the user id', async () => {
    const xpBefore = totalXpFromDb();
    const res = await syncAccount(client(), USER);
    expect(res.status).toBe('synced');
    expect(pendingChangeCount()).toBe(0);
    expect(cloud.rows('profiles')).toEqual([expect.objectContaining({ user_id: USER, display_name: 'Offline me', favourite_exercise_ids: ['deadlift'] })]);
    expect(cloud.rows('workouts')).toHaveLength(2);
    expect(cloud.rows('workout_sets').length).toBe(6);
    expect(cloud.rows('bodyweight_logs')).toHaveLength(1);
    expect(cloud.rows('workout_sets').every((r) => r.user_id === USER)).toBe(true);
    // Nothing remote to pull, so derived data is untouched.
    expect(totalXpFromDb()).toBe(xpBefore);
  });
});

describe('ongoing sync', () => {
  it('queues local edits and pushes them', async () => {
    updateProfile({ weeklyTargetDays: 5 });
    addBodyweight(81);
    expect(pendingChangeCount()).toBe(2);
    await syncAccount(client(), USER);
    expect(cloud.rows('profiles')[0].weekly_target_days).toBe(5);
    expect(cloud.rows('bodyweight_logs')).toHaveLength(2);
  });

  it('holds back unfinished workouts until they are finished', async () => {
    jest.setSystemTime(T0 + 2 * DAY);
    const id = startWorkout();
    addExerciseToWorkout(id, getExercise('deadlift')!);
    await syncAccount(client(), USER);
    expect(cloud.table('workouts').has(id)).toBe(false);
    expect(pendingChangeCount()).toBeGreaterThan(0);

    for (const s of setsForWorkout(id)) setCompleted(s.id, true);
    jest.setSystemTime(T0 + 2 * DAY + 30 * 60_000);
    finishWorkout(id);
    await syncAccount(client(), USER);
    expect(cloud.table('workouts').get(id)).toMatchObject({ ended_at: expect.any(String) });
    expect(cloud.rows('workout_sets').filter((r) => r.workout_id === id)).toHaveLength(3);
    expect(pendingChangeCount()).toBe(0);
  });

  it('a discarded never-synced workout leaves no trace in the cloud', async () => {
    const id = startWorkout();
    addExerciseToWorkout(id, getExercise('db_curl')!);
    discardWorkout(id);
    await syncAccount(client(), USER);
    expect(cloud.table('workouts').has(id)).toBe(false);
    expect(pendingChangeCount()).toBe(0);
  });

  it('local deletes become soft deletes', async () => {
    const workoutId = listFinishedWorkouts(1)[0].id;
    const set = setsForWorkout(workoutId)[0];
    deleteSet(set.id);
    await syncAccount(client(), USER);
    expect(cloud.table('workout_sets').get(set.id)?.deleted_at).toEqual(expect.any(String));
  });

  it('pulls changes made on another device without echoing them back', async () => {
    cloud.write('bodyweight_logs', 'from-tablet', { id: 'from-tablet', user_id: USER, weight_kg: 82, logged_at: new Date(T0 + 3 * DAY).toISOString(), deleted_at: null });
    const res = await syncAccount(client(), USER);
    expect(res.pulled).toBeGreaterThanOrEqual(1);
    expect(listBodyweight().some((b) => b.id === 'from-tablet')).toBe(true);
    expect(pendingChangeCount()).toBe(0);
  });

  it('a pending local edit wins over an older remote one', async () => {
    cloud.write('profiles', USER, { display_name: 'Tablet name' });
    updateProfile({ displayName: 'Phone name' });
    await syncAccount(client(), USER);
    expect(getProfile()?.displayName).toBe('Phone name');
    expect(cloud.rows('profiles')[0].display_name).toBe('Phone name');
  });
});

describe('restoring on a new phone', () => {
  it('rebuilds the same workouts and XP from the cloud', async () => {
    const before = { xp: totalXpFromDb(), workouts: listFinishedWorkouts().length, events: listLedger().length };
    resetLocalForAccount(USER);
    expect(totalXpFromDb()).toBe(0);
    expect(listFinishedWorkouts()).toHaveLength(0);

    const res = await syncAccount(client(), USER);
    expect(res.rebuilt).toBe(true);
    expect(listFinishedWorkouts()).toHaveLength(before.workouts);
    expect(totalXpFromDb()).toBe(before.xp);
    expect(listLedger()).toHaveLength(before.events);
    expect(getExercise('deadlift')?.isFavourite).toBe(true);
    expect(db.select().from(syncOutbox).all()).toEqual([]);
  });
});

describe('switching accounts', () => {
  it('refuses to mix another account’s data into this phone', async () => {
    expect(linkAccount(OTHER)).toBe('mismatch');
    expect((await syncAccount(client(), OTHER)).status).toBe('mismatch');
    expect(getSyncState().userId).toBe(USER);
  });
});

describe('server-side XP', () => {
  it('recomputing from the synced cloud rows gives the same XP as the phone', () => {
    const live = (rows: Record<string, unknown>[]) => rows.filter((r) => !r.deleted_at);
    const server = computeServerLedger({
      profile: cloud.rows('profiles')[0] as unknown as CloudProfile,
      workouts: live(cloud.rows('workouts')) as never,
      sets: live(cloud.rows('workout_sets')) as never,
      bodyweight: live(cloud.rows('bodyweight_logs')) as never,
      customExercises: live(cloud.rows('custom_exercises')) as never,
    });
    expect(cloud.rows('profiles')[0].utc_offset_minutes).toBe(0);
    expect(server.totalXp).toBe(totalXpFromDb());
    expect(server.events.length).toBe(listLedger().length);
  });
});

describe('after the account is deleted', () => {
  it('unlinking returns the phone to offline-only: nothing is queued, workouts stay', () => {
    const workouts = listFinishedWorkouts().length;
    unlinkAccount();
    expect(getSyncState().userId).toBeNull();
    addBodyweight(79);
    expect(pendingChangeCount()).toBe(0);
    expect(listFinishedWorkouts()).toHaveLength(workouts);
    expect(linkAccount(OTHER)).toBe('linked'); // a new account can now be linked
  });
});
