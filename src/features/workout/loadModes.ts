// How each exercise's weight is typed, remembered on this phone (see load.ts).
import { Storage } from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import type { LoadMode } from './load';

const KEY = 'load-modes';

function read(): Record<string, LoadMode> {
  try {
    return JSON.parse(Storage.getItemSync(KEY) ?? '{}') as Record<string, LoadMode>;
  } catch {
    return {};
  }
}

export const useLoadModes = create<{ modes: Record<string, LoadMode>; setMode: (exerciseId: string, mode: LoadMode) => void }>((set, get) => ({
  modes: read(),
  setMode: (exerciseId, mode) => {
    const modes = { ...get().modes, [exerciseId]: mode };
    try {
      Storage.setItemSync(KEY, JSON.stringify(modes));
    } catch {
      // Not persisted; still applies for this session.
    }
    set({ modes });
  },
}));

