/**
 * Integration test: the real repositories and finishWorkout against a real
 * SQLite database (better-sqlite3 in Node instead of expo-sqlite on device;
 * both use drizzle's synchronous SQLite API and the same migrations).
 */
jest.mock('expo-crypto', () => ({ randomUUID: () => require('node:crypto').randomUUID() }));
jest.mock('expo-file-system', () => ({}));
jest.mock('expo-sharing', () => ({}));

jest.mock('@/db/client', () => require('@/test/sqliteDb').createTestDbModule());

import { createCustomExercise, getExercise, listExercises, recentExerciseIds, shortCodeFor, toggleFavourite } from '@/db/repositories/exercises';
import { createProfile, getProfile } from '@/db/repositories/profile';
import {
  addExerciseToWorkout,
  addSet,
  beginWorkout,
  discardWorkout,
  exerciseHistory,
  getActiveWorkout,
  listRecords,
  planWorkout,
  repeatWorkout,
  setCompleted,
  setSetCount,
  setsForWorkout,
  startWorkout,
  updateSet,
  updateSetCascade,
} from '@/db/repositories/workouts';
import { listBenchmarkUnlocks, listLedger, totalXpFromDb, weeklyGoalWeeks, xpByDay, xpByWorkout } from '@/db/repositories/xp';
import { ensureSeeded, seedExercises } from '@/db/seed';
import { rebuildDerivedData } from '@/db/repositories/derived';
import { buildWorkoutExport } from '@/features/export/exportData';
import { finishWorkout } from '@/features/workout/finishWorkout';

const DAY = 86_400_000;
// Monday 2026-10-05, 18:00 UTC (tests run with TZ=UTC).
const MONDAY = Date.UTC(2026, 9, 5, 18);

function at(ms: number) {
  jest.setSystemTime(ms);
}

/** Logs a workout of `sets` [kg, reps] for one exercise at time `t`, completing every set. */
function logLifts(t: number, exerciseId: string, sets: [number, number][]) {
  at(t);
  const id = startWorkout();
  addExerciseToWorkout(id, getExercise(exerciseId)!);
  const rows = setsForWorkout(id);
  sets.forEach(([kg, reps], i) => {
    const setId = rows[i]?.id ?? addSet(id, exerciseId);
    updateSet(setId, { weightKg: kg, reps });
  });
  at(t + 30 * 60_000);
  for (const s of setsForWorkout(id)) setCompleted(s.id, true);
  at(t + 45 * 60_000);
  return { id, summary: finishWorkout(id) };
}

beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  at(MONDAY - DAY);
  ensureSeeded();
  createProfile(
    { displayName: 'Test', sexForStandards: 'male', birthYear: 1998, heightCm: 180, unitPref: 'kg', weeklyTargetDays: 3 },
    75,
  );
});

afterAll(() => jest.useRealTimers());

describe('catalogue seed', () => {
  it('seeds the curated catalogue', () => {
    const all = listExercises();
    expect(all.length).toBeGreaterThanOrEqual(80);
    expect(getExercise('bench_press')).toMatchObject({ shortName: 'BP', benchmarkId: 'bench_press', category: 'free_weight' });
  });

  it('re-seeding is idempotent and keeps favourites', () => {
    toggleFavourite('deadlift');
    const before = listExercises().length;
    seedExercises();
    expect(listExercises().length).toBe(before);
    expect(getExercise('deadlift')?.isFavourite).toBe(true);
  });
});

describe('profile', () => {
  it('stores onboarding answers', () => {
    expect(getProfile()).toMatchObject({ displayName: 'Test', weeklyTargetDays: 3, sexForStandards: 'male' });
  });
});

