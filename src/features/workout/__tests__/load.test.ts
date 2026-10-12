import { formatSet } from '@/features/format';

import { fromModeKg, loadStyleFor, modeFor, modesFor, toModeKg, weightLabel } from '../load';

const ex = (id: string, category = 'free_weight') => ({ id, category });

describe('how each exercise is loaded', () => {
  it('dumbbell pairs, single dumbbells, bars, machines and bodyweight', () => {
    expect(loadStyleFor(ex('db_shoulder_press')).style).toBe('pair');
    expect(loadStyleFor(ex('goblet_squat')).style).toBe('single');
    expect(loadStyleFor(ex('bench_press'))).toEqual({ style: 'bar', barKg: 20 });
    expect(loadStyleFor(ex('ez_bar_curl'))).toEqual({ style: 'bar', barKg: 10 });
    expect(loadStyleFor(ex('trap_bar_deadlift'))).toEqual({ style: 'bar', barKg: 25 });
    expect(loadStyleFor(ex('landmine_press')).style).toBe('plain');
    expect(loadStyleFor(ex('leg_press', 'machine')).style).toBe('plain');
    expect(loadStyleFor(ex('dip', 'bodyweight')).style).toBe('added');
    expect(loadStyleFor(ex('custom_x', 'bodyweight')).style).toBe('added');
    expect(loadStyleFor(ex('custom_y', 'machine')).style).toBe('plain');
  });
});

describe('typing it your way, stored the standard way', () => {
  it('two 10 kg dumbbells typed as 20 "both" are stored as 10 each', () => {
    expect(fromModeKg(20, 'both')).toBe(10);
    expect(toModeKg(10, 'both')).toBe(20);
  });

  it('plates per side add up with the bar', () => {
    expect(fromModeKg(30, 'side:20')).toBe(80); // 20 + 2 × 30
    expect(toModeKg(80, 'side:20')).toBe(30);
    expect(toModeKg(10, 'side:20')).toBe(0); // lighter than the bar: shown as no plates
    expect(fromModeKg(10, 'side:15')).toBe(35);
  });

  it('each and total are stored as typed', () => {
    expect(fromModeKg(12.5, 'each')).toBe(12.5);
    expect(fromModeKg(60, 'total')).toBe(60);
  });

  it('only pairs and bars can switch; a forgotten or stale choice falls back to the default', () => {
    expect(modesFor('pair', 20).map((m) => m.mode)).toEqual(['each', 'both']);
    expect(modesFor('bar', 20).map((m) => m.mode)).toEqual(['total', 'side:20', 'side:15']);
    expect(modesFor('bar', 10).map((m) => m.mode)).toEqual(['total', 'side:10']);
    expect(modesFor('plain', 20)).toEqual([]);
    expect(modeFor(ex('db_curl'), undefined)).toBe('each');
    expect(modeFor(ex('db_curl'), 'side:20')).toBe('each');
    expect(modeFor(ex('bench_press'), 'side:15')).toBe('side:15');
  });

  it('labels say what the number means', () => {
    expect(weightLabel('pair', 'each', 'kg')).toBe('kg each');
    expect(weightLabel('pair', 'both', 'kg')).toBe('kg both');
    expect(weightLabel('bar', 'total', 'kg')).toBe('kg total');
    expect(weightLabel('bar', 'side:20', 'lb')).toBe('lb/side');
    expect(weightLabel('added', 'total', 'kg')).toBe('+kg');
    expect(weightLabel('plain', 'total', 'kg')).toBe('kg');
  });

  it('history reads "10 kg each" for dumbbell pairs', () => {
    const s = { weightKg: 10, reps: 8, durationS: null, distanceM: null };
    expect(formatSet(s, 'weight_reps', 'kg', 'pair')).toBe('10 kg each × 8');
    expect(formatSet(s, 'weight_reps', 'kg', 'bar')).toBe('10 kg × 8');
  });
});
