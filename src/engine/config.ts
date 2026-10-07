// Typed access to the versioned JSON config. Engine functions take config as an
// argument (defaulting to these) so tests can pass tuned variants.

import benchmarksJson from '@config/benchmarks.v1.json';
import ranksJson from '@config/ranks.v1.json';
import xpRulesJson from '@config/xp-rules.v1.json';

import type { BenchmarkTier, Sex } from './types';

export interface CardioBand {
  upToMinutes: number;
  xpPerMinute: number;
}

export interface XpRules {
  version: string;
  consistency: {
    workoutComplete: number;
    workoutMinWorkingSets: number;
    workoutMinCardioMinutes: number;
    perWorkingSet: number;
    maxSetXpPerWorkout: number;
    cardioBands: CardioBand[];
    weeklyGoal: number;
    streakBonusPerWeek: number;
    streakBonusMax: number;
    dailyCap: number;
  };
  progress: {
    personalRecord: number;
    maxPrsPerDay: number;
    firstExercise: number;
    firstActivity: number;
    benchmarkTier: Record<BenchmarkTier, number>;
  };
  e1rm: { formula: 'epley' | 'brzycki'; maxReps: number };
  records: { minPaceDistanceM: number };
  plausibility: {
    e1rmJumpPct: number;
    e1rmJumpWindowDays: number;
    eliteMultiplier: number;
    bodyweightChangePct: number;
    bodyweightChangeWindowDays: number;
    rollingBodyweightDays: number;
  };
}

export type RankLetter = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export interface RanksConfig {
  version: string;
  levelsPerRank: number;
  ranks: { rank: RankLetter; minXp: number }[];
  sLevelSpanXp: number;
}

interface BenchmarkBase {
  id: string;
  name: string;
  /** Five ascending thresholds, one per tier. */
  thresholds: Record<Sex, number[]>;
}

export type BenchmarkDef =
  | (BenchmarkBase & { kind: 'bodyweight_multiple' })
  | (BenchmarkBase & { kind: 'max_reps' })
  | (BenchmarkBase & {
      kind: 'run_age_graded';
      distanceM: number;
      standardSeconds: Record<Sex, number>;
    });

export interface BenchmarksConfig {
  version: string;
  tiers: BenchmarkTier[];
  benchmarks: BenchmarkDef[];
}

export const xpRules = xpRulesJson as XpRules;
export const ranksConfig = ranksJson as RanksConfig;
export const benchmarksConfig = benchmarksJson as unknown as BenchmarksConfig;

export const DAY_MS = 24 * 60 * 60 * 1000;
