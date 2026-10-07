// App-facing sync: one run at a time, status for the UI, and the triggers
// (sign-in, app foreground, after finishing a workout).

import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { getSession, useSession } from '@/features/account/auth';
import { cloudConfigured, supabase } from '@/features/account/supabase';

import { getSyncState, queueProfileRefresh, resetLocalForAccount, syncAccount } from './sync';

type Status = 'idle' | 'syncing' | 'error' | 'mismatch';

interface SyncStore {
  status: Status;
  error: string | null;
  lastSyncedAt: Date | null;
  /** Server-verified XP (leaderboard XP excludes pending). Null until computed this session. */
  serverXp: { total: number; granted: number } | null;
}

export const useSyncStore = create<SyncStore>(() => ({
  status: 'idle',
  error: null,
  // Read lazily (SyncController) — at import time the database may not be migrated yet.
  lastSyncedAt: null,
  serverXp: null,
}));

/** Asks the server to re-score this account's synced history (recompute-xp Edge Function). */
async function recomputeServerXp() {
  const { data, error } = await supabase.functions.invoke<{ totalXp: number; grantedXp: number }>('recompute-xp', { method: 'POST' });
  if (error || !data) throw new Error(`Server XP: ${error?.message ?? 'no response'}`);
  useSyncStore.setState({ serverXp: { total: data.totalXp, granted: data.grantedXp } });
}

let running: Promise<void> | null = null;
let again = false;

/** Syncs now if signed in. Concurrent calls coalesce into one follow-up run. */
export function syncNow(): Promise<void> {
  if (!cloudConfigured) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      const userId = getSession()?.user.id;
      if (!userId) break;
      useSyncStore.setState({ status: 'syncing', error: null });
      try {
        const res = await syncAccount(supabase, userId);
        if (res.status === 'mismatch') {
          useSyncStore.setState({ status: 'mismatch' });
        } else {
          // Re-score on the server when history changed, and once per session.
          if (res.pushed > 0 || useSyncStore.getState().serverXp === null) await recomputeServerXp();
          useSyncStore.setState({ status: 'idle', lastSyncedAt: new Date() });
        }
      } catch (e) {
        useSyncStore.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

let timer: ReturnType<typeof setTimeout> | null = null;
/** Debounced sync for "something just changed" (e.g. a finished workout). */
export function requestSync(delayMs = 1500) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    syncNow();
  }, delayMs);
}

/** Replaces this phone's data with the signed-in account's (after an account switch). */
export async function replaceLocalWithAccountData() {
  const userId = getSession()?.user.id;
  if (!userId) return;
  resetLocalForAccount(userId);
  await syncNow();
}

/** Mount once (root layout): syncs on sign-in and whenever the app returns to the foreground. */
export function SyncController() {
  const { session } = useSession();
  const userId = session?.user.id;

  useEffect(() => {
    useSyncStore.setState({ lastSyncedAt: getSyncState().lastSyncedAt ?? null });
    queueProfileRefresh(); // once per app launch: keeps the server's time zone current
  }, []);

  useEffect(() => {
    if (userId) syncNow();
  }, [userId]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNow();
    });
    return () => sub.remove();
  }, []);

  return null;
}
