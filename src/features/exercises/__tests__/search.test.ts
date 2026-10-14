import catalogue from '@config/exercises.json';

import { searchExercises } from '../search';

const all = (catalogue.exercises as { id: string; name: string; equipment: string | null; primaryMuscles: string[] }[]).map((e) => ({
  ...e,
  equipment: e.equipment ?? null,
}));
const top = (q: string, n = 3) => searchExercises(all, q).slice(0, n).map((e) => e.id);

describe('exercise search', () => {
  it('finds back squat as "barbell squat" and "squat"', () => {
    expect(top('barbell squat', 1)).toEqual(['back_squat']);
    expect(searchExercises(all, 'barbell squat').map((e) => e.id)).toEqual(expect.arrayContaining(['front_squat', 'box_squat']));
    expect(top('squat', 1)).toEqual(['back_squat']);
  });

  it('understands gym shorthand and other names', () => {
    expect(top('ohp', 1)).toEqual(['overhead_press']);
    expect(top('rdl', 1)).toEqual(['romanian_deadlift']);
    expect(searchExercises(all, 'db press').every((e) => /dumbbell|db/i.test(e.name) || e.equipment === 'dumbbell')).toBe(true);
    expect(top('skull crusher', 1)).toEqual(['skullcrusher']);
    expect(top('butterfly', 1)).toEqual(['pec_deck']);
  });

  it('ignores word order, hyphens and plurals', () => {
    expect(top('pushups', 1)).toEqual(['push_up']);
    expect(top('push up', 1)).toEqual(['push_up']);
    expect(top('press bench', 1)).toEqual(['bench_press']);
  });

  it('still finds by muscle', () => {
    expect(searchExercises(all, 'hamstrings').length).toBeGreaterThan(5);
  });

  it('exact names come first', () => {
    expect(top('bench press', 1)).toEqual(['bench_press']);
    expect(top('deadlift', 1)).toEqual(['deadlift']);
  });

  it('nothing for nonsense', () => {
    expect(searchExercises(all, 'qwertyuiop')).toEqual([]);
  });
});
