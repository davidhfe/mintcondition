/** Minigame tuning + pure scoring (unit-tested in tests/core/scoring.test.ts). */
import type { DefenseGrade } from '../../core/types';

export const RHYTHM = {
  notes: [4, 6, 8],
  spacingMs: [430, 350, 290],
  travelMs: 1150,
  windows: { perfect: 55, good: 120, ok: 180 },
};
export const TIMING = { sweet: [0.28, 0.21, 0.16], perfect: [0.09, 0.07, 0.055], sweepMs: [950, 790, 650] };
export const MASH = { durationMs: 2000, target: [10, 13, 16] };
export const KEEP_COOL = { perfectMs: 75, goodMs: 160 };

/** Pure scoring helpers (unit-tested). */
export function rhythmNoteScore(dtMs: number): number {
  const a = Math.abs(dtMs);
  if (a <= RHYTHM.windows.perfect) return 1;
  if (a <= RHYTHM.windows.good) return 0.75;
  if (a <= RHYTHM.windows.ok) return 0.4;
  return 0;
}
export function timingScore(x: number, d: number): number {
  const half = Math.abs(x - 0.5);
  const p = TIMING.perfect[d - 1]! / 2;
  const s = TIMING.sweet[d - 1]! / 2;
  if (half <= p) return 1;
  if (half <= s) return 0.65 + 0.3 * (1 - (half - p) / (s - p));
  return Math.max(0, 0.6 * (1 - (half - s) / (0.5 - s)));
}
export function keepCoolGrade(dtMs: number): DefenseGrade | 'flinch' {
  if (dtMs < -KEEP_COOL.goodMs) return 'flinch';
  const a = Math.abs(dtMs);
  if (a <= KEEP_COOL.perfectMs) return 'perfect';
  if (a <= KEEP_COOL.goodMs) return 'good';
  return 'none';
}

