import catalogue from '@config/exercises.json';

import { placementEvent, placementStandards, placementTarget, placementTests, standardScore, type PlacementTest } from '../placement';
import { replayHistory } from '../replay';
import type { ExerciseInfo, WorkoutInput } from '../types';
import { daysAgo, exercises as fixtureExercises, lift, NOW, set } from './fixtures';

// Real catalogue ids so placement standards match.
const exercises: Record<string, ExerciseInfo> = {
  ...fixtureExercises,
  bench_press: { id: 'bench_press', category: 'free_weight', trackingType: 'weight_reps', benchmarkId: 'bench_press' },
  back_squat: { id: 'back_squat', category: 'free_weight', trackingType: 'weight_reps', benchmarkId: 'back_squat' },
  push_up: { id: 'push_up', category: 'bodyweight', trackingType: 'reps', benchmarkId: 'push_ups' },
  hammer_curl: { id: 'hammer_curl', category: 'free_weight', trackingType: 'weight_reps' },
  leg_press: { id: 'leg_press', category: 'machine', trackingType: 'weight_reps' },
  barbell_row: { id: 'barbell_row', category: 'free_weight', trackingType: 'weight_reps' },
  lat_pulldown: { id: 'lat_pulldown', category: 'machine', trackingType: 'weight_reps' },
  plank: { id: 'plank', category: 'bodyweight', trackingType: 'time' },
  dead_bug: { id: 'dead_bug', category: 'bodyweight', trackingType: 'reps' },
  outdoor_run: { id: 'outdoor_run', category: 'cardio', trackingType: 'distance_time', activity: 'run', benchmarkId: 'run' },
};
const ctx74 = { exercises, sex: 'male' as const, bodyweightKg: 74, birthYear: 1998 };
const t = (score: number): PlacementTest => ({ standardId: 'x', value: 0, score });
const once = (sets: WorkoutInput['sets']): WorkoutInput[] => [{ id: 'w', startedAt: NOW - 3600_000, endedAt: NOW, sets }];

describe('standardScore: exact position between levels', () => {
  const th = [0.5, 1.0, 1.25, 1.5, 2.0]; // male bench
  it.each([
    [0.25, 0.5],
    [0.5, 1],
    [0.81, 1.62],
    [1.0, 2],
    [1.375, 3.5],
    [2.0, 5],
    [3.0, 5],
  ])('%s× bodyweight → %s', (v, score) => {
    expect(standardScore(v, th)).toBeCloseTo(score, 2);
  });
});

describe('placementTarget: average score → ladder (cap A1)', () => {
  it.each([
    [0, 'E1'],
    [1, 'D1'],
    [2, 'C1'],
    [3, 'B1'],
    [4, 'A1'],
    [5, 'A1'],
  ])('score %s → %s', (score, label) => {
    expect(placementTarget([t(score)]).label).toBe(label);
  });

  it('interpolates within a rank', () => {
    expect(placementTarget([t(1.5)]).xp).toBe(5000); // halfway D1 (2,000) → C1 (8,000)
  });
});

describe('a real example: the owner’s lifts at 74 kg', () => {
  // bench 50×6, squat 70×6, 25 push-ups, hammer curl 7.5×12, leg press 100×10, row 30×8, pulldown 42×10
  const tests = placementTests(
    once([
      lift('bench_press', 20, 10, { isWarmup: true }),
      lift('bench_press', 50, 6),
      lift('back_squat', 70, 6),
      set('push_up', { reps: 25 }),
      lift('hammer_curl', 7.5, 12),
      lift('leg_press', 100, 10),
      lift('barbell_row', 30, 8),
      lift('lat_pulldown', 42, 10),
    ]),
    ctx74,
  );

  it('scores every covered exercise, ignoring warm-ups', () => {
    const byId = (a: [string, number], b: [string, number]) => a[0].localeCompare(b[0]);
    expect(tests.map((x): [string, number] => [x.standardId, Math.round(x.score * 100) / 100]).sort(byId)).toEqual(([
      ['bench_press', 1.62],
      ['back_squat', 1.77],
      ['push_ups', 2.3],
      ['hammer_curl', 1.42],
      ['leg_press', 1.74],
      ['barbell_row', 1.05],
      ['lat_pulldown', 2.03],
    ] as [string, number][]).sort(byId));
  });

  it('places at D4', () => {
    expect(placementTarget(tests).label).toBe('D4');
  });
});

