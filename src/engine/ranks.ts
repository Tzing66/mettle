import { ranksConfig, type RankLetter, type RanksConfig } from './config';
import type { XpEventDraft } from './types';

export interface RankProgress {
  rank: RankLetter;
  /** 1-based level within the rank. S keeps counting past 5. */
  level: number;
  /** e.g. "D3" */
  label: string;
  totalXp: number;
  levelStartXp: number;
  nextLevelXp: number;
  /** 0–1 progress through the current level. */
  levelProgress: number;
  nextRank: RankLetter | null;
  xpToNextRank: number | null;
}

export function rankFor(totalXp: number, config: RanksConfig = ranksConfig): RankProgress {
  const xp = Math.max(0, totalXp);
  const ranks = config.ranks;
  let i = 0;
  while (i + 1 < ranks.length && xp >= ranks[i + 1].minXp) i++;

  const current = ranks[i];
  const next = ranks[i + 1];
  const span = next
    ? (next.minXp - current.minXp) / config.levelsPerRank
    : config.sLevelSpanXp;

  const levelIndex = Math.floor((xp - current.minXp) / span);
  const level = next ? Math.min(levelIndex, config.levelsPerRank - 1) + 1 : levelIndex + 1;
  const levelStartXp = Math.round(current.minXp + (level - 1) * span);
  const nextLevelXp = Math.round(current.minXp + level * span);

  return {
    rank: current.rank,
    level,
    label: `${current.rank}${level}`,
    totalXp: xp,
    levelStartXp,
    nextLevelXp,
    levelProgress: (xp - levelStartXp) / (nextLevelXp - levelStartXp),
    nextRank: next?.rank ?? null,
    xpToNextRank: next ? next.minXp - xp : null,
  };
}

export interface RankChange {
  before: RankProgress;
  after: RankProgress;
  levelUp: boolean;
  rankUp: boolean;
}

export function rankChange(
  xpBefore: number,
  xpAfter: number,
  config: RanksConfig = ranksConfig,
): RankChange {
  const before = rankFor(xpBefore, config);
  const after = rankFor(xpAfter, config);
  const rankUp = before.rank !== after.rank;
  return { before, after, rankUp, levelUp: rankUp || after.level > before.level };
}

/**
 * Sum of the XP ledger. Personal totals include pending events (the user sees
 * them); leaderboards pass includePending: false.
 */
export function totalXp(
  events: Pick<XpEventDraft, 'amount' | 'status'>[],
  { includePending = true }: { includePending?: boolean } = {},
): number {
  return events.reduce(
    (sum, e) => (includePending || e.status === 'granted' ? sum + e.amount : sum),
    0,
  );
}
