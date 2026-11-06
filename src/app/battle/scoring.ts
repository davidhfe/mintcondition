/**
 * Minigame tuning + pure scoring (unit-tested in tests/core/scoring.test.ts).
 *
 * Calibrated with `npm run curve` so that an average player (≈70ms timing
 * error) scores about what the CPU's "normal" hands do (core/ai.ts SKILL):
 * ~0.70 on ★1 falling to ~0.55 on ★3. A first-timer (≈110ms) lands ~0.5,
 * a rhythm-game regular (≈25ms) ~0.95.
 */
import type { DefenseGrade } from '../../core/types';

/** Players press a little late on most screens (display + input latency). */
export const LATE_ALLOWANCE_MS = 20;

export const RHYTHM = {
  notes: [4, 6, 8],
  spacingMs: [430, 350, 290],
  travelMs: 1150,
  /** Per difficulty: ±ms for PERFECT / GOOD / OK. */
  windows: [
    { perfect: 35, good: 75, ok: 120 },
    { perfect: 31, good: 67, ok: 108 },
    { perfect: 28, good: 60, ok: 96 },
  ],
};
export const TIMING = { sweet: [0.2, 0.18, 0.16], perfect: [0.06, 0.055, 0.05], sweepMs: [800, 680, 560], falloff: 0.15 };
export const MASH = { durationMs: 2000, target: [12, 14, 16] };
export const KEEP_COOL = { perfectMs: 40, goodMs: 100 };

const win = (d: number) => RHYTHM.windows[Math.max(0, Math.min(2, d - 1))]!;

export function rhythmWindow(d: number): number {
  return win(d).ok + LATE_ALLOWANCE_MS;
}

export function rhythmNoteScore(dtMs: number, d = 1): number {
  const w = win(d);
  const a = Math.abs(dtMs - LATE_ALLOWANCE_MS);
  if (a <= w.perfect) return 1;
  if (a <= w.good) return 0.75;
  if (a <= w.ok) return 0.4;
  return 0;
}

export function timingScore(x: number, d: number): number {
  const half = Math.abs(x - 0.5);
  const p = TIMING.perfect[d - 1]! / 2;
  const s = TIMING.sweet[d - 1]! / 2;
  if (half <= p) return 1;
  if (half <= s) return 0.65 + 0.3 * (1 - (half - p) / (s - p));
  return Math.max(0, 0.6 * (1 - (half - s) / TIMING.falloff));
}

export function keepCoolGrade(dtMs: number): DefenseGrade | 'flinch' {
  const t = dtMs - LATE_ALLOWANCE_MS;
  if (t < -KEEP_COOL.goodMs) return 'flinch';
  const a = Math.abs(t);
  if (a <= KEEP_COOL.perfectMs) return 'perfect';
  if (a <= KEEP_COOL.goodMs) return 'good';
  return 'none';
}
