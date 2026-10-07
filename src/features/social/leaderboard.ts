import { rankFor, type RankLetter } from '@/engine';

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  role: 'owner' | 'member';
  week_xp: number;
  total_xp: number;
  is_me: boolean;
}

export type Period = 'week' | 'all';

export interface RankedEntry extends LeaderboardEntry {
  /** 1-based position; ties share a place ("1, 2, 2, 4"). */
  place: number;
  xp: number;
  rank: RankLetter;
  levelLabel: string;
}

/** Orders a group's members for a period. Ties share a place and are broken by name for a stable order. */
export function rankLeaderboard(entries: LeaderboardEntry[], period: Period): RankedEntry[] {
  const xpOf = (e: LeaderboardEntry) => Number(period === 'week' ? e.week_xp : e.total_xp);
  const sorted = [...entries].sort((a, b) => xpOf(b) - xpOf(a) || a.display_name.localeCompare(b.display_name));
  let place = 0;
  return sorted.map((e, i) => {
    if (i === 0 || xpOf(e) !== xpOf(sorted[i - 1])) place = i + 1;
    const r = rankFor(Number(e.total_xp));
    return { ...e, place, xp: xpOf(e), rank: r.rank, levelLabel: r.label };
  });
}
