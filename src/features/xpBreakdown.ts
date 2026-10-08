// Groups XP events into the human-readable lines used by the workout summary,
// the workout detail screen and the XP ledger.
import type { XpReason } from '@/engine';

export const XP_LINES: { label: string; reasons: XpReason[] }[] = [
  { label: 'Workout complete', reasons: ['workout_complete'] },
  { label: 'Working sets', reasons: ['working_sets'] },
  { label: 'Cardio', reasons: ['cardio_minutes'] },
  { label: 'Personal records', reasons: ['personal_record'] },
  { label: 'Firsts', reasons: ['first_exercise', 'first_activity'] },
  { label: 'Benchmarks', reasons: ['benchmark_tier'] },
  { label: 'Placement', reasons: ['placement'] },
  { label: 'Streak bonus', reasons: ['streak_bonus'] },
  { label: 'Weekly goal', reasons: ['weekly_goal'] },
];

export interface BreakdownLine {
  label: string;
  amount: number;
  /** Number of events folded into this line (e.g. 12 new exercises). */
  count: number;
  pending: number;
}

/** Sums events per line, dropping empty lines, in tally order. */
export function xpBreakdown(events: { reason: XpReason; amount: number; status: string }[]): BreakdownLine[] {
  return XP_LINES.map((l) => {
    const mine = events.filter((e) => l.reasons.includes(e.reason));
    return {
      label: l.label,
      amount: mine.reduce((s, e) => s + e.amount, 0),
      count: mine.length,
      pending: mine.filter((e) => e.status === 'pending_review').reduce((s, e) => s + e.amount, 0),
    };
  }).filter((l) => l.amount > 0);
}
