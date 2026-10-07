import { detectRecords, setBeatsRecords, setMetrics } from '../records';
import { exercises, lift, record, set } from './fixtures';

describe('setMetrics', () => {
  it('weight × reps → e1RM', () => {
    expect(setMetrics(lift('bench', 100, 5), exercises.bench)).toEqual([
      { metric: 'e1rm', value: expect.closeTo(116.667, 2) },
    ]);
  });

  it('no e1RM above 10 reps', () => {
    expect(setMetrics(lift('bench', 60, 15), exercises.bench)).toEqual([]);
  });

  it('warm-ups never count', () => {
    expect(setMetrics(lift('bench', 100, 5, { isWarmup: true }), exercises.bench)).toEqual([]);
  });

  it('reps-only → max reps; timed → max duration', () => {
    expect(setMetrics(set('push_up', { reps: 30 }), exercises.push_up)).toEqual([{ metric: 'max_reps', value: 30 }]);
    expect(setMetrics(set('plank', { durationS: 90 }), exercises.plank)).toEqual([{ metric: 'max_duration', value: 90 }]);
  });

  it('distance + time → max distance and pace (s/km) from 1 km up', () => {
    expect(setMetrics(set('run', { distanceM: 5000, durationS: 1500 }), exercises.run)).toEqual([
      { metric: 'max_distance', value: 5000 },
      { metric: 'best_pace', value: 300 },
    ]);
    expect(setMetrics(set('run', { distanceM: 400, durationS: 60 }), exercises.run)).toEqual([
      { metric: 'max_distance', value: 400 },
    ]);
  });
});

describe('detectRecords', () => {
  it('first-ever performance is a baseline, not a PR', () => {
    const out = detectRecords([lift('curl', 20, 8)], exercises, []);
    expect(out).toEqual([expect.objectContaining({ kind: 'baseline' })]);
  });

  it('beating the previous best is a PR', () => {
    const out = detectRecords([lift('bench', 100, 5)], exercises, [record('bench', 'e1rm', 110)]);
    expect(out).toEqual([expect.objectContaining({ kind: 'pr', previous: expect.objectContaining({ value: 110 }) })]);
  });

  it('matching the previous best is not a PR', () => {
    expect(detectRecords([lift('bench', 100, 1)], exercises, [record('bench', 'e1rm', 100)])).toEqual([]);
  });

  it('several improving sets in one workout make a single PR, the best one', () => {
    const sets = [lift('bench', 100, 3), lift('bench', 105, 3), lift('bench', 102.5, 3)];
    const out = detectRecords(sets, exercises, [record('bench', 'e1rm', 100)]);
    expect(out).toHaveLength(1);
    expect(out[0].record.setId).toBe(sets[1].id);
  });

  it('faster pace is better (lower)', () => {
    const out = detectRecords(
      [set('run', { distanceM: 5000, durationS: 1450 })],
      exercises,
      [record('run', 'best_pace', 300), record('run', 'max_distance', 10000)],
    );
    expect(out.map((o) => [o.kind, o.record.metric])).toEqual([['pr', 'best_pace']]);
  });
});

describe('setBeatsRecords (live PR pill)', () => {
  it('flags metrics the set beats', () => {
    expect(setBeatsRecords(lift('bench', 105, 5), exercises.bench, [record('bench', 'e1rm', 120)])).toEqual(['e1rm']);
    expect(setBeatsRecords(lift('bench', 95, 5), exercises.bench, [record('bench', 'e1rm', 120)])).toEqual([]);
  });

  it('no pill without history', () => {
    expect(setBeatsRecords(lift('bench', 105, 5), exercises.bench, [])).toEqual([]);
  });
});
