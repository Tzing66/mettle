import { finishSession, type FinishInput, type LedgerEvent } from '../session';
import type { WorkoutInput } from '../types';
import { daysAgo, exercises, lift, NOW, set } from './fixtures';

const strength = (endedAt: number, id = `w${endedAt}`): WorkoutInput => ({
  id,
  startedAt: endedAt - 3600_000,
  endedAt,
  sets: [lift('curl', 15, 8, { completedAt: endedAt }), lift('curl', 15, 8, { completedAt: endedAt }), lift('curl', 15, 8, { completedAt: endedAt })],
});

const event = (e: Partial<LedgerEvent>): LedgerEvent => ({
  id: `e${Math.random()}`,
  amount: 0,
  reason: 'workout_complete',
  sourceType: 'workout',
  sourceId: 'x',
  ruleVersion: 'xp-rules.v1',
  status: 'granted',
  createdAt: NOW,
  ...e,
});

function input(overrides: Partial<FinishInput> = {}): FinishInput {
  return {
    workout: strength(NOW, 'current'),
    profile: { sex: 'male', birthYear: 1998, weeklyTargetDays: 3 },
    exercises,
    bodyweightLogs: [{ weightKg: 80, loggedAt: daysAgo(2) }],
    records: [],
    seenExerciseIds: Object.keys(exercises),
    recentWorkouts: [],
    ledger: [],
    benchmarkUnlocks: [],
    ...overrides,
  };
}

describe('finishSession', () => {
  it('derives today’s consistency XP from the ledger for the daily cap', () => {
    const out = finishSession(input({ ledger: [event({ amount: 120, createdAt: NOW - 3600_000 })] }));
    expect(out.result.consistencyXp).toBe(30);
    expect(out.result.capped).toBe(true);
  });

  it('ignores yesterday’s XP for the cap', () => {
    const out = finishSession(input({ ledger: [event({ amount: 150, createdAt: daysAgo(1) })] }));
    expect(out.result.consistencyXp).toBe(65);
  });

  it('continues today’s cardio curve from earlier workouts', () => {
    const morningRide: WorkoutInput = {
      id: 'am',
      startedAt: NOW - 8 * 3600_000,
      endedAt: NOW - 7 * 3600_000,
      sets: [set('bike', { durationS: 30 * 60, distanceM: 12000, completedAt: NOW - 7 * 3600_000 })],
    };
    const evening: WorkoutInput = { ...strength(NOW, 'pm'), sets: [set('bike', { durationS: 20 * 60, distanceM: 8000, completedAt: NOW })] };
    const out = finishSession(input({ workout: evening, recentWorkouts: [morningRide] }));
    expect(out.result.events.find((e) => e.reason === 'cardio_minutes')?.amount).toBe(20);
  });

  it('awards the weekly goal on the workout that reaches the target', () => {
    // Monday and Tuesday done; Wednesday (NOW) is the third day.
    const recent = [strength(daysAgo(2)), strength(daysAgo(1))];
    const out = finishSession(input({ recentWorkouts: recent }));
    expect(out.weeklyGoal).toMatchObject({ amount: 100, sourceId: '2026-10-05' });
    expect(out.events).toContainEqual(expect.objectContaining({ reason: 'weekly_goal' }));
  });

  it('does not count last week’s workouts or two sessions on one day', () => {
    const recent = [strength(daysAgo(3)), strength(NOW - 3600_000)]; // last Sunday + earlier today
    expect(finishSession(input({ recentWorkouts: recent })).weeklyGoal).toBeNull();
  });

  it('pays the weekly goal once', () => {
    const recent = [strength(daysAgo(2)), strength(daysAgo(1))];
    const ledger = [event({ reason: 'weekly_goal', sourceType: 'week', sourceId: '2026-10-05', amount: 100, createdAt: daysAgo(1) })];
    expect(finishSession(input({ recentWorkouts: recent, ledger })).weeklyGoal).toBeNull();
  });

  it('computes the streak from past weekly goals', () => {
    const ledger = ['2026-09-28', '2026-09-21'].map((w) =>
      event({ reason: 'weekly_goal', sourceType: 'week', sourceId: w, amount: 100, createdAt: daysAgo(10) }),
    );
    const out = finishSession(input({ ledger }));
    expect(out.streakWeeks).toBe(2);
    expect(out.result.events.find((e) => e.reason === 'streak_bonus')?.amount).toBe(Math.round(65 * 0.1));
  });

  it('confirms pending events matched by a later performance', () => {
    const ledger = [
      event({
        id: 'flagged',
        reason: 'personal_record',
        status: 'pending_review',
        createdAt: daysAgo(4),
        meta: { performance: { exerciseId: 'curl', metric: 'e1rm', value: 18 } },
      }),
    ];
    // 15 × 8 → e1RM 19 ≥ 18
    expect(finishSession(input({ ledger })).confirmedEventIds).toEqual(['flagged']);
  });

  it('first-activity XP knows activities from earlier exercises', () => {
    const run: WorkoutInput = { ...strength(NOW), sets: [set('run', { distanceM: 3000, durationS: 900, completedAt: NOW })] };
    const fresh = finishSession(input({ workout: run, seenExerciseIds: ['curl'] }));
    expect(fresh.events.some((e) => e.reason === 'first_activity')).toBe(true);
    const veteran = finishSession(input({ workout: run, seenExerciseIds: ['run'] }));
    expect(veteran.events.some((e) => e.reason === 'first_activity')).toBe(false);
  });

  it('uses rolling bodyweight', () => {
    expect(finishSession(input()).bodyweightKg).toBe(80);
  });
});
