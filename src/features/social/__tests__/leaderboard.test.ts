import { rankLeaderboard, type LeaderboardEntry } from '../leaderboard';

const e = (name: string, week: number, total: number, me = false): LeaderboardEntry => ({
  user_id: name,
  display_name: name,
  role: 'member',
  week_xp: week,
  total_xp: total,
  is_me: me,
});

describe('rankLeaderboard', () => {
  const members = [e('Cy', 50, 9000), e('Asha', 120, 2500, true), e('Ben', 120, 300), e('Dev', 0, 0)];

  it('orders by the period’s XP, ties share a place', () => {
    const week = rankLeaderboard(members, 'week');
    expect(week.map((r) => [r.display_name, r.place, r.xp])).toEqual([
      ['Asha', 1, 120],
      ['Ben', 1, 120],
      ['Cy', 3, 50],
      ['Dev', 4, 0],
    ]);
  });

  it('all-time uses total XP', () => {
    expect(rankLeaderboard(members, 'all').map((r) => r.display_name)).toEqual(['Cy', 'Asha', 'Ben', 'Dev']);
  });

  it('shows each member’s rank and level from all-time XP', () => {
    const cy = rankLeaderboard(members, 'week').find((r) => r.display_name === 'Cy')!;
    expect([cy.rank, cy.levelLabel]).toEqual(['C', 'C1']);
  });

  it('handles bigint-as-string values from Postgres', () => {
    const ranked = rankLeaderboard([{ ...e('X', 0, 0), week_xp: '15' as unknown as number, total_xp: '2100' as unknown as number }], 'week');
    expect([ranked[0].xp, ranked[0].rank]).toEqual([15, 'D']);
  });
});
