import { computeServerLedger, type CloudSet, type CloudWorkout } from '../recompute';

const profile = { sex_for_standards: 'male' as const, birth_year: 1995, weekly_target_days: 3, utc_offset_minutes: 0 };
const iso = (ms: number) => new Date(ms).toISOString();

function session(id: string, endedAt: number, exerciseId: string, kg: number, reps = 5, n = 3) {
  const workout: CloudWorkout = { id, started_at: iso(endedAt - 3600_000), ended_at: iso(endedAt) };
  const sets: CloudSet[] = Array.from({ length: n }, (_, i) => ({
    id: `${id}-s${i}`,
    workout_id: id,
    exercise_id: exerciseId,
    set_index: i,
    is_warmup: false,
    weight_kg: kg,
    reps,
    duration_s: null,
    distance_m: null,
    completed_at: iso(endedAt - (n - i) * 60_000),
  }));
  return { workout, sets };
}

function ledger(sessions: ReturnType<typeof session>[], offset = 0) {
  return computeServerLedger({
    profile: { ...profile, utc_offset_minutes: offset },
    workouts: sessions.map((s) => s.workout),
    sets: sessions.flatMap((s) => s.sets),
    bodyweight: [{ weight_kg: 80, logged_at: iso(Date.UTC(2026, 9, 1)) }],
    customExercises: [],
  });
}

describe('computeServerLedger', () => {
  it('scores synced sets with the app’s rules and catalogue', () => {
    const out = ledger([session('w1', Date.UTC(2026, 9, 5, 18), 'bench_press', 60)]);
    const reasons = Object.fromEntries(out.events.map((e) => [e.reason, e.amount]));
    // 60×5 bench at 80 kg = 0.875× → placement score 1.75 → 6,500 XP on the ladder (D3), topped up after 85 XP.
    expect(reasons).toEqual({ workout_complete: 50, working_sets: 15, first_exercise: 20, placement: 6415 });
    expect(out.events.some((e) => e.reason === 'benchmark_tier')).toBe(false);
    expect(out.ruleVersion).toBe('xp-rules.v2');
    expect(out.events.every((e) => e.workout_id === 'w1')).toBe(true);
  });

  it('ignores unfinished workouts, uncompleted sets and unknown exercises', () => {
    const s = session('w1', Date.UTC(2026, 9, 5, 18), 'bench_press', 60);
    const out = computeServerLedger({
      profile,
      workouts: [s.workout, { id: 'open', started_at: iso(Date.UTC(2026, 9, 6)), ended_at: null }],
      sets: [...s.sets, { ...s.sets[0], id: 'x', completed_at: null }, { ...s.sets[0], id: 'y', exercise_id: 'not_a_real_exercise' }],
      bodyweight: [],
      customExercises: [],
    });
    expect(out.events.find((e) => e.reason === 'working_sets')?.amount).toBe(15);
  });

  it('pending XP counts in the total but not in granted (leaderboard) XP', () => {
    const out = ledger([
      session('a', Date.UTC(2026, 9, 1, 18), 'bench_press', 60),
      session('b', Date.UTC(2026, 9, 3, 18), 'bench_press', 85),
    ]);
    expect(out.events.some((e) => e.status === 'pending_review')).toBe(true);
    expect(out.grantedXp).toBeLessThan(out.totalXp);
  });

  it('counts days in the user’s time zone', () => {
    // Two sessions at 23:30 and 00:30 local in India (UTC+5:30): different local days,
    // but the same UTC day. With the offset, the second one is a fresh day (no daily cap).
    const first = Date.UTC(2026, 9, 5, 18, 0); // 23:30 IST
    const second = Date.UTC(2026, 9, 5, 19, 0); // 00:30 IST next day
    const heavy = (id: string, end: number) => session(id, end, 'db_curl', 10, 10, 8);
    const ist = ledger([heavy('a', first), heavy('b', second)], 330);
    const utc = ledger([heavy('a', first), heavy('b', second)], 0);
    const bConsistency = (out: ReturnType<typeof ledger>) =>
      out.events.filter((e) => e.workout_id === 'b' && ['workout_complete', 'working_sets'].includes(e.reason)).reduce((s, e) => s + e.amount, 0);
    expect(bConsistency(ist)).toBe(146); // new day: 50 + 8 sets × 12 (matching your best)
    expect(bConsistency(utc)).toBe(130); // same UTC day: capped at 220 total after 90 earlier
  });

  it('reports times in real UTC, not shifted', () => {
    const end = Date.UTC(2026, 9, 5, 18);
    const out = ledger([session('w1', end, 'bench_press', 60)], 330);
    expect(out.events[0].created_at).toBe(iso(end));
  });
});
