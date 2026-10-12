// Benchmark definitions (config/benchmarks.v1.json) and running age grading.
// Scoring efforts against them, and tiers, live in placement.ts.

import { ageGrading, benchmarksConfig, type AgeGradingConfig, type BenchmarkDef, type BenchmarksConfig } from './config';
import type { Sex } from './types';

export function findBenchmark(
  id: string,
  config: BenchmarksConfig = benchmarksConfig,
): BenchmarkDef | undefined {
  return config.benchmarks.find((b) => b.id === id);
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
