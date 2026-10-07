import { xpBreakdown } from '../xpBreakdown';

describe('xpBreakdown', () => {
  it('folds events into tally lines with counts and pending amounts', () => {
    const lines = xpBreakdown([
      { reason: 'workout_complete', amount: 50, status: 'granted' },
      { reason: 'first_exercise', amount: 20, status: 'granted' },
      { reason: 'first_exercise', amount: 20, status: 'granted' },
      { reason: 'first_activity', amount: 100, status: 'granted' },
      { reason: 'personal_record', amount: 25, status: 'pending_review' },
    ]);
    expect(lines).toEqual([
      { label: 'Workout complete', amount: 50, count: 1, pending: 0 },
      { label: 'Personal records', amount: 25, count: 1, pending: 25 },
      { label: 'Firsts', amount: 140, count: 3, pending: 0 },
    ]);
  });
});
