// Ephemeral workout UI state. Workout data itself lives in SQLite.
import { create } from 'zustand';

import type { WorkoutSummary } from './finishWorkout';

const DEFAULT_REST_S = 90;

interface RestTimer {
  endsAt: number;
  durationS: number;
}

interface WorkoutUiState {
  rest: RestTimer | null;
  startRest: (durationS?: number) => void;
  extendRest: (seconds: number) => void;
  stopRest: () => void;

  lastSummary: WorkoutSummary | null;
  setLastSummary: (s: WorkoutSummary | null) => void;

  /** The planning workout being logged after the fact, and how long it lasted. */
  past: PastWorkout | null;
  setPast: (p: PastWorkout | null) => void;
}

export interface PastWorkout {
  workoutId: string;
  durationMin: number;
}

export const useWorkoutUi = create<WorkoutUiState>((set) => ({
  rest: null,
  startRest: (durationS = DEFAULT_REST_S) => set({ rest: { endsAt: Date.now() + durationS * 1000, durationS } }),
  extendRest: (seconds) =>
    set((s) => (s.rest ? { rest: { endsAt: s.rest.endsAt + seconds * 1000, durationS: s.rest.durationS + seconds } } : s)),
  stopRest: () => set({ rest: null }),

  lastSummary: null,
  setLastSummary: (lastSummary) => set({ lastSummary }),

  past: null,
  setPast: (past) => set({ past }),
}));
