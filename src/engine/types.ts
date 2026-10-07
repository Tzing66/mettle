// Shared engine types. Units are always kg / metres / seconds; times are epoch ms.

export type Sex = 'male' | 'female';

export type ExerciseCategory = 'free_weight' | 'machine' | 'bodyweight' | 'cardio';

export type TrackingType = 'weight_reps' | 'reps' | 'time' | 'distance_time';

export type RecordMetric =
  | 'e1rm' // weight_reps, higher is better
  | 'max_reps' // reps, higher is better
  | 'max_duration' // time (e.g. plank), higher is better
  | 'max_distance' // distance_time, higher is better
  | 'best_pace'; // distance_time, seconds per km, lower is better

export type XpStatus = 'granted' | 'pending_review';

export type XpReason =
  | 'workout_complete'
  | 'working_sets'
  | 'cardio_minutes'
  | 'streak_bonus'
  | 'weekly_goal'
  | 'personal_record'
  | 'first_exercise'
  | 'first_activity'
  | 'benchmark_tier';

export type XpSourceType = 'workout' | 'week' | 'set' | 'exercise' | 'activity' | 'benchmark';

export interface ExerciseInfo {
  id: string;
  category: ExerciseCategory;
  trackingType: TrackingType;
  /** Cardio activity type ('run', 'swim', 'cycle', ...). Pays first-activity XP once. */
  activity?: string;
  benchmarkId?: string;
}

export interface SetInput {
  id: string;
  exerciseId: string;
  isWarmup: boolean;
  weightKg?: number;
  reps?: number;
  durationS?: number;
  distanceM?: number;
  completedAt: number;
}

export interface WorkoutInput {
  id: string;
  startedAt: number;
  endedAt: number;
  sets: SetInput[];
}

export interface PersonalRecord {
  exerciseId: string;
  metric: RecordMetric;
  value: number;
  setId: string;
  achievedAt: number;
}

export interface BenchmarkUnlock {
  benchmarkId: string;
  tier: BenchmarkTier;
  value: number;
  unlockedAt: number;
  status: XpStatus;
}

export type BenchmarkTier = 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'elite';

/** Links an XP event back to the performance that earned it, for auto-confirming pending events. */
export interface PerformanceRef {
  exerciseId: string;
  metric: RecordMetric;
  value: number;
}

export interface XpEventDraft {
  amount: number;
  reason: XpReason;
  sourceType: XpSourceType;
  sourceId: string;
  ruleVersion: string;
  status: XpStatus;
  createdAt: number;
  meta?: Record<string, unknown> & { performance?: PerformanceRef };
}

export interface Profile {
  sex: Sex;
  birthYear: number;
}
