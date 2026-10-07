import { dayKey, streakMultiplier, streakWeeks, weekKey, weeklyGoalEvent } from '../streaks';
import { daysAgo, NOW } from './fixtures';

describe('day and week keys', () => {
  it('uses local calendar days', () => {
    expect(dayKey(NOW)).toBe('2026-10-07');
  });

  it('weeks start on Monday', () => {
    expect(weekKey(NOW)).toBe('2026-10-05'); // Wednesday → Monday
    expect(weekKey(Date.UTC(2026, 9, 11, 23))).toBe('2026-10-05'); // Sunday
    expect(weekKey(Date.UTC(2026, 9, 12, 1))).toBe('2026-10-12'); // next Monday
  });
});

describe('streakWeeks (§6.2: weekly-goal streaks)', () => {
  it('counts consecutive goal-hit weeks including this one', () => {
    expect(streakWeeks(['2026-10-05', '2026-09-28', '2026-09-21'], NOW)).toBe(3);
  });

  it('an unfinished current week does not break the streak', () => {
    expect(streakWeeks(['2026-09-28', '2026-09-21'], NOW)).toBe(2);
  });

  it('a missed week breaks it', () => {
    expect(streakWeeks(['2026-10-05', '2026-09-21', '2026-09-14'], NOW)).toBe(1);
  });

  it('is zero with no history', () => {
    expect(streakWeeks([], NOW)).toBe(0);
  });
});

describe('streakMultiplier', () => {
  it('adds 5% per week', () => {
    expect(streakMultiplier(0)).toBe(0);
    expect(streakMultiplier(3)).toBeCloseTo(0.15);
  });

  it('caps at +25%', () => {
    expect(streakMultiplier(5)).toBeCloseTo(0.25);
    expect(streakMultiplier(40)).toBeCloseTo(0.25);
  });
});

describe('weeklyGoalEvent', () => {
  const base = { weekKey: '2026-10-05', targetDays: 3, alreadyAwarded: false, at: NOW };

  it('pays 100 XP when distinct training days reach the target', () => {
    const e = weeklyGoalEvent({ ...base, trainingDayKeys: ['2026-10-05', '2026-10-06', '2026-10-07'] });
    expect(e).toMatchObject({ amount: 100, reason: 'weekly_goal', sourceId: '2026-10-05', status: 'granted' });
  });

  it('counts two sessions on one day as one day', () => {
    expect(
      weeklyGoalEvent({ ...base, trainingDayKeys: ['2026-10-05', '2026-10-07', '2026-10-07'] }),
    ).toBeNull();
  });

  it('pays only once per week', () => {
    expect(
      weeklyGoalEvent({
        ...base,
        alreadyAwarded: true,
        trainingDayKeys: ['2026-10-05', '2026-10-06', '2026-10-07', dayKey(daysAgo(-1))],
      }),
    ).toBeNull();
  });
});
