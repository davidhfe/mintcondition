/**
 * CPU opponent: scores each move by expected value, then picks with a
 * temperature (easy = loose, hard = sharp). Also models CPU "hands": how well
 * the CPU performs minigames and Keep Cool.
 */
import type { DefenseGrade, Difficulty, Side, StatChanges, StatKey } from './types';
import { abilityOf, computeDamage, NAUGHTY_MAX, planMove, type BattleState } from './battle';
import { move } from './data/moves';
import { gauss, nextFloat, type RngHolder } from './rng';

export type CpuLevel = 'easy' | 'normal' | 'hard';

export interface Skill {
  /** Mean minigame score on a difficulty-1 game. */
  mean: number;
  sd: number;
  defPerfect: number;
  defGood: number;
}

export const SKILL: Readonly<Record<CpuLevel, Skill>> = {
  // Calibrated against people with `npm run curve`: normal ≈ an average player (~70ms timing error).
  easy: { mean: 0.45, sd: 0.2, defPerfect: 0.15, defGood: 0.3 },
  normal: { mean: 0.66, sd: 0.17, defPerfect: 0.35, defGood: 0.4 },
  hard: { mean: 0.82, sd: 0.12, defPerfect: 0.5, defGood: 0.35 },
};

export const DIFFICULTY_PENALTY = 0.07;
export const SPEED_PENALTY = 0.1;

export function expectedScore(skill: Skill, difficulty: Difficulty, speed: number): number {
  return Math.max(0, Math.min(1, skill.mean - DIFFICULTY_PENALTY * (difficulty - 1) - (speed > 1 ? SPEED_PENALTY : 0)));
}

export function rollScore(h: RngHolder, skill: Skill, difficulty: Difficulty, speed: number): number {
  return Math.max(0, Math.min(1, gauss(h, expectedScore(skill, difficulty, speed), skill.sd)));
}

export function rollDefense(h: RngHolder, skill: Skill): DefenseGrade {
  const r = nextFloat(h);
  if (r < skill.defPerfect) return 'perfect';
  if (r < skill.defPerfect + skill.defGood) return 'good';
  return 'none';
}

const STAT_WEIGHT: Readonly<Record<StatKey, number>> = { flair: 1, poise: 0.8, hustle: 0.45 };

function statValue(stages: Record<StatKey, number>, changes: StatChanges | undefined, sign: 1 | -1, healthFrac: number, slippery = false): number {
  if (!changes) return 0;
  let v = 0;
  for (const [k, d] of Object.entries(changes) as [StatKey, number][]) {
    if (sign === -1 && slippery) continue;
    const st = stages[k] * sign;
    const room = 3 - st;
    if (room <= 0) continue;
    const eff = Math.min(Math.abs(d), room);
    v += eff * (st < 2 ? 10 : 3) * STAT_WEIGHT[k];
  }
  return v * (0.35 + 0.65 * healthFrac);
}

/** Expected value of each move, in "percent of foe Spirit" units. Exposed for tests. */
export function scoreMoves(s: BattleState, actor: Side, skill: Skill): { moveId: string; value: number }[] {
  const me = s.sides[actor];
  const foe = s.sides[actor === 0 ? 1 : 0];
  const a = me.b;
  const d = foe.b;
  const hpFrac = a.spirit / a.maxSpirit;
  return a.moves.map((moveId) => {
    const m = move(moveId);
    const plan = planMove(s, actor, moveId);
    const es = expectedScore(skill, m.difficulty, plan.speed);
    let value = 0;
    if (m.kind === 'show') {
      if (plan.willDodge) {
        value = 6 - (m.power ?? 0) / 20; // feed the dodge your cheapest move
      } else {
        const repeat = a.lastMove === moveId ? a.repeat + 1 : 0;
        const dmg = computeDamage({ state: s, actor, move: m, score: es, defense: 'none', roll: 0.95, repeat }).amount * 0.85;
        value = (Math.min(dmg, d.spirit) / d.maxSpirit) * 100;
        if (dmg >= d.spirit) value += 40;
        value += statValue(d.stages, m.foe, -1, 1) * 0.5;
        if (m.tangle) value += m.tangle * 12;
      }
    } else {
      value += statValue(a.stages, m.self, 1, hpFrac);
      value += statValue(d.stages, m.foe, -1, hpFrac, abilityOf(d) === 'slippery');
      if (m.heal) {
        const missing = (a.maxSpirit - a.spirit) / a.maxSpirit;
        value += Math.min(m.heal, missing) * 100 * (hpFrac < 0.55 ? 1.1 : 0.4);
      }
      if (m.tangle) {
        const can = !d.tangled && !d.tangleShield && abilityOf(d) !== 'slippery';
        value += can ? m.tangle * (0.6 + 0.6 * es) * 26 : -5;
      }
    }
    if (m.naughty) {
      const add = abilityOf(a) === 'noFilter' ? m.naughty / 2 : m.naughty;
      const after = me.naughty + add;
      if (abilityOf(a) === 'coalFired') value += after >= NAUGHTY_MAX ? 12 * (1 - hpFrac) + 4 : 2;
      else if (after >= NAUGHTY_MAX) value -= 22;
      else value -= add * 0.06;
    }
    return { moveId, value };
  });
}

const TEMPERATURE: Readonly<Record<CpuLevel, number>> = { easy: 14, normal: 5, hard: 1.5 };

export function chooseMove(s: BattleState, actor: Side, level: CpuLevel, h: RngHolder): string {
  const scored = scoreMoves(s, actor, SKILL[level]);
  if (level === 'easy' && nextFloat(h) < 0.25) return scored[Math.floor(nextFloat(h) * scored.length)]!.moveId;
  const T = TEMPERATURE[level];
  const max = Math.max(...scored.map((x) => x.value));
  const w = scored.map((x) => Math.exp((x.value - max) / T));
  const total = w.reduce((p, c) => p + c, 0);
  let r = nextFloat(h) * total;
  for (let i = 0; i < scored.length; i++) {
    r -= w[i]!;
    if (r <= 0) return scored[i]!.moveId;
  }
  return scored[scored.length - 1]!.moveId;
}
