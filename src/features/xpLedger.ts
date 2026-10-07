// Groups the raw XP ledger into one entry per workout (or per day for events
// that aren't tied to a workout), newest first.
import type { XpReason } from '@/engine';

import { xpBreakdown, type BreakdownLine } from './xpBreakdown';

export interface LedgerInput {
  id: string;
  amount: number;
  reason: XpReason;
  status: string;
  createdAt: Date;
  meta: Record<string, unknown> | null;
}

export interface LedgerGroup {
  key: string;
  workoutId: string | null;
  at: Date;
  total: number;
  pending: number;
  lines: BreakdownLine[];
}

export function groupLedger(events: LedgerInput[], limit = 30): LedgerGroup[] {
  const groups = new Map<string, LedgerInput[]>();
  for (const e of events) {
    const workoutId = typeof e.meta?.workoutId === 'string' ? e.meta.workoutId : null;
    const key = workoutId ?? `day:${e.createdAt.toDateString()}`;
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  return [...groups]
    .map(([key, list]) => ({
      key,
      workoutId: key.startsWith('day:') ? null : key,
      at: new Date(Math.max(...list.map((e) => e.createdAt.getTime()))),
      total: list.reduce((s, e) => s + e.amount, 0),
      pending: list.filter((e) => e.status === 'pending_review').reduce((s, e) => s + e.amount, 0),
      lines: xpBreakdown(list),
    }))
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}
