import { xpRules, type XpRules } from './config';

export function epley(weightKg: number, reps: number): number {
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

export function brzycki(weightKg: number, reps: number): number {
  return (weightKg * 36) / (37 - reps);
}

/**
 * Estimated one-rep max, or null when the set can't produce a trustworthy
 * estimate (no weight, no reps, or more reps than the configured limit).
 */
export function estimateOneRepMax(
  weightKg: number | undefined,
  reps: number | undefined,
  rules: XpRules = xpRules,
): number | null {
  if (!weightKg || weightKg <= 0 || !reps || reps < 1) return null;
  if (reps > rules.e1rm.maxReps) return null;
  return rules.e1rm.formula === 'brzycki' ? brzycki(weightKg, reps) : epley(weightKg, reps);
}
