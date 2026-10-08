// Placement (plan §7.4): the first workout that includes any exercise with a
// placement standard places the user, so an arms day or a run counts too.
//
// Each covered exercise gets an exact score from where its best set sits
// between the strength/age-grade levels (Beginner = 1 … Elite = 5, below
// Beginner = 0–1). The average score maps onto the ladder:
// 0 → E1, 1 → D1, 2 → C1, 3 → B1, 4+ → A1 (hard cap), linearly in between.
// One placement award brings total XP to that point. Deterministic from
// history, so phone and server agree.

import placementJson from '@config/placement-standards.v1.json';

import { ageAt, ageStandardSeconds, findBenchmark } from './benchmarks';
import { benchmarksConfig, ranksConfig, xpRules, type BenchmarkDef, type BenchmarksConfig, type RankLetter, type RanksConfig, type XpRules } from './config';
import { epley } from './e1rm';
import { rankFor } from './ranks';
import type { ExerciseInfo, Sex, WorkoutInput, XpEventDraft } from './types';

type StandardKind = BenchmarkDef['kind'] | 'max_duration';

export interface PlacementStandard {
  id: string;
  name: string;
  exerciseIds: string[];
  kind: StandardKind;
  thresholds: Record<Sex, number[]>;
  distanceM?: number;
}

interface PlacementConfig {
  version: string;
  maxRepsForEstimate: number;
  scoreToRank: { score: number; rank: RankLetter }[];
  standards: ({ benchmark: string; exerciseIds: string[] } | PlacementStandard)[];
}

const placementConfig = placementJson as unknown as PlacementConfig;

/** Placement standards with benchmark references resolved. */
export function placementStandards(config: PlacementConfig = placementConfig, benchmarks: BenchmarksConfig = benchmarksConfig): PlacementStandard[] {
  return config.standards.flatMap((s) => {
    if ('benchmark' in s) {
      const b = findBenchmark(s.benchmark, benchmarks);
      if (!b) return [];
      return [{ id: b.id, name: b.name, exerciseIds: s.exerciseIds, kind: b.kind, thresholds: b.thresholds, distanceM: b.kind === 'run_age_graded' ? b.distanceM : undefined }];
    }
    return [s];
  });
}

export interface PlacementTest {
  standardId: string;
  /** Normalised result (× bodyweight, reps, seconds, or age-grade %). */
  value: number;
  /** 0–5: Beginner = 1 … Elite = 5, fractional in between. */
  score: number;
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

/**
 * Best result per covered exercise in these workouts, scored. Lift sets up to
 * `maxRepsForEstimate` reps count (placement accepts higher-rep work than PR
 * estimates). Implausible results (beyond elite × 1.2) are skipped.
 */
export function placementTests(
  workouts: WorkoutInput[],
  ctx: { exercises: Record<string, ExerciseInfo>; sex: Sex; bodyweightKg: number | null; birthYear: number },
  rules: XpRules = xpRules,
  config: PlacementConfig = placementConfig,
): PlacementTest[] {
  const sets = workouts.flatMap((w) => w.sets).filter((s) => !s.isWarmup);
  const tests: PlacementTest[] = [];
  for (const std of placementStandards(config)) {
    let best = 0;
    for (const s of sets) {
      if (!std.exerciseIds.includes(s.exerciseId)) continue;
      let value = 0;
      if (std.kind === 'bodyweight_multiple') {
        if (!ctx.bodyweightKg || !s.weightKg || !s.reps || s.reps > config.maxRepsForEstimate) continue;
        value = epley(s.weightKg, s.reps) / ctx.bodyweightKg;
      } else if (std.kind === 'max_reps') {
        value = s.reps ?? 0;
      } else if (std.kind === 'max_duration') {
        value = s.durationS ?? 0;
      } else if (std.distanceM && s.distanceM && s.durationS && s.distanceM >= std.distanceM) {
        const standard = ageStandardSeconds(ctx.sex, ageAt(ctx.birthYear, s.completedAt), std.distanceM);
        if (standard) value = (standard / (s.durationS * (std.distanceM / s.distanceM))) * 100;
      }
      best = Math.max(best, value);
    }
    const thresholds = std.thresholds[ctx.sex];
    if (best <= 0 || best > thresholds[thresholds.length - 1] * rules.plausibility.eliteMultiplier) continue;
    tests.push({ standardId: std.id, value: best, score: standardScore(best, thresholds) });
  }
  return tests;
}

/** Average score → a point on the ladder (XP), capped at A1. */
export function placementTarget(
  tests: PlacementTest[],
  config: PlacementConfig = placementConfig,
  ranks: RanksConfig = ranksConfig,
): { score: number; xp: number; label: string } {
  const score = tests.length ? tests.reduce((s, t) => s + t.score, 0) / tests.length : 0;
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

/**
 * The placement award: the larger of (a) the XP needed to reach the placement
 * target and (b) the tier XP the placement workout's benchmarks would have
 * paid. Nobody ends up worse off than without placement.
 */
export function placementEvent(
  args: { at: number; tests: PlacementTest[]; totalXpSoFar: number; tierXp?: number },
  rules: XpRules = xpRules,
): XpEventDraft {
  const target = placementTarget(args.tests);
  return {
    amount: Math.max(0, target.xp - args.totalXpSoFar, args.tierXp ?? 0),
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
