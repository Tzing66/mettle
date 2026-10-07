// Benchmark normalization and tier detection. Only exercises mapped to a
// benchmark (exercise.benchmarkId) can unlock tiers.

import { benchmarksConfig, xpRules, type BenchmarkDef, type BenchmarksConfig, type XpRules } from './config';
import { estimateOneRepMax } from './e1rm';
import type { BenchmarkTier, BenchmarkUnlock, ExerciseInfo, PerformanceRef, SetInput, Sex } from './types';

export interface BenchmarkResult {
  benchmarkId: string;
  /** Normalized value compared against tier thresholds (×bodyweight, reps, or age-grade %). */
  value: number;
  setId: string;
  achievedAt: number;
  /** The raw performance behind the value, used for plausibility confirmation. */
  performance: PerformanceRef;
}

export function findBenchmark(
  id: string,
  config: BenchmarksConfig = benchmarksConfig,
): BenchmarkDef | undefined {
  return config.benchmarks.find((b) => b.id === id);
}

/**
 * Best normalized value a set of sets achieves for one benchmark, or null.
 * Lifts need a bodyweight; without one they can't be normalized.
 */
export function benchmarkValue(
  benchmark: BenchmarkDef,
  sets: SetInput[],
  exercises: Record<string, ExerciseInfo>,
  ctx: { sex: Sex; bodyweightKg: number | null },
  rules: XpRules = xpRules,
): BenchmarkResult | null {
  let best: BenchmarkResult | null = null;
  const consider = (r: BenchmarkResult) => {
    if (!best || r.value > best.value) best = r;
  };

  for (const set of sets) {
    const exercise = exercises[set.exerciseId];
    if (set.isWarmup || exercise?.benchmarkId !== benchmark.id) continue;
    const base = { benchmarkId: benchmark.id, setId: set.id, achievedAt: set.completedAt };

    switch (benchmark.kind) {
      case 'bodyweight_multiple': {
        const e1rm = estimateOneRepMax(set.weightKg, set.reps, rules);
        if (e1rm === null || !ctx.bodyweightKg) break;
        consider({
          ...base,
          value: e1rm / ctx.bodyweightKg,
          performance: { exerciseId: exercise.id, metric: 'e1rm', value: e1rm },
        });
        break;
      }
      case 'max_reps':
        if (!set.reps) break;
        consider({
          ...base,
          value: set.reps,
          performance: { exerciseId: exercise.id, metric: 'max_reps', value: set.reps },
        });
        break;
      case 'run_age_graded': {
        if (!set.distanceM || !set.durationS || set.distanceM < benchmark.distanceM) break;
        // Longer runs are scaled down to the benchmark distance at the same pace,
        // which under-rates the runner slightly: the conservative direction.
        const projected = set.durationS * (benchmark.distanceM / set.distanceM);
        // PLACEHOLDER: open-class standard only, no WMA age factor yet.
        const ageGrade = (benchmark.standardSeconds[ctx.sex] / projected) * 100;
        const pace = set.durationS / (set.distanceM / 1000);
        consider({
          ...base,
          value: ageGrade,
          performance: { exerciseId: exercise.id, metric: 'best_pace', value: pace },
        });
        break;
      }
    }
  }
  return best;
}

export function tiersReached(
  benchmark: BenchmarkDef,
  value: number,
  sex: Sex,
  config: BenchmarksConfig = benchmarksConfig,
): BenchmarkTier[] {
  const thresholds = benchmark.thresholds[sex];
  return config.tiers.filter((_, i) => value >= thresholds[i]);
}

/** Tiers reached by `value` that haven't been unlocked before. Each tier pays once. */
export function newTiers(
  benchmark: BenchmarkDef,
  value: number,
  sex: Sex,
  unlocked: Pick<BenchmarkUnlock, 'benchmarkId' | 'tier'>[],
  config: BenchmarksConfig = benchmarksConfig,
): BenchmarkTier[] {
  const have = new Set(unlocked.filter((u) => u.benchmarkId === benchmark.id).map((u) => u.tier));
  return tiersReached(benchmark, value, sex, config).filter((t) => !have.has(t));
}
