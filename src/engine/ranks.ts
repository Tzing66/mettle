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

export interface LevelStep {
  /** A total XP inside the level this step animates (for its label and colour). */
  levelXp: number;
  /** Bar position (0–1) at the start and end of this step. */
  from: number;
  to: number;
}

/**
 * The bar animation for a level change: fill the old level, pass through any
 * full levels in between (at most `maxSteps` steps in total), then fill the
 * new level to where the user landed.
 */
export function levelSteps(change: Pick<RankChange, 'before' | 'after'>, maxSteps = 4, config: RanksConfig = ranksConfig): LevelStep[] {
  const { before, after } = change;
  if (before.label === after.label) return [{ levelXp: after.totalXp, from: before.levelProgress, to: after.levelProgress }];
  const steps: LevelStep[] = [{ levelXp: before.totalXp, from: before.levelProgress, to: 1 }];
  let xp = before.nextLevelXp;
  while (xp < after.levelStartXp && steps.length < maxSteps - 1) {
    steps.push({ levelXp: xp, from: 0, to: 1 });
    xp = rankFor(xp, config).nextLevelXp;
  }
  steps.push({ levelXp: after.totalXp, from: 0, to: after.levelProgress });
  return steps;
}

export interface LadderLevel {
  label: string;
  startXp: number;
  endXp: number;
  state: 'done' | 'current' | 'ahead';
  /** XP still needed to reach the start of this level (0 when reached). */
  xpAway: number;
}

export interface LadderRank {
  rank: RankLetter;
  minXp: number;
  levels: LadderLevel[];
  reached: boolean;
  xpAway: number;
}

/**
 * The whole progression ladder from E1 upward, with where `totalXp` sits.
 * S shows `sLevels` levels (it keeps going beyond them).
 */
export function rankLadder(totalXp: number, sLevels = 5, config: RanksConfig = ranksConfig): LadderRank[] {
  const xp = Math.max(0, totalXp);
  return config.ranks.map((r, i) => {
    const next = config.ranks[i + 1];
    const span = next ? (next.minXp - r.minXp) / config.levelsPerRank : config.sLevelSpanXp;
    const count = next ? config.levelsPerRank : sLevels;
    const levels: LadderLevel[] = Array.from({ length: count }, (_, l) => {
      const startXp = Math.round(r.minXp + l * span);
      const endXp = Math.round(r.minXp + (l + 1) * span);
      const state = xp >= endXp ? 'done' : xp >= startXp ? 'current' : 'ahead';
      return { label: `${r.rank}${l + 1}`, startXp, endXp, state, xpAway: Math.max(0, startXp - xp) };
    });
    return { rank: r.rank, minXp: r.minXp, levels, reached: xp >= r.minXp, xpAway: Math.max(0, r.minXp - xp) };
  });
}
