// Benchmark normalization and tier detection. Only exercises mapped to a
// benchmark (exercise.benchmarkId, directly or via a benchmark's `matches`
// group) can unlock tiers.

import {
  ageGrading,
  benchmarksConfig,
  xpRules,
  type AgeGradingConfig,
  type BenchmarkDef,
  type BenchmarksConfig,
  type XpRules,
} from './config';
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

/** Does this exercise feed this benchmark? */
export function exerciseFeeds(benchmark: BenchmarkDef, exercise: ExerciseInfo | undefined): boolean {
  const tag = exercise?.benchmarkId;
  return !!tag && (tag === benchmark.id || (benchmark.matches?.includes(tag) ?? false));
}

/** Benchmarks fed by any of these exercises, in config order. */
export function benchmarksFor(
  exercises: (ExerciseInfo | undefined)[],
  config: BenchmarksConfig = benchmarksConfig,
): BenchmarkDef[] {
  return config.benchmarks.filter((b) => exercises.some((e) => exerciseFeeds(b, e)));
}

/** WMA/USATF age standard (seconds) for a distance, or null if that distance isn't tabled. */
export function ageStandardSeconds(
  sex: Sex,
  age: number,
  distanceM: number,
  tables: AgeGradingConfig = ageGrading,
): number | null {
  const byAge = tables.standards[sex]?.[String(distanceM)];
  if (!byAge) return null;
  const ages = Object.keys(byAge).map(Number);
  const clamped = Math.min(Math.max(Math.round(age), Math.min(...ages)), Math.max(...ages));
  return byAge[String(clamped)] ?? null;
}

export function ageAt(birthYear: number, at: number): number {
  return new Date(at).getFullYear() - birthYear;
}

/**
 * Best normalized value a set of sets achieves for one benchmark, or null.
 * Lifts need a bodyweight; without one they can't be normalized.
 */
export function benchmarkValue(
  benchmark: BenchmarkDef,
  sets: SetInput[],
  exercises: Record<string, ExerciseInfo>,
  ctx: { sex: Sex; bodyweightKg: number | null; birthYear: number },
  rules: XpRules = xpRules,
): BenchmarkResult | null {
  let best: BenchmarkResult | null = null;
  const consider = (r: BenchmarkResult) => {
    if (!best || r.value > best.value) best = r;
  };

  for (const set of sets) {
    const exercise = exercises[set.exerciseId];
    if (set.isWarmup || !exerciseFeeds(benchmark, exercise)) continue;
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
        const standard = ageStandardSeconds(ctx.sex, ageAt(ctx.birthYear, set.completedAt), benchmark.distanceM);
        if (!standard) break;
        const ageGrade = (standard / projected) * 100;
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
