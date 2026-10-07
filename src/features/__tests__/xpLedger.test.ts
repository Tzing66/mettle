import { groupLedger, type LedgerInput } from '../xpLedger';

const ev = (id: string, reason: LedgerInput['reason'], amount: number, workoutId: string | null, day: number, status = 'granted'): LedgerInput => ({
  id,
  reason,
  amount,
  status,
  createdAt: new Date(Date.UTC(2026, 9, day, 18)),
  meta: workoutId ? { workoutId } : null,
});

describe('groupLedger', () => {
  const events = [
    ev('1', 'workout_complete', 50, 'w1', 5),
    ...Array.from({ length: 20 }, (_, i) => ev(`f${i}`, 'first_exercise', 20, 'w1', 5)),
    ev('2', 'workout_complete', 50, 'w2', 7),
    ev('3', 'personal_record', 25, 'w2', 7, 'pending_review'),
    ev('4', 'weekly_goal', 100, null, 6),
  ];

  it('collapses a workout’s events into one entry, newest first', () => {
    const groups = groupLedger(events);
    expect(groups.map((g) => [g.workoutId, g.total])).toEqual([
      ['w2', 75],
      [null, 100],
      ['w1', 450],
    ]);
  });

  it('keeps the breakdown and pending amount per entry', () => {
    const w1 = groupLedger(events).find((g) => g.workoutId === 'w1')!;
    expect(w1.lines).toEqual([
      { label: 'Workout complete', amount: 50, count: 1, pending: 0 },
      { label: 'Firsts', amount: 400, count: 20, pending: 0 },
    ]);
    expect(groupLedger(events)[0].pending).toBe(25);
  });
});
