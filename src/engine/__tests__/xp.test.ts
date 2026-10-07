import { cardioXp, computeWorkoutXp } from '../xp';
import type { XpEventDraft } from '../types';
import { context, daysAgo, lift, record, set, workout } from './fixtures';

const byReason = (events: XpEventDraft[]) =>
  Object.fromEntries(events.map((e) => [e.reason, e.amount]));
const sum = (events: XpEventDraft[]) => events.reduce((s, e) => s + e.amount, 0);
const strengthSets = (n: number) => Array.from({ length: n }, () => lift('curl', 15, 12));

describe('consistency XP (§6.2)', () => {
  it('3+ working sets complete a workout: 50 + 5/set', () => {
    const r = computeWorkoutXp(workout(strengthSets(4)), context());
    expect(byReason(r.events)).toEqual({ workout_complete: 50, working_sets: 20 });
    expect(r.qualifies).toBe(true);
  });

  it('set XP caps at 40 per workout', () => {
    const r = computeWorkoutXp(workout(strengthSets(12)), context());
    expect(byReason(r.events).working_sets).toBe(40);
  });

  it('warm-ups earn nothing and do not count toward completion', () => {
    const sets = [...strengthSets(2), lift('curl', 5, 10, { isWarmup: true })];
    const r = computeWorkoutXp(workout(sets), context());
    expect(byReason(r.events)).toEqual({ working_sets: 10 });
    expect(r.qualifies).toBe(false);
  });

  it('15+ cardio minutes complete a workout; 2 XP/min up to 30', () => {
    const r = computeWorkoutXp(workout([set('bike', { durationS: 20 * 60, distanceM: 8000 })]), context());
    expect(byReason(r.events)).toEqual({ workout_complete: 50, cardio_minutes: 40 });
  });

  it('cardio sets do not count as working sets', () => {
    const r = computeWorkoutXp(workout([set('bike', { durationS: 5 * 60, distanceM: 2000 })]), context());
    expect(r.workingSets).toBe(0);
    expect(r.qualifies).toBe(false);
  });
});

describe('cardio diminishing returns', () => {
  it('2/min to 30, 1/min to 60, then 0', () => {
    expect(cardioXp(0, 30)).toBe(60);
    expect(cardioXp(0, 45)).toBe(75);
    expect(cardioXp(0, 60)).toBe(90);
    expect(cardioXp(0, 120)).toBe(90);
  });

  it('continues from minutes already done today (bonus round chip)', () => {
    expect(cardioXp(28, 5)).toBe(2 * 2 + 3 * 1);
    expect(cardioXp(58, 5)).toBe(2);
    expect(cardioXp(60, 5)).toBe(0);
  });

  it('a second session the same day continues the curve', () => {
    const ctx = context({ today: { consistencyXp: 0, cardioMinutes: 30, prsCounted: 0 } });
    const r = computeWorkoutXp(workout([set('bike', { durationS: 20 * 60, distanceM: 8000 })]), ctx);
    expect(byReason(r.events).cardio_minutes).toBe(20);
  });
});

describe('streak multiplier', () => {
  it('adds +5%/week of consistency XP as its own line', () => {
    const r = computeWorkoutXp(workout(strengthSets(8)), context({ streakWeeks: 2 }));
    expect(byReason(r.events)).toEqual({ workout_complete: 50, working_sets: 40, streak_bonus: 9 });
  });

  it('caps at +25%', () => {
    const r = computeWorkoutXp(workout(strengthSets(4)), context({ streakWeeks: 10 }));
    expect(byReason(r.events).streak_bonus).toBe(Math.round(70 * 0.25));
  });
});

describe('daily cap (150 consistency XP)', () => {
  it('stops double-session farming, trimming the last lines first', () => {
    const ctx = context({ today: { consistencyXp: 100, cardioMinutes: 0, prsCounted: 0 } });
    const r = computeWorkoutXp(workout(strengthSets(8)), ctx);
    expect(byReason(r.events)).toEqual({ workout_complete: 50 });
    expect(r.capped).toBe(true);
    expect(r.consistencyXp).toBe(50);
  });

  it('earns nothing once capped, but progress XP still pays', () => {
    const ctx = context({
      today: { consistencyXp: 150, cardioMinutes: 0, prsCounted: 0 },
      records: [record('curl', 'e1rm', 10)],
    });
    const sets = [lift('curl', 15, 8), lift('curl', 15, 8), lift('curl', 15, 8)];
    const r = computeWorkoutXp(workout(sets), ctx);
    expect(byReason(r.events)).toEqual({ personal_record: 25 });
  });
});

