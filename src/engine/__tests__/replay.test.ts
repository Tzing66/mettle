import { replayHistory } from '../replay';
import type { WorkoutInput } from '../types';
import { daysAgo, exercises, lift, NOW } from './fixtures';

const w = (id: string, endedAt: number, sets: WorkoutInput['sets']): WorkoutInput => ({ id, startedAt: endedAt - 3600_000, endedAt, sets });
const base = { profile: { sex: 'male' as const, birthYear: 1998, weeklyTargetDays: 3 }, exercises, bodyweightLogs: [{ weightKg: 80, loggedAt: daysAgo(30) }] };

const history = [
  w('a', daysAgo(9), [lift('bench', 60, 5, { completedAt: daysAgo(9) }), lift('bench', 60, 5, { completedAt: daysAgo(9) }), lift('bench', 60, 5, { completedAt: daysAgo(9) })]),
  w('b', daysAgo(8), [lift('bench', 62.5, 5, { completedAt: daysAgo(8) }), lift('squat', 80, 5, { completedAt: daysAgo(8) }), lift('squat', 80, 5, { completedAt: daysAgo(8) })]),
  w('c', daysAgo(7), [lift('bench', 65, 5, { completedAt: daysAgo(7) }), lift('bench', 65, 5, { completedAt: daysAgo(7) }), lift('bench', 65, 5, { completedAt: daysAgo(7) })]),
  w('d', NOW, [lift('bench', 85, 3, { completedAt: NOW }), lift('bench', 85, 3, { completedAt: NOW }), lift('bench', 85, 3, { completedAt: NOW })]),
];

describe('replayHistory', () => {
  it('is independent of input order', () => {
    const a = replayHistory({ ...base, workouts: history });
    const b = replayHistory({ ...base, workouts: [...history].reverse() });
    expect(b.events.map((e) => [e.reason, e.amount, e.meta?.workoutId])).toEqual(a.events.map((e) => [e.reason, e.amount, e.meta?.workoutId]));
  });

  it('tags every event with its workout and gives unique ids', () => {
    const { events } = replayHistory({ ...base, workouts: history });
    expect(events.every((e) => typeof e.meta?.workoutId === 'string')).toBe(true);
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });

  it('first sessions are firsts and baselines; later heavier sets are PRs', () => {
    const { events, records } = replayHistory({ ...base, workouts: history });
    expect(events.filter((e) => e.reason === 'first_exercise').map((e) => e.sourceId)).toEqual(['bench', 'squat']);
    expect(events.filter((e) => e.reason === 'personal_record').map((e) => e.meta?.workoutId)).toEqual(['b', 'c', 'd']);
    expect(records.find((r) => r.exerciseId === 'bench' && r.metric === 'e1rm')?.setId).toBe(history[3].sets[0].id);
  });

  it('awards the weekly goal when three days are reached', () => {
    const { events } = replayHistory({ ...base, workouts: history });
    expect(events.filter((e) => e.reason === 'weekly_goal')).toHaveLength(1);
  });

  it('marks a big jump as pending, and a later repeat confirms it', () => {
    // d: 85×3 → e1RM 93.5 vs 75.8 a week earlier (+23%) → pending.
    const one = replayHistory({ ...base, workouts: history });
    expect(one.events.find((e) => e.reason === 'personal_record' && e.meta?.workoutId === 'd')?.status).toBe('pending_review');
    const repeat = w('e', NOW + 3 * 86_400_000, [lift('bench', 85, 3, { completedAt: NOW + 3 * 86_400_000 })]);
    const two = replayHistory({ ...base, workouts: [...history, repeat] });
    expect(two.events.find((e) => e.reason === 'personal_record' && e.meta?.workoutId === 'd')?.status).toBe('granted');
  });

  it('skips workouts with no sets', () => {
    expect(replayHistory({ ...base, workouts: [w('empty', NOW, [])] }).events).toEqual([]);
  });
});
