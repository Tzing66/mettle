import { ageStandardSeconds, benchmarksFor, benchmarkValue, findBenchmark, newTiers, tiersReached } from '../benchmarks';
import { exercises, lift, set } from './fixtures';

const bench = findBenchmark('bench_press')!;
const pushUps = findBenchmark('push_ups')!;
const run5k = findBenchmark('run_5k')!;
const run10k = findBenchmark('run_10k')!;
// Born 1998 → 28 at NOW (2026), inside the open class where the age standard equals the open standard.
const male80 = { sex: 'male' as const, bodyweightKg: 80, birthYear: 1998 };

describe('researched tiers (benchmarks.v1)', () => {
  it('uses Strength Level ratios for lifts', () => {
    expect(bench.thresholds.male).toEqual([0.5, 1.0, 1.25, 1.5, 2.0]);
    expect(findBenchmark('deadlift')!.thresholds.female).toEqual([0.75, 1.0, 1.5, 2.0, 2.5]);
  });

  it('covers the big three, overhead press, pull-ups, push-ups, 5k and 10k', () => {
    expect(['bench_press', 'back_squat', 'deadlift', 'overhead_press', 'pull_ups', 'push_ups', 'run_5k', 'run_10k'].every((id) => findBenchmark(id))).toBe(true);
  });

  it('every tier list is five ascending numbers', () => {
    for (const id of ['bench_press', 'back_squat', 'deadlift', 'overhead_press', 'pull_ups', 'push_ups', 'run_5k', 'run_10k']) {
      for (const sex of ['male', 'female'] as const) {
        const t = findBenchmark(id)!.thresholds[sex];
        expect(t).toHaveLength(5);
        expect([...t].sort((a, b) => a - b)).toEqual(t);
      }
    }
  });
});

describe('lift benchmarks: e1RM ÷ bodyweight', () => {
  it('normalizes by bodyweight', () => {
    const r = benchmarkValue(bench, [lift('bench', 80, 1)], exercises, male80);
    expect(r?.value).toBeCloseTo(1.0);
    expect(r?.performance).toEqual({ exerciseId: 'bench', metric: 'e1rm', value: 80 });
  });

  it('treats a 75 kg and a 120 kg lifter fairly (§1.3)', () => {
    const light = benchmarkValue(bench, [lift('bench', 75, 1)], exercises, { ...male80, bodyweightKg: 75 });
    const heavy = benchmarkValue(bench, [lift('bench', 120, 1)], exercises, { ...male80, bodyweightKg: 120 });
    expect(light?.value).toBeCloseTo(heavy!.value);
  });

  it('needs a bodyweight', () => {
    expect(benchmarkValue(bench, [lift('bench', 80, 1)], exercises, { ...male80, bodyweightKg: null })).toBeNull();
  });

  it('ignores warm-ups and other exercises', () => {
    const sets = [lift('bench', 200, 1, { isWarmup: true }), lift('curl', 200, 1)];
    expect(benchmarkValue(bench, sets, exercises, male80)).toBeNull();
  });
});

describe('rep benchmarks', () => {
  it('push-ups use max reps in one set', () => {
    const sets = [set('push_up', { reps: 18 }), set('push_up', { reps: 22 })];
    expect(benchmarkValue(pushUps, sets, exercises, male80)?.value).toBe(22);
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
    // 769 s / 1538 s = 50%
    const r = benchmarkValue(run5k, [set('run', { distanceM: 5000, durationS: 1538 })], exercises, male80);
    expect(r?.value).toBeCloseTo(50);
    expect(r?.performance.metric).toBe('best_pace');
  });

  it('the same time grades higher for an older runner', () => {
    const run = [set('run', { distanceM: 5000, durationS: 1538 })];
    const young = benchmarkValue(run5k, run, exercises, male80)!.value;
    const older = benchmarkValue(run5k, run, exercises, { ...male80, birthYear: 1966 })!.value; // 60
    expect(older).toBeGreaterThan(young);
  });

  it('longer runs are projected down at the same pace', () => {
    const r = benchmarkValue(run5k, [set('run', { distanceM: 10000, durationS: 3076 })], exercises, male80);
    expect(r?.value).toBeCloseTo(50);
  });

  it('runs shorter than the distance do not count', () => {
    expect(benchmarkValue(run5k, [set('run', { distanceM: 4000, durationS: 900 })], exercises, male80)).toBeNull();
    expect(benchmarkValue(run10k, [set('run', { distanceM: 8000, durationS: 2400 })], exercises, male80)).toBeNull();
  });

  it('any run-tagged exercise feeds both the 5k and the 10k', () => {
    expect(benchmarksFor([exercises.run]).map((b) => b.id)).toEqual(['run_5k', 'run_10k']);
    expect(benchmarksFor([exercises.bench]).map((b) => b.id)).toEqual(['bench_press']);
  });
});

describe('tiers', () => {
  it('reaches every tier at or below the value', () => {
    expect(tiersReached(bench, 1.0, 'male')).toEqual(['beginner', 'novice']);
    expect(tiersReached(bench, 1.3, 'male')).toEqual(['beginner', 'novice', 'intermediate']);
    expect(tiersReached(bench, 0.4, 'male')).toEqual([]);
  });

  it('each tier pays once', () => {
    const unlocked = [
      { benchmarkId: 'bench_press', tier: 'beginner' as const },
      { benchmarkId: 'back_squat', tier: 'novice' as const },
    ];
    expect(newTiers(bench, 1.3, 'male', unlocked)).toEqual(['novice', 'intermediate']);
  });
});
