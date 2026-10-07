import { findBenchmark } from '../benchmarks';
import {
  bodyweightNeedsConfirmation,
  confirmedPendingIds,
  exceedsEliteCeiling,
  isSuspiciousE1rmJump,
  rollingBodyweight,
} from '../plausibility';
import { daysAgo, NOW, record } from './fixtures';

describe('e1RM jump check (§6.5)', () => {
  it('flags >15% above a best from the last 30 days', () => {
    expect(isSuspiciousE1rmJump(116, NOW, record('bench', 'e1rm', 100, daysAgo(10)))).toBe(true);
  });

  it('allows exactly 15%', () => {
    expect(isSuspiciousE1rmJump(115, NOW, record('bench', 'e1rm', 100, daysAgo(10)))).toBe(false);
  });

  it('allows big jumps over a longer gap', () => {
    expect(isSuspiciousE1rmJump(130, NOW, record('bench', 'e1rm', 100, daysAgo(45)))).toBe(false);
  });

  it('nothing to compare on a first performance', () => {
    expect(isSuspiciousE1rmJump(300, NOW, undefined)).toBe(false);
  });
});

describe('elite ceiling', () => {
  const bench = findBenchmark('bench_press')!;

  it('flags values beyond elite × 1.2', () => {
    expect(exceedsEliteCeiling(bench, 2.41, 'male')).toBe(true);
    expect(exceedsEliteCeiling(bench, 2.4, 'male')).toBe(false);
  });

  it('uses the selected sex’s table', () => {
    expect(exceedsEliteCeiling(bench, 1.9, 'female')).toBe(true);
  });
});

describe('bodyweight', () => {
  const logs = [
    { weightKg: 82, loggedAt: daysAgo(30) },
    { weightKg: 80, loggedAt: daysAgo(10) },
    { weightKg: 79, loggedAt: daysAgo(3) },
  ];

  it('rolling average uses the last 14 days', () => {
    expect(rollingBodyweight(logs, NOW)).toBeCloseTo(79.5);
  });

  it('falls back to the latest older log, else null', () => {
    expect(rollingBodyweight([{ weightKg: 82, loggedAt: daysAgo(30) }], NOW)).toBe(82);
    expect(rollingBodyweight([], NOW)).toBeNull();
  });

  it('a one-off low weigh-in only nudges the average', () => {
    expect(rollingBodyweight([...logs, { weightKg: 70, loggedAt: NOW }], NOW)).toBeCloseTo(76.33, 1);
  });

  it('asks to confirm a >5% change within a week', () => {
    expect(bodyweightNeedsConfirmation(logs, 74.5, NOW)).toBe(true);
    expect(bodyweightNeedsConfirmation(logs, 76, NOW)).toBe(false);
  });
});

describe('auto-confirming pending events', () => {
  const pending = [
    { id: 'e1', createdAt: daysAgo(5), performance: { exerciseId: 'bench', metric: 'e1rm' as const, value: 120 } },
    { id: 'e2', createdAt: daysAgo(5), performance: { exerciseId: 'run', metric: 'best_pace' as const, value: 240 } },
  ];

  it('a later performance at or above the flagged value confirms it', () => {
    const perf = [{ exerciseId: 'bench', metric: 'e1rm' as const, value: 120, achievedAt: NOW }];
    expect(confirmedPendingIds(pending, perf)).toEqual(['e1']);
  });

  it('a weaker repeat does not', () => {
    const perf = [{ exerciseId: 'bench', metric: 'e1rm' as const, value: 118, achievedAt: NOW }];
    expect(confirmedPendingIds(pending, perf)).toEqual([]);
  });

  it('for pace, faster-or-equal confirms', () => {
    const perf = [{ exerciseId: 'run', metric: 'best_pace' as const, value: 238, achievedAt: NOW }];
    expect(confirmedPendingIds(pending, perf)).toEqual(['e2']);
  });

  it('the flagged performance cannot confirm itself', () => {
    const perf = [{ exerciseId: 'bench', metric: 'e1rm' as const, value: 120, achievedAt: daysAgo(5) }];
    expect(confirmedPendingIds(pending, perf)).toEqual([]);
  });
});
