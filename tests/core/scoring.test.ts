import { describe, expect, it } from 'vitest';
import { keepCoolGrade, rhythmNoteScore, timingScore, RHYTHM, TIMING, KEEP_COOL } from '../../src/app/battle/scoring';

describe('rhythm judging', () => {
  it('is symmetric and steps down by window', () => {
    expect(rhythmNoteScore(0)).toBe(1);
    expect(rhythmNoteScore(-RHYTHM.windows.perfect)).toBe(1);
    expect(rhythmNoteScore(RHYTHM.windows.perfect + 1)).toBe(0.75);
    expect(rhythmNoteScore(-(RHYTHM.windows.good + 1))).toBe(0.4);
    expect(rhythmNoteScore(RHYTHM.windows.ok + 1)).toBe(0);
  });
});

describe('timing judging', () => {
  it('rewards the centre, falls off to 0 at the edges, and narrows with difficulty', () => {
    for (const d of [1, 2, 3]) {
      expect(timingScore(0.5, d)).toBe(1);
      expect(timingScore(0, d)).toBe(0);
      expect(timingScore(1, d)).toBe(0);
      const inSweet = 0.5 + TIMING.sweet[d - 1]! / 2 - 0.001;
      expect(timingScore(inSweet, d)).toBeGreaterThanOrEqual(0.65);
    }
    const x = 0.5 + TIMING.sweet[2]! / 2 + 0.01; // just outside hard sweet zone
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
  it('perfect, good, flinch on early, none on late', () => {
    expect(keepCoolGrade(0)).toBe('perfect');
    expect(keepCoolGrade(KEEP_COOL.perfectMs + 5)).toBe('good');
    expect(keepCoolGrade(-(KEEP_COOL.goodMs + 5))).toBe('flinch');
    expect(keepCoolGrade(KEEP_COOL.goodMs + 5)).toBe('none');
  });
});
