/**
 * What score does a person with a given timing error actually get?
 * Monte-Carlo over the real scoring functions, so tuning the windows can be
 * checked against the CPU's skill model (core/ai.ts SKILL) instead of guessed.
 *
 *   npm run curve
 *
 * σ ≈ 25ms: rhythm-game regular · 45ms: good · 70ms: average · 110ms: first time
 */
import { keepCoolGrade, rhythmNoteScore, timingScore, MASH, RHYTHM, TIMING } from '../src/app/battle/scoring';
import { SKILL, expectedScore } from '../src/core/ai';
import type { Difficulty } from '../src/core/types';

const N = 20000;
function gauss(sd: number) {
  let u = 0;
  for (let i = 0; i < 6; i++) u += Math.random();
  return (u - 3) * sd * Math.SQRT2;
}
const SIGMAS = [25, 45, 70, 110];
const pct = (x: number) => x.toFixed(2);

console.log('\n## Expected minigame score by timing error σ\n');
console.log(`| Game | ${SIGMAS.map((s) => `σ=${s}ms`).join(' | ')} |\n|---|${SIGMAS.map(() => '---').join('|')}|`);
for (const d of [1, 2, 3] as Difficulty[]) {
  // rhythm: each note judged independently; people land ~25ms late on average (latency)
  const r = SIGMAS.map((sd) => {
    let s = 0;
    for (let i = 0; i < N; i++) s += rhythmNoteScore(gauss(sd) + 25, d);
    return s / N;
  });
  console.log(`| Rhythm ★${d} (${RHYTHM.notes[d - 1]} notes, ${RHYTHM.spacingMs[d - 1]}ms apart) | ${r.map(pct).join(' | ')} |`);
}
for (const d of [1, 2, 3] as Difficulty[]) {
  // timing: the needle crosses the bar in sweepMs; a time error maps to a position error
  const t = SIGMAS.map((sd) => {
    let s = 0;
    for (let i = 0; i < N; i++) s += timingScore(0.5 + (gauss(sd) + 15) / TIMING.sweepMs[d - 1]!, d);
    return s / N;
  });
  console.log(`| Timing ★${d} (sweep ${TIMING.sweepMs[d - 1]}ms) | ${t.map(pct).join(' | ')} |`);
}

console.log('\n## Mash: score by presses per second (2.0s window; Racket makes it 1.67s)\n');
const RATES = [5, 6.5, 8, 9.5];
console.log(`| Target | ${RATES.map((r) => `${r}/s`).join(' | ')} |\n|---|${RATES.map(() => '---').join('|')}|`);
for (const d of [1, 2, 3]) {
  const target = MASH.target[d - 1]!;
  console.log(`| ★${d} (${target}) | ${RATES.map((r) => pct(Math.min(1, Math.floor((r * MASH.durationMs) / 1000) / target))).join(' | ')} |`);
}

console.log('\n## Keep Cool: chance of PERFECT / STEADY by σ\n');
console.log(`| σ | perfect | steady | flinch/late |\n|---|---|---|---|`);
for (const sd of SIGMAS) {
  let p = 0, g = 0;
  for (let i = 0; i < N; i++) {
    const r = keepCoolGrade(gauss(sd) + 25);
    if (r === 'perfect') p++;
    else if (r === 'good') g++;
  }
  console.log(`| ${sd}ms | ${pct(p / N)} | ${pct(g / N)} | ${pct(1 - (p + g) / N)} |`);
}

console.log('\n## For comparison: the CPU skill model (expected score, ★1 / ★2 / ★3)\n');
for (const [k, s] of Object.entries(SKILL)) {
  console.log(`- ${k}: ${[1, 2, 3].map((d) => pct(expectedScore(s, d as Difficulty, 1))).join(' / ')} · Keep Cool perfect ${s.defPerfect}, steady ${s.defGood}`);
}