describe('workout flow', () => {
  it('new exercises start with sensible defaults', () => {
    at(MONDAY);
    const id = startWorkout();
    addExerciseToWorkout(id, getExercise('db_curl')!);
    const sets = setsForWorkout(id);
    expect(sets).toHaveLength(3);
    expect(sets.every((x) => x.weightKg === 10 && x.reps === 8 && x.completedAt === null)).toBe(true);
  });

  it('finishing with nothing completed discards the workout', () => {
    const active = getActiveWorkout()!;
    expect(finishWorkout(active.id)).toBeNull();
    expect(getActiveWorkout()).toBeNull();
  });

  it('cardio starts with a single set', () => {
    const id = startWorkout();
    addExerciseToWorkout(id, getExercise('outdoor_run')!);
    expect(setsForWorkout(id)).toHaveLength(1);
    discardWorkout(id);
  });

  it('first bench session: baseline, first-exercise XP and benchmark tiers', () => {
    // 80 × 5 → e1RM 93.3 kg at 75 kg = 1.24× → beginner, novice (intermediate is 1.25×).
    const { id, summary } = logLifts(MONDAY, 'bench_press', [
      [80, 5],
      [80, 5],
      [80, 5],
    ]);
    expect(summary).not.toBeNull();
    const reasons = Object.fromEntries(summary!.events.filter((e) => e.reason !== 'benchmark_tier').map((e) => [e.reason, e.amount]));
    expect(reasons).toEqual({ workout_complete: 50, working_sets: 15, first_exercise: 20 });
    expect(summary!.unlocks.map((u) => u.tier)).toEqual(['beginner', 'novice']);
    expect(summary!.prs).toEqual([]);

    expect(totalXpFromDb()).toBe(summary!.xpGained);
    expect(summary!.xpGained).toBe(50 + 15 + 20 + 250 + 750);
    expect(xpByWorkout([id]).get(id)).toBe(summary!.xpGained);
    expect(listRecords()).toEqual([expect.objectContaining({ exerciseId: 'bench_press', metric: 'e1rm' })]);
    expect(listBenchmarkUnlocks()).toHaveLength(2);
    expect(summary!.rank.rankUp).toBe(false); // 1,085 XP: still E
  });

  it('next session pre-fills from last time and a heavier set is a PR', () => {
    at(MONDAY + DAY);
    const id = startWorkout();
    addExerciseToWorkout(id, getExercise('bench_press')!);
    expect(setsForWorkout(id).map((s) => [s.weightKg, s.reps])).toEqual([
      [80, 5],
      [80, 5],
      [80, 5],
    ]);
    const [first, second] = setsForWorkout(id);
    updateSet(first.id, { weightKg: 82.5 });
    setCompleted(first.id, true);
    setCompleted(second.id, true);
    at(MONDAY + DAY + 40 * 60_000);
    const summary = finishWorkout(id)!;

    expect(summary.prs).toEqual([expect.objectContaining({ exerciseName: 'Bench press' })]);
    expect(summary.events.find((e) => e.reason === 'personal_record')).toMatchObject({ amount: 25, status: 'granted' });
    // The unfinished third set was dropped; only 2 working sets → no completion bonus.
    expect(setsForWorkout(id)).toHaveLength(2);
    expect(summary.events.some((e) => e.reason === 'workout_complete')).toBe(false);
  });

  it('third training day hits the weekly goal', () => {
    const { summary } = logLifts(MONDAY + 2 * DAY, 'back_squat', [
      [60, 5],
      [60, 5],
      [60, 5],
    ]);
    // Tue had only 2 working sets (no completion), so Mon + Wed = 2 days: not yet.
    expect(summary!.events.some((e) => e.reason === 'weekly_goal')).toBe(false);

    const thu = logLifts(MONDAY + 3 * DAY, 'deadlift', [
      [100, 5],
      [100, 5],
      [100, 5],
    ]);
    expect(thu.summary!.events.find((e) => e.reason === 'weekly_goal')).toMatchObject({ amount: 100, sourceId: '2026-10-05' });
    expect(weeklyGoalWeeks()).toEqual(['2026-10-05']);
  });

  it('a big jump is pending, then confirmed by a repeat performance', () => {
    // Squat best is 70 e1RM from Wednesday; 90 × 3 → 99 e1RM is +41% within 30 days.
    const jump = logLifts(MONDAY + 4 * DAY, 'back_squat', [
      [90, 3],
      [90, 3],
      [90, 3],
    ]);
    const pr = jump.summary!.events.find((e) => e.reason === 'personal_record');
    expect(pr?.status).toBe('pending_review');
    expect(listLedger().some((e) => e.status === 'pending_review')).toBe(true);

    logLifts(MONDAY + 7 * DAY, 'back_squat', [
      [90, 3],
      [90, 3],
      [90, 3],
    ]);
    const stillPending = listLedger().filter((e) => e.status === 'pending_review' && e.reason === 'personal_record');
    expect(stillPending).toEqual([]);
  });

  it('history queries line up with the ledger', () => {
    const days = xpByDay(new Date(MONDAY - DAY));
    expect([...days.values()].reduce((a, b) => a + b, 0)).toBe(totalXpFromDb());
    expect(recentExerciseIds()).toEqual(expect.arrayContaining(['bench_press', 'back_squat', 'deadlift']));
    expect(exerciseHistory('bench_press').length).toBe(5);
  });
});

