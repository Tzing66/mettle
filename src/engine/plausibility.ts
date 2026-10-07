// Sanity checks, not verification. Flagged XP is still shown to the user but
// stays `pending_review` (excluded from leaderboards) until a repeat
// performance at or above the flagged value confirms it.

import { DAY_MS, xpRules, type BenchmarkDef, type XpRules } from './config';
import { isBetter } from './records';
import type { PerformanceRef, PersonalRecord, Sex } from './types';

export interface BodyweightLog {
  weightKg: number;
  loggedAt: number;
}

/** e1RM more than `e1rmJumpPct` above a best set within the last `e1rmJumpWindowDays`. */
export function isSuspiciousE1rmJump(
  newValue: number,
  at: number,
  previous: PersonalRecord | undefined,
  rules: XpRules = xpRules,
): boolean {
  if (!previous || previous.metric !== 'e1rm') return false;
  const { e1rmJumpPct, e1rmJumpWindowDays } = rules.plausibility;
  const withinWindow = at - previous.achievedAt <= e1rmJumpWindowDays * DAY_MS;
  // Epsilon so exactly-at-threshold isn't flagged by float error (100 × 1.15 = 114.999…).
  return withinWindow && newValue / previous.value - 1 > e1rmJumpPct + 1e-9;
}

/** Benchmark value beyond the elite threshold × `eliteMultiplier`. */
export function exceedsEliteCeiling(
  benchmark: BenchmarkDef,
  value: number,
  sex: Sex,
  rules: XpRules = xpRules,
): boolean {
  const thresholds = benchmark.thresholds[sex];
  const elite = thresholds[thresholds.length - 1];
  return value > elite * rules.plausibility.eliteMultiplier;
}

/**
 * Average of bodyweight logs in the trailing window. Falls back to the most
 * recent earlier log, or null if there are none. Benchmarks use this rather
 * than the latest log so a one-off low weigh-in can't inflate ratios.
 */
export function rollingBodyweight(
  logs: BodyweightLog[],
  at: number,
  rules: XpRules = xpRules,
): number | null {
  const past = logs.filter((l) => l.loggedAt <= at);
  if (past.length === 0) return null;
  const windowStart = at - rules.plausibility.rollingBodyweightDays * DAY_MS;
  const inWindow = past.filter((l) => l.loggedAt >= windowStart);
  if (inWindow.length > 0)
    return inWindow.reduce((sum, l) => sum + l.weightKg, 0) / inWindow.length;
  return past.reduce((latest, l) => (l.loggedAt > latest.loggedAt ? l : latest)).weightKg;
}

/** True when a new weigh-in differs by more than the allowed % from any log in the past week. */
export function bodyweightNeedsConfirmation(
  logs: BodyweightLog[],
  newWeightKg: number,
  at: number,
  rules: XpRules = xpRules,
): boolean {
  const { bodyweightChangePct, bodyweightChangeWindowDays } = rules.plausibility;
  const windowStart = at - bodyweightChangeWindowDays * DAY_MS;
  return logs.some(
    (l) =>
      l.loggedAt >= windowStart &&
      l.loggedAt <= at &&
      Math.abs(newWeightKg - l.weightKg) / l.weightKg > bodyweightChangePct,
  );
}

export interface PendingEvent {
  id: string;
  createdAt: number;
  performance: PerformanceRef;
}

export interface Performance extends PerformanceRef {
  achievedAt: number;
}

/** Ids of pending events confirmed by a later performance at or above the flagged value. */
export function confirmedPendingIds(pending: PendingEvent[], performances: Performance[]): string[] {
  return pending
    .filter(({ createdAt, performance: flagged }) =>
      performances.some(
        (p) =>
          p.achievedAt > createdAt &&
          p.exerciseId === flagged.exerciseId &&
          p.metric === flagged.metric &&
          (p.value === flagged.value || isBetter(p.metric, p.value, flagged.value)),
      ),
    )
    .map((e) => e.id);
}
