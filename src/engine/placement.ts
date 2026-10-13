// Standards: how good a logged effort is against real-world levels
// (Beginner = 1 … Elite = 5), for lifts, bodyweight moves, holds, runs,
// rowing, swimming and cycling. Two things use them:
//
// - Placement (plan §7.4): the first workout that includes any covered
//   exercise places the user, so an arms day or a swim counts too. The average
//   score maps onto the ladder: 0 → E1, 1 → D1, 2 → C1, 3 → B1, 4+ → A1 (cap).
// - Tiers: reaching a new level on a standard is a badge, plus XP after your
//   first session with it (see xp.ts).
//
// Deterministic from history, so phone and server agree.

import placementJson from '@config/placement-standards.v1.json';

import { ageAt, ageStandardSeconds, findBenchmark } from './benchmarks';
import { benchmarksConfig, ranksConfig, xpRules, type BenchmarkDef, type BenchmarksConfig, type RankLetter, type RanksConfig, type XpRules } from './config';
import { epley } from './e1rm';
import { rankFor } from './ranks';
import type { BenchmarkTier, ExerciseInfo, PerformanceRef, SetInput, Sex, WorkoutInput, XpEventDraft } from './types';

export const TIERS: BenchmarkTier[] = ['beginner', 'novice', 'intermediate', 'advanced', 'elite'];

/** Finish times in seconds: distance (m) → age (years) → [beginner … elite]. */
type TimeTable = Record<string, Record<string, number[]>>;

interface StandardBase {
  id: string;
  name: string;
  exerciseIds: string[];
}

export type PlacementStandard =
  | (StandardBase & { kind: 'bodyweight_multiple' | 'max_reps' | 'max_duration'; thresholds: Record<Sex, number[]> })
  | (StandardBase & { kind: 'run_age_graded'; thresholds: Record<Sex, number[]>; distanceM: number })
  | (StandardBase & { kind: 'time_for_distance'; times: Record<Sex, TimeTable> });

interface PlacementConfig {
  version: string;
  maxRepsForEstimate: number;
  riegelExponent: number;
  maxDistanceRatio: number;
  scoreToRank: { score: number; rank: RankLetter }[];
  standards: ({ benchmark: string; exerciseIds: string[] } | PlacementStandard)[];
}

const placementConfig = placementJson as unknown as PlacementConfig;

/** Placement standards with benchmark references resolved. */
export function placementStandards(config: PlacementConfig = placementConfig, benchmarks: BenchmarksConfig = benchmarksConfig): PlacementStandard[] {
  return config.standards.flatMap((s): PlacementStandard[] => {
    if (!('benchmark' in s)) return [s];
    const b = findBenchmark(s.benchmark, benchmarks);
    if (!b) return [];
    const base = { id: b.id, name: b.name, exerciseIds: s.exerciseIds, thresholds: b.thresholds };
    return [b.kind === 'run_age_graded' ? { ...base, kind: b.kind, distanceM: b.distanceM } : { ...base, kind: (b as Exclude<BenchmarkDef, { kind: 'run_age_graded' }>).kind }];
  });
}

const standardsById = new Map(placementStandards().map((s) => [s.id, s]));

export function findStandard(id: string): PlacementStandard | undefined {
  return standardsById.get(id);
}

/** Display name for a standard (or an older benchmark id). */
export function standardName(id: string): string {
  return findStandard(id)?.name ?? findBenchmark(id)?.name ?? id;
}

/** The weight-multiple standard for an exercise, if any (used for plausibility ceilings). */
export function liftStandardFor(exerciseId: string): { id: string; thresholds: Record<Sex, number[]> } | undefined {
  for (const s of standardsById.values()) if (s.kind === 'bodyweight_multiple' && s.exerciseIds.includes(exerciseId)) return s;
  return undefined;
}

/** Exact position between levels: below Beginner scales 0–1; Elite and beyond is 5. */
export function standardScore(value: number, thresholds: number[]): number {
  if (value <= 0) return 0;
  if (value < thresholds[0]) return value / thresholds[0];
  for (let i = 0; i < thresholds.length - 1; i++) {
    if (value < thresholds[i + 1]) return i + 1 + (value - thresholds[i]) / (thresholds[i + 1] - thresholds[i]);
  }
  return thresholds.length;
}

