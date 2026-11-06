import { describe, expect, it } from 'vitest';
import { keepCoolGrade, rhythmNoteScore, rhythmWindow, timingScore, LATE_ALLOWANCE_MS, RHYTHM, TIMING, KEEP_COOL } from '../../src/app/battle/scoring';

const L = LATE_ALLOWANCE_MS;

describe('rhythm judging', () => {
  it('centres on the late allowance and steps down by window', () => {
    const w = RHYTHM.windows[0]!;
    expect(rhythmNoteScore(L)).toBe(1);
    expect(rhythmNoteScore(L - w.perfect)).toBe(1);
    expect(rhythmNoteScore(L + w.perfect + 1)).toBe(0.75);
    expect(rhythmNoteScore(L - w.good - 1)).toBe(0.4);
    expect(rhythmNoteScore(L + w.ok + 1)).toBe(0);
  });
  it('gets stricter with difficulty', () => {
    const dt = L + RHYTHM.windows[2]!.perfect + 2;
    expect(rhythmNoteScore(dt, 1)).toBe(1);
    expect(rhythmNoteScore(dt, 3)).toBe(0.75);
    expect(rhythmWindow(3)).toBeLessThan(rhythmWindow(1));
  });
});

describe('timing judging', () => {
  it('rewards the centre, falls to 0 outside the falloff, and narrows with difficulty', () => {
    for (const d of [1, 2, 3]) {
      expect(timingScore(0.5, d)).toBe(1);
      expect(timingScore(0, d)).toBe(0);
      expect(timingScore(1, d)).toBe(0);
      expect(timingScore(0.5 + TIMING.sweet[d - 1]! / 2 - 0.001, d)).toBeGreaterThanOrEqual(0.65);
      expect(timingScore(0.5 + TIMING.sweet[d - 1]! / 2 + TIMING.falloff + 0.001, d)).toBe(0);
    }
    const x = 0.5 + TIMING.sweet[2]! / 2 + 0.01;
    expect(timingScore(x, 3)).toBeLessThan(timingScore(x, 1));
  });
  it('is monotonic away from the centre', () => {
    let prev = 2;
    for (let x = 0.5; x <= 1.0001; x += 0.01) {
      const s = timingScore(x, 2);
      expect(s).toBeLessThanOrEqual(prev + 1e-9);
      prev = s;
    }
  });
});

describe('keep cool judging', () => {
  it('perfect, good, flinch when early, none when late', () => {
    expect(keepCoolGrade(L)).toBe('perfect');
    expect(keepCoolGrade(L + KEEP_COOL.perfectMs + 5)).toBe('good');
    expect(keepCoolGrade(L - KEEP_COOL.goodMs - 5)).toBe('flinch');
    expect(keepCoolGrade(L + KEEP_COOL.goodMs + 5)).toBe('none');
  });
});
