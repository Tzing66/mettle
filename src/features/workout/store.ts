// Ephemeral workout UI state. Workout data itself lives in SQLite.
import { create } from 'zustand';

import type { WorkoutSummary } from './finishWorkout';

export const DEFAULT_REST_S = 90;

interface RestTimer {
  endsAt: number;
  durationS: number;
}

interface WorkoutUiState {
  rest: RestTimer | null;
  startRest: (durationS?: number) => void;
  extendRest: (seconds: number) => void;
  stopRest: () => void;

  /** Set row currently expanded for editing. */
  expandedSetId: string | null;
  setExpanded: (id: string | null) => void;

  lastSummary: WorkoutSummary | null;
  setLastSummary: (s: WorkoutSummary | null) => void;
}

export const useWorkoutUi = create<WorkoutUiState>((set) => ({
  rest: null,
  startRest: (durationS = DEFAULT_REST_S) => set({ rest: { endsAt: Date.now() + durationS * 1000, durationS } }),
  extendRest: (seconds) =>
    set((s) => (s.rest ? { rest: { endsAt: s.rest.endsAt + seconds * 1000, durationS: s.rest.durationS + seconds } } : s)),
  stopRest: () => set({ rest: null }),

  expandedSetId: null,
  setExpanded: (id) => set({ expandedSetId: id }),

  lastSummary: null,
  setLastSummary: (lastSummary) => set({ lastSummary }),
}));