/** Tiers a score has reached (score 1 = Beginner … 5 = Elite). */
export function tiersForScore(score: number): BenchmarkTier[] {
  return TIERS.slice(0, Math.min(TIERS.length, Math.floor(score + 1e-9)));
}

/** Level times for one distance at an age, interpolated between the tabled ages. */
function timesAtAge(table: Record<string, number[]>, age: number): number[] {
  const ages = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  const a = Math.min(Math.max(age, ages[0]), ages[ages.length - 1]);
  const hi = ages.find((x) => x >= a) ?? ages[ages.length - 1];
  const lo = [...ages].reverse().find((x) => x <= a) ?? ages[0];
  if (hi === lo) return table[String(lo)];
  const f = (a - lo) / (hi - lo);
  return table[String(lo)].map((t, i) => t + (table[String(hi)][i] - t) * f);
}

export interface StandardContext {
  sex: Sex;
  bodyweightKg: number | null;
  birthYear: number;
}

export interface StandardResult {
  standardId: string;
  /** Normalised result, higher is better (× bodyweight, reps, seconds, age-grade %, or m/s). */
  value: number;
  /** 0–5: Beginner = 1 … Elite = 5, fractional in between. */
  score: number;
  /** The levels `value` was scored against (for plausibility ceilings). */
  thresholds: number[];
  setId: string;
  achievedAt: number;
  performance: PerformanceRef;
}

type Measured = Pick<StandardResult, 'value' | 'score' | 'thresholds' | 'performance'>;

/** One set against one standard, or null if the set doesn't measure it. */
function measure(std: PlacementStandard, set: SetInput, ctx: StandardContext, config: PlacementConfig): Measured | null {
  const weighted = !!set.weightKg && set.weightKg > 0;
  const result = (value: number, thresholds: number[], performance: PerformanceRef): Measured | null =>
    value > 0 ? { value, score: standardScore(value, thresholds), thresholds, performance } : null;

  switch (std.kind) {
    case 'bodyweight_multiple': {
      if (!ctx.bodyweightKg || !weighted || !set.reps || set.reps > config.maxRepsForEstimate) return null;
      const e1rm = epley(set.weightKg!, set.reps);
      return result(e1rm / ctx.bodyweightKg, std.thresholds[ctx.sex], { exerciseId: set.exerciseId, metric: 'e1rm', value: e1rm });
    }
    // Rep and hold standards are for bodyweight alone; a weighted set is a different effort.
    case 'max_reps':
      if (weighted || !set.reps) return null;
      return result(set.reps, std.thresholds[ctx.sex], { exerciseId: set.exerciseId, metric: 'max_reps', value: set.reps });
    case 'max_duration':
      if (weighted || !set.durationS) return null;
      return result(set.durationS, std.thresholds[ctx.sex], { exerciseId: set.exerciseId, metric: 'max_duration', value: set.durationS });
    case 'run_age_graded': {
      if (!set.distanceM || !set.durationS || set.distanceM < std.distanceM) return null;
      // Longer runs are scaled down at the same pace: slightly conservative.
      const projected = set.durationS * (std.distanceM / set.distanceM);
      const standard = ageStandardSeconds(ctx.sex, ageAt(ctx.birthYear, set.completedAt), std.distanceM);
      if (!standard) return null;
      const pace = set.durationS / (set.distanceM / 1000);
      return result((standard / projected) * 100, std.thresholds[ctx.sex], { exerciseId: set.exerciseId, metric: 'best_pace', value: pace });
    }
    case 'time_for_distance': {
      const distanceM = set.distanceM;
      if (!distanceM || !set.durationS) return null;
      // Compare at the nearest tabled distance, converting the time with Riegel's formula.
      const tabled = Object.keys(std.times[ctx.sex]).map(Number);
      const d = tabled.reduce((best, x) => (Math.abs(Math.log(x / distanceM)) < Math.abs(Math.log(best / distanceM)) ? x : best));
      if (Math.max(d, distanceM) / Math.min(d, distanceM) > config.maxDistanceRatio) return null;
      const equivalent = set.durationS * Math.pow(d / distanceM, config.riegelExponent);
      const levels = timesAtAge(std.times[ctx.sex][String(d)], ageAt(ctx.birthYear, set.completedAt));
      // As speeds (m/s), so higher is better like every other standard.
      const pace = set.durationS / (distanceM / 1000);
      return result(
        d / equivalent,
        levels.map((t) => d / t),
        { exerciseId: set.exerciseId, metric: 'best_pace', value: pace },
      );
    }
  }
}

