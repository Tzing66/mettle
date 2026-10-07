// Weekly goals and streaks. Weeks start on Monday in the device's local time.
// Rest days never break a streak; only missing a weekly goal does.

import { xpRules, type XpRules } from './config';
import type { XpEventDraft } from './types';

/** Local calendar day, e.g. "2026-10-07". */
export function dayKey(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local Monday of the week containing `at`, e.g. "2026-10-05". Used as the week id. */
export function weekKey(at: number): string {
  return dayKey(weekStart(at));
}

export function weekStart(at: number): number {
  const d = new Date(at);
  const daysSinceMonday = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysSinceMonday).getTime();
}

function previousWeekStart(start: number): number {
  const d = new Date(start);
  // Construct via calendar fields (not -7*DAY_MS) so DST changes don't shift the day.
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7).getTime();
}

/**
 * Consecutive goal-hit weeks ending now. An in-progress week that hasn't hit
 * its goal yet doesn't break the streak; counting starts from last week.
 */
export function streakWeeks(hitWeekKeys: Iterable<string>, now: number): number {
  const hits = new Set(hitWeekKeys);
  let start = weekStart(now);
  if (!hits.has(dayKey(start))) start = previousWeekStart(start);
  let count = 0;
  while (hits.has(dayKey(start))) {
    count++;
    start = previousWeekStart(start);
  }
  return count;
}

export function streakMultiplier(weeks: number, rules: XpRules = xpRules): number {
  const { streakBonusPerWeek, streakBonusMax } = rules.consistency;
  return Math.min(streakBonusMax, Math.max(0, weeks) * streakBonusPerWeek);
}

/**
 * Returns the weekly-goal event if this week has just reached its target and
 * hasn't been paid yet. `trainingDayKeys` are the distinct local days this week
 * with a qualifying workout (including the one just finished).
 */
export function weeklyGoalEvent(
  args: {
    weekKey: string;
    trainingDayKeys: Iterable<string>;
    targetDays: number;
    alreadyAwarded: boolean;
    at: number;
  },
  rules: XpRules = xpRules,
): XpEventDraft | null {
  if (args.alreadyAwarded) return null;
  if (new Set(args.trainingDayKeys).size < args.targetDays) return null;
  return {
    amount: rules.consistency.weeklyGoal,
    reason: 'weekly_goal',
    sourceType: 'week',
    sourceId: args.weekKey,
    ruleVersion: rules.version,
    status: 'granted',
    createdAt: args.at,
    meta: { targetDays: args.targetDays },
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
