import { levelSteps, rankChange, rankFor, rankLadder, totalXp } from '../ranks';

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

describe('levelSteps (level-up animation)', () => {
  it('a single step when staying in the level', () => {
    expect(levelSteps(rankChange(100, 300))).toEqual([{ levelXp: 300, from: 0.25, to: 0.75 }]);
  });

  it('one level up: fill the old level, then the new one from zero', () => {
    const steps = levelSteps(rankChange(300, 500)); // E1 → E2 (400 XP levels)
    expect(steps.map((s) => [rankFor(s.levelXp).label, s.from, s.to])).toEqual([
      ['E1', 0.75, 1],
      ['E2', 0, 0.25],
    ]);
  });

  it('passes through full levels in between', () => {
    const steps = levelSteps(rankChange(100, 1300)); // E1 → E4
    expect(steps.map((s) => rankFor(s.levelXp).label)).toEqual(['E1', 'E2', 'E3', 'E4']);
  });

  it('caps very large jumps', () => {
    const steps = levelSteps(rankChange(0, 30000), 4); // E1 → B
    expect(steps).toHaveLength(4);
    expect(rankFor(steps[3].levelXp).label).toBe(rankFor(30000).label);
  });

  it('crosses rank boundaries (E5 → D1)', () => {
    const steps = levelSteps(rankChange(1900, 2100));
    expect(steps.map((s) => rankFor(s.levelXp).label)).toEqual(['E5', 'D1']);
  });
});

describe('rankLadder (progression screen)', () => {
  it('lists every rank with five levels and marks where you are', () => {
    const ladder = rankLadder(3800); // D2
    expect(ladder.map((r) => r.rank)).toEqual(['E', 'D', 'C', 'B', 'A', 'S']);
    expect(ladder[0].levels.every((l) => l.state === 'done')).toBe(true);
    expect(ladder[1].levels.map((l) => l.state)).toEqual(['done', 'current', 'ahead', 'ahead', 'ahead']);
    expect(ladder[1].levels[1]).toMatchObject({ label: 'D2', startXp: 3200, endXp: 4400 });
  });

  it('says how far each rank and level is', () => {
    const ladder = rankLadder(3800);
    expect(ladder.find((r) => r.rank === 'C')?.xpAway).toBe(4200);
    expect(ladder[1].levels[2].xpAway).toBe(600);
    expect(ladder[1].xpAway).toBe(0);
  });

  it('S keeps counting past S5 but shows five levels', () => {
    const s = rankLadder(0).find((r) => r.rank === 'S')!;
    expect(s.levels.map((l) => l.label)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5']);
    expect(s.levels[1].startXp).toBe(125000);
  });
});
