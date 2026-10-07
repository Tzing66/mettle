import { rankChange, rankFor, totalXp } from '../ranks';

describe('rank thresholds (§6.1)', () => {
  it.each([
    [0, 'E1'],
    [1999, 'E5'],
    [2000, 'D1'],
    [8000, 'C1'],
    [20000, 'B1'],
    [45000, 'A1'],
    [99999, 'A5'],
    [100000, 'S1'],
  ])('%i XP → %s', (xp, label) => {
    expect(rankFor(xp).label).toBe(label);
  });

  it('splits each rank into 5 even levels', () => {
    // D spans 2,000 → 8,000, so each level is 1,200 XP.
    const r = rankFor(3200 + 600);
    expect(r.label).toBe('D2');
    expect(r.levelStartXp).toBe(3200);
    expect(r.nextLevelXp).toBe(4400);
    expect(r.levelProgress).toBeCloseTo(0.5);
    expect(r.nextRank).toBe('C');
    expect(r.xpToNextRank).toBe(4200);
  });

  it('keeps counting S levels past S5', () => {
    expect(rankFor(125000).label).toBe('S2');
    expect(rankFor(260000).label).toBe('S7');
    expect(rankFor(260000).nextRank).toBeNull();
    expect(rankFor(260000).xpToNextRank).toBeNull();
  });

  it('treats negative totals as zero', () => {
    expect(rankFor(-50).label).toBe('E1');
  });
});

describe('rankChange', () => {
  it('detects a level-up within a rank', () => {
    expect(rankChange(390, 410)).toMatchObject({ levelUp: true, rankUp: false });
  });

  it('detects a rank-up (which is also a level-up)', () => {
    expect(rankChange(1950, 2050)).toMatchObject({ levelUp: true, rankUp: true });
  });

  it('reports nothing when staying in a level', () => {
    expect(rankChange(10, 90)).toMatchObject({ levelUp: false, rankUp: false });
  });
});

describe('totalXp (ledger)', () => {
  const events = [
    { amount: 100, status: 'granted' as const },
    { amount: 250, status: 'pending_review' as const },
  ];

  it('includes pending XP for the user’s own total', () => {
    expect(totalXp(events)).toBe(350);
  });

  it('excludes pending XP for leaderboards', () => {
    expect(totalXp(events, { includePending: false })).toBe(100);
  });
});