describe('progress XP (§6.3)', () => {
  it('a PR pays 25', () => {
    const ctx = context({ records: [record('bench', 'e1rm', 100)] });
    const r = computeWorkoutXp(workout([lift('bench', 100, 3)]), ctx);
    const pr = r.events.find((e) => e.reason === 'personal_record');
    expect(pr).toMatchObject({ amount: 25, status: 'granted', sourceType: 'set' });
    expect(pr?.meta?.performance).toMatchObject({ exerciseId: 'bench', metric: 'e1rm' });
  });

  it('only 3 PRs per day count', () => {
    const ctx = context({
      today: { consistencyXp: 0, cardioMinutes: 0, prsCounted: 2 },
      records: [record('bench', 'e1rm', 50), record('squat', 'e1rm', 50), record('curl', 'e1rm', 5)],
    });
    const r = computeWorkoutXp(workout([lift('bench', 60, 5), lift('squat', 70, 5), lift('curl', 12, 8)]), ctx);
    expect(r.events.filter((e) => e.reason === 'personal_record')).toHaveLength(1);
    expect(r.prsCounted).toBe(1);
    // All three are still recorded as new bests.
    expect(r.records.filter((o) => o.kind === 'pr')).toHaveLength(3);
  });

  it('first time on an exercise pays 20; first new activity pays 100', () => {
    const ctx = context({ seenExerciseIds: ['curl'], seenActivities: ['cycle'] });
    const r = computeWorkoutXp(workout([lift('curl', 10, 10), set('run', { durationS: 600, distanceM: 2000 })]), ctx);
    expect(r.events.filter((e) => e.reason === 'first_exercise').map((e) => e.sourceId)).toEqual(['run']);
    expect(r.events.filter((e) => e.reason === 'first_activity')).toEqual([
      expect.objectContaining({ amount: 100, sourceId: 'run' }),
    ]);
  });

  it('first performances become baselines, not PRs', () => {
    const r = computeWorkoutXp(workout([lift('curl', 10, 10)]), context());
    expect(r.records).toEqual([expect.objectContaining({ kind: 'baseline' })]);
    expect(r.events.some((e) => e.reason === 'personal_record')).toBe(false);
  });
});

describe('benchmark unlocks', () => {
  it('unlocks every newly reached tier once', () => {
    // 104 kg × 1 at 80 kg bodyweight = 1.3× → beginner, novice, intermediate.
    const ctx = context({ benchmarkUnlocks: [{ benchmarkId: 'bench_press', tier: 'beginner' }] });
    const r = computeWorkoutXp(workout([lift('bench', 104, 1)]), ctx);
    const tiers = r.events.filter((e) => e.reason === 'benchmark_tier');
    expect(tiers.map((e) => [e.sourceId, e.amount])).toEqual([
      ['bench_press:novice', 750],
      ['bench_press:intermediate', 2000],
    ]);
    expect(r.benchmarkUnlocks.map((u) => u.tier)).toEqual(['novice', 'intermediate']);
  });

  it('works for push-ups and the 5k (age-graded)', () => {
    const r = computeWorkoutXp(
      workout([set('push_up', { reps: 21 }), set('run', { distanceM: 5000, durationS: 1500 })]),
      context(),
    );
    expect(r.benchmarkUnlocks.map((u) => `${u.benchmarkId}:${u.tier}`)).toEqual([
      'push_ups:beginner',
      'push_ups:novice',
      'run_5k:beginner', // 769 s standard / 1500 s = 51% age grade
      'run_5k:novice',
    ]);
  });
});

describe('plausibility → pending_review', () => {
  it('a >15% e1RM jump within 30 days is pending, along with its tier unlocks', () => {
    const ctx = context({ records: [record('bench', 'e1rm', 60, daysAgo(7))] });
    const r = computeWorkoutXp(workout([lift('bench', 80, 1)]), ctx);
    const progress = r.events.filter((e) => e.reason === 'personal_record' || e.reason === 'benchmark_tier');
    expect(progress.length).toBeGreaterThan(1);
    expect(progress.every((e) => e.status === 'pending_review')).toBe(true);
    expect(r.benchmarkUnlocks.every((u) => u.status === 'pending_review')).toBe(true);
  });

  it('the same jump over a longer gap is granted', () => {
    const ctx = context({ records: [record('bench', 'e1rm', 60, daysAgo(60))] });
    const r = computeWorkoutXp(workout([lift('bench', 80, 1)]), ctx);
    expect(r.events.every((e) => e.status === 'granted')).toBe(true);
  });

  it('beyond elite × 1.2 for bodyweight is pending', () => {
    // 200 kg at 80 kg bodyweight = 2.5× > 2.0 × 1.2
    const r = computeWorkoutXp(workout([lift('bench', 200, 1)]), context());
    expect(r.events.filter((e) => e.reason === 'benchmark_tier').every((e) => e.status === 'pending_review')).toBe(true);
  });

  it('consistency XP is never held back', () => {
    const ctx = context({ records: [record('bench', 'e1rm', 60, daysAgo(7))] });
    const r = computeWorkoutXp(workout([lift('bench', 80, 1), lift('bench', 80, 1), lift('bench', 80, 1)]), ctx);
    expect(r.events.filter((e) => e.reason === 'workout_complete' || e.reason === 'working_sets').every((e) => e.status === 'granted')).toBe(true);
  });
});

describe('engine guarantees', () => {
  it('is deterministic', () => {
    const w = workout([lift('bench', 80, 5), lift('squat', 100, 5), set('run', { distanceM: 5000, durationS: 1600 })]);
    expect(computeWorkoutXp(w, context())).toEqual(computeWorkoutXp(w, context()));
  });

  it('tags every event with the rule version and workout end time', () => {
    const w = workout(strengthSets(3));
    const r = computeWorkoutXp(w, context());
    expect(r.events.every((e) => e.ruleVersion === 'xp-rules.v1' && e.createdAt === w.endedAt)).toBe(true);
  });

  it('a typical session lands near the plan’s ~85 XP', () => {
    // 1 exercise × 3 sets + 2 × 2 sets = 7 working sets.
    const r = computeWorkoutXp(workout(strengthSets(7)), context());
    expect(sum(r.events)).toBe(85);
  });
});
