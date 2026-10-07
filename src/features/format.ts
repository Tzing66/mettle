import { displayWeight, formatDuration, type RecordMetric, type TrackingType, type UnitPref, type XpReason } from '@/engine';

export const REASON_LABELS: Record<XpReason, string> = {
  workout_complete: 'Workout complete',
  working_sets: 'Working sets',
  cardio_minutes: 'Cardio minutes',
  streak_bonus: 'Streak bonus',
  weekly_goal: 'Weekly goal',
  personal_record: 'Personal record',
  first_exercise: 'New exercise',
  first_activity: 'New activity',
  benchmark_tier: 'Benchmark tier',
};

export const TIER_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  novice: 'Novice',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  elite: 'Elite',
};

export function formatWeight(kg: number, unit: UnitPref): string {
  return `${displayWeight(kg, unit)} ${unit}`;
}

export function formatKm(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 2)} km` : `${Math.round(m)} m`;
}

export function formatMetric(metric: RecordMetric, value: number, unit: UnitPref): string {
  switch (metric) {
    case 'e1rm':
      return `${formatWeight(value, unit)} e1RM`;
    case 'max_reps':
      return `${value} reps`;
    case 'max_duration':
      return formatDuration(value);
    case 'max_distance':
      return formatKm(value);
    case 'best_pace':
      return `${formatDuration(value)} /km`;
  }
}

export function formatSet(
  s: { weightKg: number | null; reps: number | null; durationS: number | null; distanceM: number | null },
  tracking: TrackingType,
  unit: UnitPref,
): string {
  switch (tracking) {
    case 'weight_reps':
      return `${displayWeight(s.weightKg ?? 0, unit)} ${unit} × ${s.reps ?? 0}`;
    case 'reps':
      return `${s.reps ?? 0} reps`;
    case 'time':
      return formatDuration(s.durationS ?? 0);
    case 'distance_time':
      return `${formatKm(s.distanceM ?? 0)} · ${formatDuration(s.durationS ?? 0)}`;
  }
}

export function formatDurationMs(ms: number): string {
  const min = Math.round(ms / 60000);
  return min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min} min`;
}

export function formatDay(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString();
}
