import { benchmarkValue, findBenchmark, newTiers, tiersReached } from '../benchmarks';
import { exercises, lift, set } from './fixtures';

const bench = findBenchmark('bench_press')!;
const pushUps = findBenchmark('push_ups')!;
const run5k = findBenchmark('run_5k')!;
const male80 = { sex: 'male' as const, bodyweightKg: 80 };

describe('lift benchmarks: e1RM ÷ bodyweight', () => {
  it('normalizes by bodyweight', () => {
    const r = benchmarkValue(bench, [lift('bench', 80, 1)], exercises, male80);
    expect(r?.value).toBeCloseTo(1.0);
    expect(r?.performance).toEqual({ exerciseId: 'bench', metric: 'e1rm', value: 80 });
  });

  it('treats a 75 kg and a 120 kg lifter fairly (§1.3)', () => {
    const light = benchmarkValue(bench, [lift('bench', 75, 1)], exercises, { sex: 'male', bodyweightKg: 75 });
    const heavy = benchmarkValue(bench, [lift('bench', 120, 1)], exercises, { sex: 'male', bodyweightKg: 120 });
    expect(light?.value).toBeCloseTo(heavy!.value);
  });

  it('needs a bodyweight', () => {
    expect(benchmarkValue(bench, [lift('bench', 80, 1)], exercises, { sex: 'male', bodyweightKg: null })).toBeNull();
  });

  it('ignores warm-ups and other exercises', () => {
    const sets = [lift('bench', 200, 1, { isWarmup: true }), lift('curl', 200, 1)];
    expect(benchmarkValue(bench, sets, exercises, male80)).toBeNull();
  });
});

describe('rep and run benchmarks', () => {
  it('push-ups use max reps in one set', () => {
    const sets = [set('push_up', { reps: 18 }), set('push_up', { reps: 22 })];
    expect(benchmarkValue(pushUps, sets, exercises, male80)?.value).toBe(22);
  });

  it('5k uses an age-grade % against the standard', () => {
    // 755 s standard / 1510 s = 50%
    const r = benchmarkValue(run5k, [set('run', { distanceM: 5000, durationS: 1510 })], exercises, male80);
    expect(r?.value).toBeCloseTo(50);
    expect(r?.performance.metric).toBe('best_pace');
  });

  it('longer runs are projected down to 5k at the same pace', () => {
    const r = benchmarkValue(run5k, [set('run', { distanceM: 10000, durationS: 3020 })], exercises, male80);
    expect(r?.value).toBeCloseTo(50);
  });

  it('runs shorter than 5k do not count', () => {
    expect(benchmarkValue(run5k, [set('run', { distanceM: 4000, durationS: 900 })], exercises, male80)).toBeNull();
  });
});

describe('tiers', () => {
  it('reaches every tier at or below the value', () => {
    expect(tiersReached(bench, 1.0, 'male')).toEqual(['beginner', 'novice', 'intermediate']);
    expect(tiersReached(bench, 0.4, 'male')).toEqual([]);
  });

  it('each tier pays once', () => {
    const unlocked = [
      { benchmarkId: 'bench_press', tier: 'beginner' as const },
      { benchmarkId: 'back_squat', tier: 'novice' as const },
    ];
    expect(newTiers(bench, 1.0, 'male', unlocked)).toEqual(['novice', 'intermediate']);
  });
});
