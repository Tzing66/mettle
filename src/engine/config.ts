// Typed access to the versioned JSON config. Engine functions take config as an
// argument (defaulting to these) so tests can pass tuned variants.

import ageGradingJson from '@config/age-grading.road2025.json';
import benchmarksJson from '@config/benchmarks.v1.json';
import ranksJson from '@config/ranks.v1.json';
import xpRulesJson from '@config/xp-rules.v2.json';

import type { BenchmarkTier, Sex } from './types';

interface CardioBand {
  upToMinutes: number;
  xpPerMinute: number;
}

export interface XpRules {
  version: string;
  consistency: {
    workoutComplete: number;
    workoutMinWorkingSets: number;
    workoutMinCardioMinutes: number;
    /** Working-set XP by how close the set is to your best for that exercise. */
    setXp: { bands: { minRatio: number; xp: number }[]; firstSession: number };
    maxSetXpPerWorkout: number;
    cardioBands: CardioBand[];
    weeklyGoal: number;
    streakBonusPerWeek: number;
    streakBonusMax: number;
    dailyCap: number;
  };
  progress: {
    personalRecord: { base: number; perPercent: number; max: number };
    maxPrsPerDay: number;
    firstExercise: number;
    maxFirstsPerWorkout: number;
    firstExerciseMinSets: number;
    firstActivity: number;
    benchmarkTier: Record<BenchmarkTier, number>;
  };
  placement: {
    /** Documentation only: placement happens at the first workout with a benchmark test. */
    trigger: string;
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
  /**
   * Exercise benchmark groups that also feed this benchmark (e.g. every
   * exercise tagged "run" counts toward both the 5k and the 10k).
   */
  matches?: string[];
}

export type BenchmarkDef =
  | (BenchmarkBase & { kind: 'bodyweight_multiple' })
  | (BenchmarkBase & { kind: 'max_reps' })
  | (BenchmarkBase & {
      kind: 'run_age_graded';
      distanceM: number;
    });

export interface BenchmarksConfig {
  version: string;
  tiers: BenchmarkTier[];
  benchmarks: BenchmarkDef[];
}

export const xpRules = xpRulesJson as XpRules;
export const ranksConfig = ranksJson as RanksConfig;
export const benchmarksConfig = benchmarksJson as unknown as BenchmarksConfig;

export interface AgeGradingConfig {
  version: string;
  /** sex → distance in metres → age in years → age standard in seconds. */
  standards: Record<Sex, Record<string, Record<string, number>>>;
}

export const ageGrading = ageGradingJson as unknown as AgeGradingConfig;

export const DAY_MS = 24 * 60 * 60 * 1000;
