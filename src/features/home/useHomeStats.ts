import { exerciseInfoMap, listExercises } from '@/db/repositories/exercises';
import { completedSetsForWorkouts, finishedWorkoutInputs, getActiveWorkout, listFinishedWorkouts } from '@/db/repositories/workouts';
import { totalXpFromDb, weeklyGoalWeeks, xpByWorkout } from '@/db/repositories/xp';
import { useDbQuery } from '@/db/useDbQuery';
import { dayKey, qualifiesAsWorkout, rankFor, streakWeeks, weekKey, weekStart } from '@/engine';

function readHomeStats() {
  const now = Date.now();
  const exercises = exerciseInfoMap();
  const names = new Map(listExercises().map((e) => [e.id, e.name]));

  const goalWeeks = weeklyGoalWeeks();
  const week = finishedWorkoutInputs(new Date(weekStart(now)));
  const trainingDays = new Set(week.filter((w) => qualifiesAsWorkout(w.sets, exercises)).map((w) => dayKey(w.endedAt)));

  const last = listFinishedWorkouts(1)[0] ?? null;
  const lastSets = last ? completedSetsForWorkouts([last.id]) : [];
  const lastExercises = [...new Set(lastSets.map((s) => s.exerciseId))].map((id) => names.get(id) ?? id);

  return {
    rank: rankFor(totalXpFromDb()),
    streakWeeks: streakWeeks(goalWeeks, now),
    weekGoalHit: goalWeeks.includes(weekKey(now)),
    daysThisWeek: trainingDays.size,
    activeWorkout: getActiveWorkout(),
    lastWorkout: last
      ? {
          id: last.id,
          endedAt: last.endedAt!,
          durationMs: last.endedAt!.getTime() - last.startedAt.getTime(),
          exercises: lastExercises,
          sets: lastSets.filter((s) => !s.isWarmup).length,
          xp: xpByWorkout([last.id]).get(last.id) ?? 0,
        }
      : null,
  };
}

export function useHomeStats() {
  return useDbQuery(readHomeStats, ['xp_events', 'workouts', 'workout_sets']);
}
