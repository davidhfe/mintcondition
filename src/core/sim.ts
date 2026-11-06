/** Headless full-battle simulation. Used by tests and `npm run balance`. */
import type { Side } from './types';
import { beginTurn, createBattle, planMove, resolveMove, type BattleEvent, type BattleSetup, type BattleState } from './battle';
import { chooseMove, rollDefense, rollScore, SKILL, type CpuLevel, type Skill } from './ai';

export interface SimSide {
  /** Decision policy. */
  brain: CpuLevel;
  /** Hands (minigame skill). Defaults to the brain's skill. */
  hands?: Skill;
}

export interface SimResult {
  winner: Side;
  turns: number;
  rounds: number;
  final: BattleState;
  events: BattleEvent[];
}

export const TURN_LIMIT = 200;

export function simulate(setup: BattleSetup, sides: [SimSide, SimSide], keepEvents = false): SimResult {
  let s = createBattle(setup);
  // A separate RNG for the "players" so policy noise doesn't perturb battle rolls.
  const hands = { rng: (setup.seed ^ 0x9e3779b9) >>> 0 };
  const events: BattleEvent[] = [];
  while (s.winner === null) {
    if (s.turns > TURN_LIMIT) throw new Error(`battle exceeded ${TURN_LIMIT} turns: ${setup.a.toyId} vs ${setup.b.toyId}`);
    const t = beginTurn(s);
    s = t.state;
    if (keepEvents) events.push(...t.events);
    if (!t.canAct) continue;
    const me = sides[t.actor];
    const foe = sides[t.actor === 0 ? 1 : 0];
    const moveId = chooseMove(s, t.actor, me.brain, hands);
    const plan = planMove(s, t.actor, moveId);
    const score = rollScore(hands, me.hands ?? SKILL[me.brain], plan.difficulty, plan.speed);
    const def = plan.needsDefense ? rollDefense(hands, foe.hands ?? SKILL[foe.brain]) : 'none';
    const r = resolveMove(s, t.actor, moveId, score, def);
    s = r.state;
    if (keepEvents) events.push(...r.events);
  }
  return { winner: s.winner, turns: s.turns, rounds: s.round, final: s, events };
}
