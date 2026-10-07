import { xpRules, type XpRules } from './config';
import { estimateOneRepMax } from './e1rm';
import type { ExerciseInfo, PersonalRecord, RecordMetric, SetInput } from './types';

export interface MetricValue {
  metric: RecordMetric;
  value: number;
}

/** Record metrics a single set produces. Warm-ups produce none. */
export function setMetrics(
  set: SetInput,
  exercise: ExerciseInfo,
  rules: XpRules = xpRules,
): MetricValue[] {
  if (set.isWarmup) return [];
  const out: MetricValue[] = [];
  switch (exercise.trackingType) {
    case 'weight_reps': {
      const e1rm = estimateOneRepMax(set.weightKg, set.reps, rules);
      if (e1rm !== null) out.push({ metric: 'e1rm', value: e1rm });
      break;
    }
    case 'reps':
      if (set.reps && set.reps > 0) out.push({ metric: 'max_reps', value: set.reps });
      break;
    case 'time':
      if (set.durationS && set.durationS > 0)
        out.push({ metric: 'max_duration', value: set.durationS });
      break;
    case 'distance_time':
      if (set.distanceM && set.distanceM > 0) {
        out.push({ metric: 'max_distance', value: set.distanceM });
        if (set.durationS && set.durationS > 0 && set.distanceM >= rules.records.minPaceDistanceM)
          out.push({ metric: 'best_pace', value: set.durationS / (set.distanceM / 1000) });
      }
      break;
  }
  return out;
}

export function isBetter(metric: RecordMetric, candidate: number, current: number): boolean {
  return metric === 'best_pace' ? candidate < current : candidate > current;
}

export type RecordOutcome =
  | { kind: 'pr'; record: PersonalRecord; previous: PersonalRecord }
  | { kind: 'baseline'; record: PersonalRecord };

/**
 * Compares a workout against existing bests. Each (exercise, metric) yields at
 * most one outcome — the workout's best — so progressive sets don't stack PRs.
 * A metric with no history becomes a baseline (recorded, but not a PR).
 * Outcomes are ordered by when the winning set was completed.
 */
export function detectRecords(
  sets: SetInput[],
  exercises: Record<string, ExerciseInfo>,
  existing: PersonalRecord[],
  rules: XpRules = xpRules,
): RecordOutcome[] {
  const key = (exerciseId: string, metric: RecordMetric) => `${exerciseId}|${metric}`;
  const existingByKey = new Map(existing.map((r) => [key(r.exerciseId, r.metric), r]));
  const bestByKey = new Map<string, PersonalRecord>();

  for (const set of sets) {
    const exercise = exercises[set.exerciseId];
    if (!exercise) continue;
    for (const { metric, value } of setMetrics(set, exercise, rules)) {
      const k = key(set.exerciseId, metric);
      const best = bestByKey.get(k);
      if (!best || isBetter(metric, value, best.value)) {
        bestByKey.set(k, {
          exerciseId: set.exerciseId,
          metric,
          value,
          setId: set.id,
          achievedAt: set.completedAt,
        });
      }
    }
  }

  const outcomes: RecordOutcome[] = [];
  for (const [k, record] of bestByKey) {
    const previous = existingByKey.get(k);
    if (!previous) outcomes.push({ kind: 'baseline', record });
    else if (isBetter(record.metric, record.value, previous.value))
      outcomes.push({ kind: 'pr', record, previous });
  }
  return outcomes.sort((a, b) => a.record.achievedAt - b.record.achievedAt);
}

/** For the live "PR!" pill: does this set beat the best known so far? */
export function setBeatsRecords(
  set: SetInput,
  exercise: ExerciseInfo,
  bests: PersonalRecord[],
  rules: XpRules = xpRules,
): RecordMetric[] {
  return setMetrics(set, exercise, rules)
    .filter(({ metric, value }) => {
      const best = bests.find((r) => r.exerciseId === exercise.id && r.metric === metric);
      return best !== undefined && isBetter(metric, value, best.value);
    })
    .map((m) => m.metric);
}