describe('planning and fast set entry', () => {
  it('a planned workout starts its clock only when begun', () => {
    at(MONDAY + 10 * DAY);
    const id = planWorkout();
    expect(getActiveWorkout()).toMatchObject({ id, status: 'planning' });
    addExerciseToWorkout(id, getExercise('overhead_press')!);
    at(MONDAY + 10 * DAY + 15 * 60_000); // 15 minutes of setting up
    beginWorkout(id);
    expect(getActiveWorkout()).toMatchObject({ status: 'active' });
    expect(getActiveWorkout()!.startedAt.getTime()).toBe(MONDAY + 10 * DAY + 15 * 60_000);
  });

  it('editing a set carries down to later sets that still matched', () => {
    const id = getActiveWorkout()!.id;
    const [a, b, c] = setsForWorkout(id);
    updateSet(c.id, { reps: 6 }); // set 3 was customised
    updateSetCascade(a.id, 'weightKg', 40);
    updateSetCascade(a.id, 'reps', 10);
    const after = setsForWorkout(id);
    expect(after.map((x) => x.weightKg)).toEqual([40, 40, 40]);
    expect(after.map((x) => x.reps)).toEqual([10, 10, 6]);
    expect(b.id).toBe(after[1].id);
  });

  it('completed sets are never changed by a cascade', () => {
    const id = getActiveWorkout()!.id;
    const [a, b] = setsForWorkout(id);
    setCompleted(b.id, true);
    updateSetCascade(a.id, 'weightKg', 45);
    expect(setsForWorkout(id).map((x) => x.weightKg)).toEqual([45, 40, 45]);
  });

  it('set count adds copies and trims unfinished sets from the end', () => {
    const id = getActiveWorkout()!.id;
    setSetCount(id, 'overhead_press', 5);
    expect(setsForWorkout(id)).toHaveLength(5);
    setSetCount(id, 'overhead_press', 1);
    // Set 2 is completed, so it stays; set 1 is kept as the minimum.
    const left = setsForWorkout(id);
    expect(left.some((x) => x.completedAt)).toBe(true);
    expect(left.length).toBeGreaterThanOrEqual(1);
    expect(left.length).toBeLessThan(5);
    finishWorkout(id);
  });

  it('repeat last workout plans the same exercises and sets', () => {
    const last = logLifts(MONDAY + 12 * DAY, 'barbell_row', [
      [50, 8],
      [55, 8],
      [55, 6],
    ]);
    const id = repeatWorkout(last.id);
    expect(getActiveWorkout()).toMatchObject({ id, status: 'planning' });
    expect(setsForWorkout(id).map((x) => [x.exerciseId, x.weightKg, x.reps, x.completedAt])).toEqual([
      ['barbell_row', 50, 8, null],
      ['barbell_row', 55, 8, null],
      ['barbell_row', 55, 6, null],
    ]);
  });
});

describe('custom exercises', () => {
  it('short codes avoid clashes', () => {
    expect(shortCodeFor('Belt squat', new Set())).toBe('BS');
    expect(shortCodeFor('Belt squat', new Set(['BS']))).not.toBe('BS');
    expect(shortCodeFor('Belt squat', new Set(['BS']))).toMatch(/^BS./);
  });

  it('creates an exercise with a unique code that survives re-seeding', () => {
    const before = listExercises().length;
    const ex = createCustomExercise({ name: 'Belt squat', category: 'machine', trackingType: 'weight_reps' });
    expect(ex).toMatchObject({ isBuiltin: false, category: 'machine', benchmarkId: null });
    expect(listExercises().filter((e) => e.shortName === ex.shortName)).toHaveLength(1);
    seedExercises();
    expect(listExercises()).toHaveLength(before + 1);
  });

  it('earns normal XP when logged', () => {
    const custom = listExercises().find((e) => e.name === 'Belt squat')!;
    const active = getActiveWorkout();
    if (active) discardWorkout(active.id);
    at(MONDAY + 20 * DAY);
    const id = startWorkout();
    addExerciseToWorkout(id, custom);
    for (const s of setsForWorkout(id)) setCompleted(s.id, true);
    at(MONDAY + 20 * DAY + 30 * 60_000);
    const summary = finishWorkout(id)!;
    expect(summary.events.find((e) => e.reason === 'first_exercise')).toMatchObject({ sourceId: custom.id, amount: 20 });
    expect(summary.events.some((e) => e.reason === 'benchmark_tier')).toBe(false);
  });
});

describe('CSV export', () => {
  it('includes every completed set from finished workouts, oldest first', () => {
    const { csv, setCount } = buildWorkoutExport();
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(setCount + 1);
    expect(setCount).toBeGreaterThan(10);
    expect(lines[1]).toContain('Bench press');
    const started = lines.slice(1).map((l) => l.split(',')[1]);
    expect([...started].sort()).toEqual(started);
  });
});

describe('rebuilding derived data from history', () => {
  it('replaying every workout reproduces the ledger, records and unlocks earned live', () => {
    const snapshot = () => ({
      total: totalXpFromDb(),
      reasons: listLedger()
        .map((e) => `${e.reason}:${e.amount}:${e.status}:${String(e.meta?.workoutId)}`)
        .sort(),
      records: listRecords()
        .map((r) => `${r.exerciseId}|${r.metric}|${r.value.toFixed(3)}|${r.setId}`)
        .sort(),
      unlocks: listBenchmarkUnlocks()
        .map((u) => `${u.benchmarkId}:${u.tier}:${u.status}`)
        .sort(),
    });
    const live = snapshot();
    expect(live.total).toBeGreaterThan(0);
    const result = rebuildDerivedData();
    expect(result.xp).toBe(live.total);
    expect(snapshot()).toEqual(live);
  });
});
