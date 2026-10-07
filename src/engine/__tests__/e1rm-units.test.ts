import { xpRules } from '../config';
import { brzycki, epley, estimateOneRepMax } from '../e1rm';
import { displayWeight, formatDuration, kgToLb, lbToKg, toStoredKg } from '../units';

describe('e1RM (§6.4)', () => {
  it('uses Epley: w × (1 + reps/30)', () => {
    expect(epley(100, 5)).toBeCloseTo(116.667, 2);
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.333, 2);
  });

  it('a single is the weight itself', () => {
    expect(estimateOneRepMax(140, 1)).toBe(140);
  });

  it('ignores sets above 10 reps', () => {
    expect(estimateOneRepMax(60, 11)).toBeNull();
  });

  it('ignores sets with no weight or reps', () => {
    expect(estimateOneRepMax(0, 5)).toBeNull();
    expect(estimateOneRepMax(undefined, 5)).toBeNull();
    expect(estimateOneRepMax(100, 0)).toBeNull();
  });

  it('can switch to Brzycki via config', () => {
    const rules = { ...xpRules, e1rm: { formula: 'brzycki' as const, maxReps: 10 } };
    expect(estimateOneRepMax(100, 5, rules)).toBeCloseTo(brzycki(100, 5));
    expect(brzycki(100, 5)).toBeCloseTo(112.5, 2);
  });
});

describe('units', () => {
  it('round-trips kg ↔ lb', () => {
    expect(kgToLb(100)).toBeCloseTo(220.46, 1);
    expect(lbToKg(kgToLb(72.5))).toBeCloseTo(72.5, 6);
    expect(toStoredKg(225, 'lb')).toBeCloseTo(102.06, 1);
    expect(toStoredKg(100, 'kg')).toBe(100);
  });

  it('rounds display weight to 0.1', () => {
    expect(displayWeight(100, 'lb')).toBe(220.5);
    expect(displayWeight(62.5, 'kg')).toBe(62.5);
  });

  it('formats durations', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
});
