import { desc, eq, gte, inArray, sql } from 'drizzle-orm';

import type { LedgerEvent } from '@/engine/session';

import { db } from '../client';
import { benchmarkUnlocks, xpEvents } from '../schema';

export type XpEventRow = typeof xpEvents.$inferSelect;

export function listLedger(limit?: number): XpEventRow[] {
  const q = db.select().from(xpEvents).orderBy(desc(xpEvents.createdAt));
  return limit ? q.limit(limit).all() : q.all();
}

export function toLedgerEvent(row: XpEventRow): LedgerEvent {
  return { ...row, createdAt: row.createdAt.getTime(), meta: row.meta ?? undefined };
}

export function totalXpFromDb(): number {
  return db.select({ total: sql<number>`coalesce(sum(${xpEvents.amount}), 0)` }).from(xpEvents).get()?.total ?? 0;
}

export function listBenchmarkUnlocks() {
  return db.select().from(benchmarkUnlocks).all();
}

/** Total XP earned by each workout (events tagged with meta.workoutId). */
export function xpByWorkout(workoutIds: string[]): Map<string, number> {
  if (workoutIds.length === 0) return new Map();
  const workoutId = sql<string>`json_extract(${xpEvents.meta}, '$.workoutId')`;
  const rows = db
    .select({ workoutId, total: sql<number>`sum(${xpEvents.amount})` })
    .from(xpEvents)
    .where(inArray(workoutId, workoutIds))
    .groupBy(workoutId)
    .all();
  return new Map(rows.map((r) => [r.workoutId, r.total]));
}

export function weeklyGoalWeeks(): string[] {
  return db
    .select({ week: xpEvents.sourceId })
    .from(xpEvents)
    .where(eq(xpEvents.reason, 'weekly_goal'))
    .all()
    .map((r) => r.week);
}

/** XP totals per day (local date key → XP), for the history heatmap. */
export function xpByDay(since: Date): Map<string, number> {
  const day = sql<string>`date(${xpEvents.createdAt} / 1000, 'unixepoch', 'localtime')`;
  const rows = db
    .select({ day, total: sql<number>`sum(${xpEvents.amount})` })
    .from(xpEvents)
    .where(gte(xpEvents.createdAt, since))
    .groupBy(day)
    .all();
  return new Map(rows.map((r) => [r.day, r.total]));
}