describe('placementTests', () => {
  it('works for an arms-only day and for a run', () => {
    expect(placementTests(once([lift('hammer_curl', 10, 10)]), ctx74).map((x) => x.standardId)).toEqual(['hammer_curl']);
    expect(placementTests(once([set('outdoor_run', { distanceM: 5000, durationS: 1538 })]), ctx74).map((x) => x.standardId)).toEqual(['run_5k']);
  });

  it('scores holds in seconds', () => {
    // Male plank: Beginner 11 s, Novice 38 s, Intermediate 75 s.
    const [plank] = placementTests(once([set('plank', { durationS: 75 })]), ctx74);
    expect(plank).toMatchObject({ standardId: 'plank', score: 3 });
  });

  it('every standard never decreases and matches its exercises’ tracking type', () => {
    const tracking = new Map(catalogue.exercises.map((e) => [e.id, e.trackingType]));
    const expected = { bodyweight_multiple: 'weight_reps', max_reps: 'reps', max_duration: 'time', run_age_graded: 'distance_time' };
    for (const std of placementStandards()) {
      for (const sex of ['male', 'female'] as const) {
        const t = std.thresholds[sex];
        expect(t.every((v, i) => i === 0 || v >= t[i - 1])).toBe(true);
      }
      expect(std.exerciseIds.filter((id) => tracking.get(id) !== expected[std.kind])).toEqual([]);
    }
  });

  it('skips implausible results and sets over 15 reps', () => {
    expect(placementTests(once([lift('bench_press', 400, 1), lift('leg_press', 100, 20)]), ctx74)).toEqual([]);
  });

  it('every standard is mapped to real catalogue exercises', () => {
    for (const s of placementStandards()) expect(s.exerciseIds.length).toBeGreaterThan(0);
  });
});

describe('placementEvent', () => {
  it('tops XP up to the placement target', () => {
    const e = placementEvent({ at: NOW, tests: [t(2)], totalXpSoFar: 300 });
    expect(e).toMatchObject({ reason: 'placement', amount: 8000 - 300, meta: { placedAt: 'C1' } });
  });

  it('never pays less than the tier XP it replaces', () => {
    expect(placementEvent({ at: NOW, tests: [t(0.5)], totalXpSoFar: 100, tierXp: 250 }).amount).toBe(900);
    expect(placementEvent({ at: NOW, tests: [t(0.1)], totalXpSoFar: 100, tierXp: 250 }).amount).toBe(250);
  });
});

describe('placement in history', () => {
  const base = { profile: { sex: 'male' as const, birthYear: 1998, weeklyTargetDays: 3 }, exercises, bodyweightLogs: [{ weightKg: 80, loggedAt: daysAgo(30) }] };
  const w = (id: string, endedAt: number, sets: WorkoutInput['sets']): WorkoutInput => ({ id, startedAt: endedAt - 3600_000, endedAt, sets });
  const at = (d: number) => daysAgo(d);

  it('the first workout with a covered exercise places you, once; its benchmark tiers don’t pay twice', () => {
    const history = [
      w('core', at(5), [set('dead_bug', { reps: 20, completedAt: at(5) })]), // no placement standard
      w('heavy', at(3), [lift('bench_press', 104, 1, { completedAt: at(3) }), lift('back_squat', 140, 1, { completedAt: at(3) })]),
      w('later', at(1), [lift('bench_press', 125, 1, { completedAt: at(1) })]),
    ];
    const { events } = replayHistory({ ...base, workouts: history });
    const placements = events.filter((e) => e.reason === 'placement');
    expect(placements).toHaveLength(1);
    expect(placements[0].meta?.workoutId).toBe('heavy');
    expect(events.filter((e) => e.reason === 'benchmark_tier' && e.meta?.workoutId === 'heavy')).toEqual([]);
    expect(events.filter((e) => e.reason === 'benchmark_tier' && e.meta?.workoutId === 'later').map((e) => e.sourceId)).toEqual(['bench_press:advanced']);
  });
});
