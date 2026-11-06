import type { BaseStats, PerfGrade, StatKey } from './types';
import { toy } from './data/toys';

export const MAX_LEVEL = 10;
export const DELUXE_LEVEL = 6;
export const MOVE_LEVELS = [1, 1, 3, 6] as const;
export const STAGE_MIN = -3;
export const STAGE_MAX = 3;

export function levelFactor(level: number): number {
  return 0.6 + 0.08 * level;
}

export function isDeluxe(level: number): boolean {
  return level >= DELUXE_LEVEL;
}

export function statsAt(toyId: string, level: number): BaseStats {
  const t = toy(toyId);
  const f = levelFactor(level) * (isDeluxe(level) ? 1.1 : 1);
  return {
    spirit: Math.round(t.base.spirit * f),
    flair: Math.round(t.base.flair * f),
    poise: Math.round(t.base.poise * f),
    hustle: Math.round(t.base.hustle * f),
  };
}

export function movesAt(toyId: string, level: number): string[] {
  const t = toy(toyId);
  return t.moves.filter((_, i) => level >= (MOVE_LEVELS[i] ?? 99));
}

export function stageMult(stage: number): number {
  return stage >= 0 ? (3 + stage) / 3 : 3 / (3 - stage);
}

export function clampStage(s: number): number {
  return Math.max(STAGE_MIN, Math.min(STAGE_MAX, s));
}

export const STAT_LABEL: Readonly<Record<StatKey, string>> = {
  flair: 'FLAIR',
  poise: 'POISE',
  hustle: 'HUSTLE',
};

// ── performance ───────────────────────────────────────────

export function perfGrade(score: number): PerfGrade {
  if (score >= 0.9) return 'perfect';
  if (score >= 0.65) return 'great';
  if (score >= 0.35) return 'ok';
  return 'sloppy';
}

/** Minigame score (0–1) → power multiplier. */
export function perfMult(score: number, perfectionist = false): number {
  const s = Math.max(0, Math.min(1, score));
  if (perfectionist && s >= 0.9) return 1.45;
  return 0.7 + 0.55 * s;
}

// ── experience ────────────────────────────────────────────

export function xpToNext(level: number): number {
  return 20 + 15 * level;
}

export function xpReward(foeLevel: number, won: boolean): number {
  const full = 18 + 9 * foeLevel;
  return won ? full : Math.round(full * 0.4);
}

export interface LevelUpResult {
  level: number;
  xp: number;
  levelsGained: number;
  learned: string[];
  becameDeluxe: boolean;
}

export function addXp(toyId: string, level: number, xp: number, gained: number): LevelUpResult {
  let L = level;
  let X = xp + gained;
  const before = movesAt(toyId, level);
  while (L < MAX_LEVEL && X >= xpToNext(L)) {
    X -= xpToNext(L);
    L++;
  }
  if (L >= MAX_LEVEL) X = 0;
  const after = movesAt(toyId, L);
  return {
    level: L,
    xp: X,
    levelsGained: L - level,
    learned: after.filter((m) => !before.includes(m)),
    becameDeluxe: !isDeluxe(level) && isDeluxe(L),
  };
}