/** Best result per standard covered by these sets (warm-ups and drops ignored). */
export function standardResults(
  sets: SetInput[],
  ctx: StandardContext,
  config: PlacementConfig = placementConfig,
  standards: PlacementStandard[] = placementStandards(config),
): StandardResult[] {
  const working = sets.filter((s) => !s.isWarmup && !s.isDrop);
  const out: StandardResult[] = [];
  for (const std of standards) {
    let best: StandardResult | null = null;
    for (const set of working) {
      if (!std.exerciseIds.includes(set.exerciseId)) continue;
      const m = measure(std, set, ctx, config);
      if (m && (!best || m.value > best.value)) best = { ...m, standardId: std.id, setId: set.id, achievedAt: set.completedAt };
    }
    if (best) out.push(best);
  }
  return out;
}

/** Beyond elite × `eliteMultiplier`: too good to take on trust. */
export function isImplausible(r: Pick<StandardResult, 'value' | 'thresholds'>, rules: XpRules = xpRules): boolean {
  return r.value > r.thresholds[r.thresholds.length - 1] * rules.plausibility.eliteMultiplier;
}

export interface PlacementTest {
  standardId: string;
  value: number;
  score: number;
}

/** Best result per covered standard in these workouts, skipping implausible ones. */
export function placementTests(
  workouts: WorkoutInput[],
  ctx: StandardContext & { exercises: Record<string, ExerciseInfo> },
  rules: XpRules = xpRules,
  config: PlacementConfig = placementConfig,
): PlacementTest[] {
  return standardResults(
    workouts.flatMap((w) => w.sets),
    ctx,
    config,
  )
    .filter((r) => !isImplausible(r, rules))
    .map(({ standardId, value, score }) => ({ standardId, value, score }));
}

/**
 * Average score → a point on the ladder (XP), capped at A1. Results below
 * Beginner are left out when anything reaches Beginner: an empty-bar row or a
 * 2 kg hip thrust is accessory work, not a test, and shouldn't drag a real
 * lifter down.
 */
export function placementTarget(
  tests: PlacementTest[],
  config: PlacementConfig = placementConfig,
  ranks: RanksConfig = ranksConfig,
): { score: number; xp: number; label: string } {
  const real = tests.filter((t) => t.score >= 1);
  const counted = real.length ? real : tests;
  const score = counted.length ? counted.reduce((s, t) => s + t.score, 0) / counted.length : 0;
  const anchors = config.scoreToRank.map((a) => ({ score: a.score, xp: ranks.ranks.find((r) => r.rank === a.rank)?.minXp ?? 0 }));
  const top = anchors[anchors.length - 1];
  let xp = top.xp;
  if (score < top.score) {
    const i = Math.max(0, anchors.findIndex((a, k) => score >= a.score && score < anchors[k + 1].score));
    const lo = anchors[i];
    const hi = anchors[i + 1];
    xp = Math.round(lo.xp + ((score - lo.score) / (hi.score - lo.score)) * (hi.xp - lo.xp));
  }
  return { score, xp, label: rankFor(xp, ranks).label };
}

/** The placement award: the XP needed to reach the placement target (never negative). */
export function placementEvent(args: { at: number; tests: PlacementTest[]; totalXpSoFar: number }, rules: XpRules = xpRules): XpEventDraft {
  const target = placementTarget(args.tests);
  return {
    amount: Math.max(0, target.xp - args.totalXpSoFar),
    reason: 'placement',
    sourceType: 'placement',
    sourceId: 'placement',
    ruleVersion: rules.version,
    status: 'granted',
    createdAt: args.at,
    meta: {
      placedAt: target.label,
      score: Math.round(target.score * 100) / 100,
      tests: args.tests.map((t) => ({ id: t.standardId, score: Math.round(t.score * 100) / 100 })),
    },
  };
}
