import { ageStandardSeconds, findBenchmark } from '../benchmarks';
import { placementStandards, standardResults, tiersForScore, type PlacementStandard, type StandardContext } from '../placement';
import { lift, set } from './fixtures';

const bench = findBenchmark('bench_press')!;
const pushUps = findBenchmark('push_ups')!;
// Born 1998 → 28 at NOW (2026), inside the open class where the age standard equals the open standard.
const male80: StandardContext = { sex: 'male', bodyweightKg: 80, birthYear: 1998 };

// Real thresholds, wired to the fixture exercise ids.
const benchStd: PlacementStandard = { id: 'bench_press', name: 'Bench', exerciseIds: ['bench'], kind: 'bodyweight_multiple', thresholds: bench.thresholds };
const pushUpStd: PlacementStandard = { id: 'push_ups', name: 'Push-ups', exerciseIds: ['push_up'], kind: 'max_reps', thresholds: pushUps.thresholds };
const run5kStd: PlacementStandard = { id: 'run_5k', name: '5k', exerciseIds: ['run'], kind: 'run_age_graded', thresholds: findBenchmark('run_5k')!.thresholds, distanceM: 5000 };
const real = (id: string) => placementStandards().find((s) => s.id === id)!;
const rowing = { ...real('rowing'), exerciseIds: ['row'] } as PlacementStandard;
const cycling = { ...real('cycling'), exerciseIds: ['ride'] } as PlacementStandard;

const one = (std: PlacementStandard, sets: Parameters<typeof standardResults>[0], ctx = male80) => standardResults(sets, ctx, undefined, [std])[0];

describe('researched tiers (benchmarks.v1)', () => {
  it('uses Strength Level ratios for lifts', () => {
    expect(bench.thresholds.male).toEqual([0.5, 1.0, 1.25, 1.5, 2.0]);
    expect(findBenchmark('deadlift')!.thresholds.female).toEqual([0.75, 1.0, 1.5, 2.0, 2.5]);
  });

  it('every benchmark tier list is five ascending numbers', () => {
    for (const id of ['bench_press', 'back_squat', 'deadlift', 'overhead_press', 'pull_ups', 'push_ups', 'run_5k', 'run_10k']) {
      for (const sex of ['male', 'female'] as const) {
        const t = findBenchmark(id)!.thresholds[sex];
        expect(t).toHaveLength(5);
        expect([...t].sort((a, b) => a - b)).toEqual(t);
      }
    }
  });
});

describe('lifts: e1RM ÷ bodyweight', () => {
  it('normalizes by bodyweight', () => {
    const r = one(benchStd, [lift('bench', 80, 1)]);
    expect(r.value).toBeCloseTo(1.0);
    expect(r.performance).toEqual({ exerciseId: 'bench', metric: 'e1rm', value: 80 });
  });

  it('treats a 75 kg and a 120 kg lifter fairly (§1.3)', () => {
    const light = one(benchStd, [lift('bench', 75, 1)], { ...male80, bodyweightKg: 75 });
    const heavy = one(benchStd, [lift('bench', 120, 1)], { ...male80, bodyweightKg: 120 });
    expect(light.value).toBeCloseTo(heavy.value);
  });

  it('needs a bodyweight and a weight', () => {
    expect(one(benchStd, [lift('bench', 80, 1)], { ...male80, bodyweightKg: null })).toBeUndefined();
    expect(one(benchStd, [set('bench', { reps: 20 })])).toBeUndefined();
  });

  it('ignores warm-ups and other exercises', () => {
    expect(one(benchStd, [lift('bench', 200, 1, { isWarmup: true }), lift('curl', 200, 1)])).toBeUndefined();
  });
});

describe('reps', () => {
  it('push-ups use max reps in one set', () => {
    expect(one(pushUpStd, [set('push_up', { reps: 18 }), set('push_up', { reps: 22 })]).value).toBe(22);
  });

  it('weighted sets don’t count toward a bodyweight rep standard', () => {
    expect(one(pushUpStd, [set('push_up', { reps: 30, weightKg: 20 })])).toBeUndefined();
  });
});

describe('running: WMA/USATF 2025 age grading', () => {
  it('has real per-age standards', () => {
    expect(ageStandardSeconds('male', 28, 5000)).toBe(769); // 12:49 open standard
    expect(ageStandardSeconds('female', 28, 10000)).toBe(1726); // 28:46
    expect(ageStandardSeconds('male', 60, 5000)!).toBeGreaterThan(769);
  });

  it('clamps ages outside the table', () => {
    expect(ageStandardSeconds('male', 120, 5000)).toBe(ageStandardSeconds('male', 100, 5000));
    expect(ageStandardSeconds('male', 28, 7000)).toBeNull();
  });

  it('5k age grade = age standard / time', () => {
    const r = one(run5kStd, [set('run', { distanceM: 5000, durationS: 1538 })]); // 769 / 1538 = 50%
    expect(r.value).toBeCloseTo(50);
    expect(r.performance.metric).toBe('best_pace');
  });

  it('the same time grades higher for an older runner', () => {
    const run = [set('run', { distanceM: 5000, durationS: 1538 })];
    expect(one(run5kStd, run, { ...male80, birthYear: 1966 }).value).toBeGreaterThan(one(run5kStd, run).value);
  });

  it('longer runs are projected down at the same pace; shorter ones don’t count', () => {
    expect(one(run5kStd, [set('run', { distanceM: 10000, durationS: 3076 })]).value).toBeCloseTo(50);
    expect(one(run5kStd, [set('run', { distanceM: 4000, durationS: 900 })])).toBeUndefined();
  });
});

describe('rowing, swimming, cycling: finish times by age and sex', () => {
  it('a time exactly at a level scores that level', () => {
    // Rowing Level, male age 25, 2000 m Intermediate = 7:07.8.
    expect(one(rowing, [set('row', { distanceM: 2000, durationS: 427.8 })], { ...male80, birthYear: 2001 }).score).toBeCloseTo(3);
  });

  it('nearby distances are compared at the nearest tabled one (Riegel)', () => {
    // A 3 km row is judged as a 2k: 3000 m in T → 2000 m in T × (2/3)^1.06.
    const r = one(rowing, [set('row', { distanceM: 3000, durationS: 700 })]);
    expect(r.value).toBeCloseTo(2000 / (700 * Math.pow(2000 / 3000, 1.06)));
  });

  it('distances far from any table don’t count', () => {
    expect(one(rowing, [set('row', { distanceM: 200, durationS: 40 })])).toBeUndefined();
  });

  it('ages between table rows are interpolated, and older athletes get more time', () => {
    const ride = [set('ride', { distanceM: 20000, durationS: 2600 })];
    const at = (birthYear: number) => one(cycling, ride, { ...male80, birthYear }).score;
    expect(at(1974)).toBeGreaterThan(at(1998)); // 52 vs 28
    expect(at(1974)).toBeLessThan(at(1969)); // 52 vs 57
  });

  it('women are compared with women’s times', () => {
    const row = [set('row', { distanceM: 2000, durationS: 505.3 })]; // female 25 Intermediate 8:25.3
    expect(one(rowing, row, { sex: 'female', bodyweightKg: 60, birthYear: 2001 }).score).toBeCloseTo(3);
  });
});

describe('tiers', () => {
  it('a score reaches every level at or below it', () => {
    expect(tiersForScore(2)).toEqual(['beginner', 'novice']);
    expect(tiersForScore(3.4)).toEqual(['beginner', 'novice', 'intermediate']);
    expect(tiersForScore(0.9)).toEqual([]);
    expect(tiersForScore(5)).toHaveLength(5);
  });
});
