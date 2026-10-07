// Two-way sync between the phone's SQLite and the user's Supabase rows.
//
//   * The phone is the source of truth for logging; SQLite triggers queue every
//     change in sync_outbox (only once the phone is linked to an account).
//   * pull: fetch rows the server changed since our cursor. Rows with a pending
//     local change are skipped (the local edit wins and is pushed next).
//   * push: upload queued rows in foreign-key order; local deletes become
//     soft deletes. Unfinished workouts (and their sets) wait until finished.
//   * When history changed, derived data (XP, records, unlocks) is rebuilt.

import type { SupabaseClient } from '@supabase/supabase-js';
import { and, eq, inArray, isNotNull, lte, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { rebuildDerivedData } from '@/db/repositories/derived';
import { PROFILE_ID } from '@/db/repositories/profile';
import { bodyweightLogs, exercises, profile, syncOutbox, syncState, workoutSets, workouts } from '@/db/schema';

import {
  bodyweightFromCloud,
  bodyweightToCloud,
  customExerciseFromCloud,
  customExerciseToCloud,
  profileFromCloud,
  profileToCloud,
  PUSH_ORDER,
  setFromCloud,
  setToCloud,
  workoutFromCloud,
  workoutToCloud,
  type CloudRow,
  type CloudTable,
} from './mapping';

export type SyncClient = Pick<SupabaseClient, 'from'>;

const PAGE = 500;
/** Re-read a few seconds before the cursor: commits can land slightly out of order. Upserts are idempotent. */
const CURSOR_OVERLAP_MS = 5000;

// ---------------------------------------------------------------- state

export function getSyncState() {
  return db.select().from(syncState).where(eq(syncState.id, 1)).get() ?? { id: 1, userId: null, applying: 0, cursor: null, lastSyncedAt: null };
}

function setState(patch: Partial<typeof syncState.$inferInsert>) {
  db.insert(syncState)
    .values({ id: 1, ...patch })
    .onConflictDoUpdate({ target: syncState.id, set: patch })
    .run();
}

/**
 * Queues the profile for upload even if unchanged — it carries the phone's UTC
 * offset, which the server needs to count days in local time (time zones and
 * DST change without the profile changing).
 */
export function queueProfileRefresh() {
  if (getSyncState().userId && db.select().from(profile).get()) {
    db.insert(syncOutbox).values({ tableName: 'profiles', rowId: PROFILE_ID }).run();
  }
}

export function pendingChangeCount(): number {
  return db.select({ n: sql<number>`count(distinct ${syncOutbox.tableName} || ':' || ${syncOutbox.rowId})` }).from(syncOutbox).get()?.n ?? 0;
}

/** Runs `fn` with triggers silenced so applied rows aren't queued for upload. */
function applying<T>(fn: () => T): T {
  setState({ applying: 1 });
  try {
    return fn();
  } finally {
    setState({ applying: 0 });
  }
}

export type LinkResult = 'linked' | 'same' | 'mismatch';

/**
 * Ties this phone's data to an account. On first link every existing row is
 * queued for upload. Refuses (mismatch) if the data belongs to another account.
 */
export function linkAccount(userId: string): LinkResult {
  const state = getSyncState();
  if (state.userId === userId) return 'same';
  if (state.userId && state.userId !== userId) return 'mismatch';

  db.transaction((tx) => {
    tx.insert(syncState).values({ id: 1, userId, cursor: null }).onConflictDoUpdate({ target: syncState.id, set: { userId, cursor: null } }).run();
    const queue = (table: CloudTable, ids: string[]) => {
      for (const rowId of ids) tx.insert(syncOutbox).values({ tableName: table, rowId }).run();
    };
    if (tx.select().from(profile).get()) queue('profiles', [PROFILE_ID]);
    queue('custom_exercises', tx.select({ id: exercises.id }).from(exercises).where(eq(exercises.isBuiltin, false)).all().map((r) => r.id));
    queue('workouts', tx.select({ id: workouts.id }).from(workouts).all().map((r) => r.id));
    queue('workout_sets', tx.select({ id: workoutSets.id }).from(workoutSets).all().map((r) => r.id));
    queue('bodyweight_logs', tx.select({ id: bodyweightLogs.id }).from(bodyweightLogs).all().map((r) => r.id));
  });
  return 'linked';
}

/** Wipes this phone's synced and derived data, then links it to `userId` (for account switches). */
export function resetLocalForAccount(userId: string) {
  applying(() =>
    db.transaction((tx) => {
      tx.delete(workoutSets).run();
      tx.delete(workouts).run();
      tx.delete(bodyweightLogs).run();
      tx.delete(exercises).where(eq(exercises.isBuiltin, false)).run();
      tx.update(exercises).set({ isFavourite: false }).run();
      tx.run(sql`DELETE FROM xp_events`);
      tx.run(sql`DELETE FROM personal_records`);
      tx.run(sql`DELETE FROM benchmark_unlocks`);
      tx.delete(syncOutbox).run();
    }),
  );
  setState({ userId, cursor: null, lastSyncedAt: null });
}

// ---------------------------------------------------------------- push

function queuedIds(): { maxId: number; byTable: Map<CloudTable, Set<string>> } {
  const rows = db.select().from(syncOutbox).all();
  const byTable = new Map<CloudTable, Set<string>>();
  let maxId = 0;
  for (const r of rows) {
    maxId = Math.max(maxId, r.id);
    const set = byTable.get(r.tableName as CloudTable) ?? new Set<string>();
    set.add(r.rowId);
    byTable.set(r.tableName as CloudTable, set);
  }
  return { maxId, byTable };
}

async function check<T extends { error: { message: string } | null }>(p: PromiseLike<T>): Promise<T> {
  const res = await p;
  if (res.error) throw new Error(res.error.message);
  return res;
}

async function upsertChunks(client: SyncClient, table: CloudTable, rows: object[], onConflict: string) {
  for (let i = 0; i < rows.length; i += PAGE) {
    await check(client.from(table).upsert(rows.slice(i, i + PAGE), { onConflict }));
  }
}

async function softDelete(client: SyncClient, table: CloudTable, ids: string[]) {
  for (let i = 0; i < ids.length; i += PAGE) {
    await check(client.from(table).update({ deleted_at: new Date().toISOString() }).in('id', ids.slice(i, i + PAGE)));
  }
}

async function pushChanges(client: SyncClient, userId: string): Promise<{ pushed: number; deferred: number }> {
  const { maxId, byTable } = queuedIds();
  if (maxId === 0) return { pushed: 0, deferred: 0 };
  const deferred: { table: CloudTable; id: string }[] = [];
  let pushed = 0;

  for (const table of PUSH_ORDER) {
    const ids = [...(byTable.get(table) ?? [])];
    if (ids.length === 0) continue;

    if (table === 'profiles') {
      const p = db.select().from(profile).get();
      if (!p) continue;
      const favourites = db.select({ id: exercises.id }).from(exercises).where(and(eq(exercises.isFavourite, true), eq(exercises.isBuiltin, true))).all().map((r) => r.id);
      await check(client.from('profiles').upsert(profileToCloud(p, userId, favourites), { onConflict: 'user_id' }));
      pushed++;
      continue;
    }

    let found: { id: string }[] = [];
    let rows: object[] = [];
    if (table === 'custom_exercises') {
      const local = db.select().from(exercises).where(and(inArray(exercises.id, ids), eq(exercises.isBuiltin, false))).all();
      found = local;
      rows = local.map((e) => customExerciseToCloud(e, userId));
    } else if (table === 'workouts') {
      const local = db.select().from(workouts).where(inArray(workouts.id, ids)).all();
      const ready = local.filter((w) => w.endedAt !== null);
      for (const w of local) if (!w.endedAt) deferred.push({ table, id: w.id });
      found = local;
      rows = ready.map((w) => workoutToCloud(w, userId));
    } else if (table === 'workout_sets') {
      const local = db.select().from(workoutSets).where(inArray(workoutSets.id, ids)).all();
      const finished = new Set(
        db.select({ id: workouts.id }).from(workouts).where(and(inArray(workouts.id, [...new Set(local.map((s) => s.workoutId))]), isNotNull(workouts.endedAt))).all().map((r) => r.id),
      );
      for (const s of local) if (!finished.has(s.workoutId)) deferred.push({ table, id: s.id });
      found = local;
      rows = local.filter((s) => finished.has(s.workoutId)).map((s) => setToCloud(s, userId));
    } else if (table === 'bodyweight_logs') {
      const local = db.select().from(bodyweightLogs).where(inArray(bodyweightLogs.id, ids)).all();
      found = local;
      rows = local.map((b) => bodyweightToCloud(b, userId));
    }

    await upsertChunks(client, table, rows, 'id');
    const present = new Set(found.map((r) => r.id));
    const removed = ids.filter((id) => !present.has(id));
    if (removed.length) await softDelete(client, table, removed);
    pushed += rows.length + removed.length;
  }

  // Everything up to maxId is handled; deferred rows are re-queued for later.
  db.transaction((tx) => {
    tx.delete(syncOutbox).where(lte(syncOutbox.id, maxId)).run();
    for (const d of deferred) tx.insert(syncOutbox).values({ tableName: d.table, rowId: d.id }).run();
  });
  return { pushed, deferred: deferred.length };
}

// ---------------------------------------------------------------- pull

async function fetchChanged(client: SyncClient, table: CloudTable, since: string | null): Promise<CloudRow[]> {
  const out: CloudRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = client.from(table).select('*');
    if (since) q = q.gt('updated_at', since);
    const { data } = await check(q.order('updated_at', { ascending: true }).range(from, from + PAGE - 1));
    const rows = (data ?? []) as CloudRow[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

async function pullChanges(
  client: SyncClient,
  { remoteProfileWins = false }: { remoteProfileWins?: boolean } = {},
): Promise<{ pulled: number; historyChanged: boolean }> {
  const state = getSyncState();
  const since = state.cursor ? new Date(Date.parse(state.cursor) - CURSOR_OVERLAP_MS).toISOString() : null;

  const fetched = new Map<CloudTable, CloudRow[]>();
  for (const table of PUSH_ORDER) fetched.set(table, await fetchChanged(client, table, since));

  if (remoteProfileWins && (fetched.get('profiles')?.length ?? 0) > 0) {
    db.delete(syncOutbox).where(eq(syncOutbox.tableName, 'profiles')).run();
  }
  const pending = new Set(db.select().from(syncOutbox).all().map((r) => `${r.tableName}:${r.rowId}`));
  const isPending = (table: CloudTable, id: string) => pending.has(`${table}:${id}`);

  let pulled = 0;
  let historyChanged = false;
  let cursor = state.cursor;
  const bump = (r: CloudRow) => {
    if (!cursor || r.updated_at > cursor) cursor = r.updated_at;
  };
  const knownExercises = new Set(db.select({ id: exercises.id }).from(exercises).all().map((r) => r.id));

  applying(() =>
    db.transaction((tx) => {
      for (const r of fetched.get('profiles') ?? []) {
        bump(r);
        if (isPending('profiles', PROFILE_ID)) continue;
        const { favouriteIds, ...fields } = profileFromCloud(r);
        tx.insert(profile).values({ id: PROFILE_ID, ...fields }).onConflictDoUpdate({ target: profile.id, set: fields }).run();
        tx.update(exercises).set({ isFavourite: false }).where(eq(exercises.isBuiltin, true)).run();
        if (favouriteIds.length) tx.update(exercises).set({ isFavourite: true }).where(and(eq(exercises.isBuiltin, true), inArray(exercises.id, favouriteIds))).run();
        pulled++;
        historyChanged = true;
      }

      for (const r of fetched.get('custom_exercises') ?? []) {
        bump(r);
        const e = customExerciseFromCloud(r);
        if (isPending('custom_exercises', e.id)) continue;
        if (r.deleted_at) {
          tx.delete(exercises).where(and(eq(exercises.id, e.id), eq(exercises.isBuiltin, false))).run();
          knownExercises.delete(e.id);
        } else {
          tx.insert(exercises).values(e).onConflictDoUpdate({ target: exercises.id, set: e }).run();
          knownExercises.add(e.id);
        }
        pulled++;
      }

      for (const r of fetched.get('workouts') ?? []) {
        bump(r);
        const w = workoutFromCloud(r);
        if (isPending('workouts', w.id)) continue;
        if (r.deleted_at) tx.delete(workouts).where(eq(workouts.id, w.id)).run();
        else tx.insert(workouts).values(w).onConflictDoUpdate({ target: workouts.id, set: w }).run();
        pulled++;
        historyChanged = true;
      }

      const localWorkouts = new Set(tx.select({ id: workouts.id }).from(workouts).all().map((r) => r.id));
      for (const r of fetched.get('workout_sets') ?? []) {
        bump(r);
        const s = setFromCloud(r);
        if (isPending('workout_sets', s.id)) continue;
        if (r.deleted_at) tx.delete(workoutSets).where(eq(workoutSets.id, s.id)).run();
        else if (localWorkouts.has(s.workoutId) && knownExercises.has(s.exerciseId)) {
          tx.insert(workoutSets).values(s).onConflictDoUpdate({ target: workoutSets.id, set: s }).run();
        } else continue; // orphan or unknown exercise: skip rather than break the FK
        pulled++;
        historyChanged = true;
      }

      for (const r of fetched.get('bodyweight_logs') ?? []) {
        bump(r);
        const b = bodyweightFromCloud(r);
        if (isPending('bodyweight_logs', b.id)) continue;
        if (r.deleted_at) tx.delete(bodyweightLogs).where(eq(bodyweightLogs.id, b.id)).run();
        else tx.insert(bodyweightLogs).values(b).onConflictDoUpdate({ target: bodyweightLogs.id, set: b }).run();
        pulled++;
        historyChanged = true;
      }
    }),
  );

  setState({ cursor });
  return { pulled, historyChanged };
}

// ---------------------------------------------------------------- orchestration

export interface SyncResult {
  status: 'synced' | 'mismatch';
  pulled: number;
  pushed: number;
  rebuilt: boolean;
}

/** Link (if needed) → pull → push → rebuild derived data when history changed. */
export async function syncAccount(client: SyncClient, userId: string): Promise<SyncResult> {
  const link = linkAccount(userId);
  if (link === 'mismatch') return { status: 'mismatch', pulled: 0, pushed: 0, rebuilt: false };

  const pull = await pullChanges(client, { remoteProfileWins: link === 'linked' });
  const push = await pushChanges(client, userId);
  if (pull.historyChanged) rebuildDerivedData();
  setState({ lastSyncedAt: new Date() });
  return { status: 'synced', pulled: pull.pulled, pushed: push.pushed, rebuilt: pull.historyChanged };
}
