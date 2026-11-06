/**
 * Showdown rules. Pure and deterministic: every function takes a state and
 * returns a new one plus a list of events for the presentation layer to play.
 */
import type {
  AbilityId,
  ArenaId,
  DefenseGrade,
  Difficulty,
  Effectiveness,
  MoveDef,
  PerfGrade,
  Side,
  StatChanges,
  StatKey,
} from './types';
import { toy } from './data/toys';
import { move } from './data/moves';
import { ARENAS, EFFECT_MULT, effectiveness } from './data/arenas';
import { clampStage, levelFactor, movesAt, perfGrade, perfMult, stageMult, statsAt } from './stats';
import { nextFloat, range, type RngHolder } from './rng';

export const DAMAGE_K = 0.42;
export const ARENA_MULT = 1.15;
export const NAUGHTY_MAX = 100;
export const NAUGHTY_DECAY = 5;
export const COAL_FRACTION = 0.2;
export const REGEN_FRACTION = 0.06;
export const DEFENSE_MULT: Readonly<Record<DefenseGrade, number>> = { perfect: 0.6, good: 0.8, none: 1 };
export const RACKET_SPEED = 1.2;
/** Contests have a clock: from this round on, the judges get restless and damage escalates. */
export const OVERTIME_ROUND = 7;
export const OVERTIME_STEP = 0.35;

export function overtimeMult(round: number): number {
  return round >= OVERTIME_ROUND ? 1 + OVERTIME_STEP * (round - OVERTIME_ROUND + 1) : 1;
}

export interface Battler {
  toyId: string;
  level: number;
  maxSpirit: number;
  spirit: number;
  stats: Record<StatKey, number>;
  stages: Record<StatKey, number>;
  moves: string[];
  tangled: boolean;
  /** Set after a Tangle wears off; prevents chain-tangling until the toy acts once. */
  tangleShield: boolean;
  spent: { unretired: boolean; cantCatchMe: boolean; surprise: boolean };
  lastMove: string | null;
  repeat: number;
}

export interface SideState {
  b: Battler;
  naughty: number;
}

export interface BattleState extends RngHolder {
  arena: ArenaId;
  sides: [SideState, SideState];
  round: number;
  order: Side[];
  turnIndex: number;
  turns: number;
  winner: Side | null;
}

export type BattleEvent =
  | { t: 'round'; round: number; first: Side; overtime: number }
  | { t: 'decay'; side: Side; value: number }
  | { t: 'skip'; side: Side }
  | { t: 'use'; side: Side; moveId: string }
  | { t: 'perf'; side: Side; score: number; grade: PerfGrade }
  | { t: 'dodge'; side: Side }
  | {
      t: 'hit';
      side: Side;
      amount: number;
      spirit: number;
      eff: Effectiveness;
      arena: boolean;
      defense: DefenseGrade;
      grade: PerfGrade;
    }
  | { t: 'stat'; side: Side; stat: StatKey; delta: number; stage: number; blocked?: boolean }
  | { t: 'fizzle'; side: Side }
  | { t: 'heal'; side: Side; amount: number; spirit: number }
  | { t: 'tangle'; side: Side; result: 'tangled' | 'resisted' | 'missed' | 'immune' }
  | { t: 'naughty'; side: Side; delta: number; value: number }
  | { t: 'coal'; side: Side; amount: number; healed: boolean; spirit: number }
  | { t: 'ability'; side: Side; ability: AbilityId }
  | { t: 'ko'; side: Side }
  | { t: 'win'; side: Side };

export interface BattlerSetup {
  toyId: string;
  level: number;
}

export interface BattleSetup {
  arena: ArenaId;
  a: BattlerSetup;
  b: BattlerSetup;
  seed: number;
}

export function makeBattler({ toyId, level }: BattlerSetup): Battler {
  const s = statsAt(toyId, level);
  return {
    toyId,
    level,
    maxSpirit: s.spirit,
    spirit: s.spirit,
    stats: { flair: s.flair, poise: s.poise, hustle: s.hustle },
    stages: { flair: 0, poise: 0, hustle: 0 },
    moves: movesAt(toyId, level),
    tangled: false,
    tangleShield: false,
    spent: { unretired: false, cantCatchMe: false, surprise: false },
    lastMove: null,
    repeat: 0,
  };
}

export function createBattle(setup: BattleSetup): BattleState {
  return {
    arena: setup.arena,
    sides: [
      { b: makeBattler(setup.a), naughty: 0 },
      { b: makeBattler(setup.b), naughty: 0 },
    ],
    round: 0,
    order: [],
    turnIndex: 0,
    turns: 0,
    winner: null,
    rng: setup.seed >>> 0,
  };
}

const other = (s: Side): Side => (s === 0 ? 1 : 0);
export const abilityOf = (b: Battler): AbilityId => toy(b.toyId).ability;
const clone = (s: BattleState): BattleState => structuredClone(s);

export function effectiveHustle(b: Battler): number {
  return b.stats.hustle * stageMult(b.stages.hustle);
}

// ── turn flow ─────────────────────────────────────────────

export interface TurnStart {
  state: BattleState;
  actor: Side;
  /** false when the turn was consumed (Tangled). */
  canAct: boolean;
  events: BattleEvent[];
}

export function beginTurn(prev: BattleState): TurnStart {
  if (prev.winner !== null) throw new Error('battle is over');
  const s = clone(prev);
  const events: BattleEvent[] = [];
  if (s.turnIndex >= s.order.length) {
    s.round++;
    const h0 = effectiveHustle(s.sides[0].b);
    const h1 = effectiveHustle(s.sides[1].b);
    const first: Side = h0 === h1 ? (nextFloat(s) < 0.5 ? 0 : 1) : h0 > h1 ? 0 : 1;
    s.order = [first, other(first)];
    s.turnIndex = 0;
    events.push({ t: 'round', round: s.round, first, overtime: overtimeMult(s.round) });
  }
  const actor = s.order[s.turnIndex] as Side;
  const side = s.sides[actor];
  if (side.naughty > 0) {
    side.naughty = Math.max(0, side.naughty - NAUGHTY_DECAY);
    events.push({ t: 'decay', side: actor, value: side.naughty });
  }
  if (side.b.tangled) {
    side.b.tangled = false;
    side.b.tangleShield = true;
    events.push({ t: 'skip', side: actor });
    s.turnIndex++;
    s.turns++;
    return { state: s, actor, canAct: false, events };
  }
  return { state: s, actor, canAct: true, events };
}

export interface MovePlan {
  move: MoveDef;
  /** Minigame speed multiplier (Racket). */
  speed: number;
  difficulty: Difficulty;
  /** Defender gets a Keep Cool prompt. */
  needsDefense: boolean;
  willDodge: boolean;
}

export function planMove(s: BattleState, actor: Side, moveId: string): MovePlan {
  const m = move(moveId);
  const foe = s.sides[other(actor)].b;
  const willDodge = m.kind === 'show' && abilityOf(foe) === 'cantCatchMe' && !foe.spent.cantCatchMe;
  return {
    move: m,
    speed: abilityOf(foe) === 'racket' ? RACKET_SPEED : 1,
    difficulty: m.difficulty,
    needsDefense: m.kind === 'show' && !willDodge,
    willDodge,
  };
}

// ── damage ────────────────────────────────────────────────

export interface DamageInput {
  state: BattleState;
  actor: Side;
  move: MoveDef;
  score: number;
  defense: DefenseGrade;
  /** Use 0.95 for expectation instead of a random roll. */
  roll?: number;
  surprise?: boolean;
  /** Optimized repeat count to assume (defaults to the battler's current). */
  repeat?: number;
}

export function computeDamage(inp: DamageInput): { amount: number; eff: Effectiveness; arena: boolean; defense: DefenseGrade } {
  const { state: s, actor, move: m } = inp;
  const a = s.sides[actor].b;
  const d = s.sides[other(actor)].b;
  const A = a.stats.flair * stageMult(a.stages.flair);
  const D = d.stats.poise * stageMult(d.stages.poise) * (1 - (m.pierce ?? 0));
  let eff = effectiveness(m.type, toy(d.toyId).type);
  if (eff === 'super' && abilityOf(d) === 'topBilling') eff = 'neutral';
  const arena = ARENAS[s.arena].boost === m.type;
  const defense: DefenseGrade = abilityOf(d) === 'steady' && inp.defense === 'none' ? 'good' : inp.defense;
  let mult = EFFECT_MULT[eff] * (arena ? ARENA_MULT : 1) * perfMult(inp.score, abilityOf(a) === 'perfectionist') * DEFENSE_MULT[defense];
  if (inp.surprise) mult *= 1.5;
  if (abilityOf(a) === 'optimized') mult *= 1 + 0.15 * Math.min(inp.repeat ?? a.repeat, 3);
  mult *= overtimeMult(s.round);
  const raw = (m.power ?? 0) * (A / D) * levelFactor(a.level) * DAMAGE_K * mult * (inp.roll ?? 0.925);
  return { amount: Math.max(1, Math.round(raw)), eff, arena, defense };
}

/** Applies damage honouring Unretired. Returns actual damage dealt. */
function damage(s: BattleState, side: Side, amount: number, events: BattleEvent[]): number {
  const b = s.sides[side].b;
  let next = b.spirit - amount;
  if (next <= 0 && abilityOf(b) === 'unretired' && !b.spent.unretired && b.spirit > 1) {
    b.spent.unretired = true;
    next = 1;
    events.push({ t: 'ability', side, ability: 'unretired' });
  }
  const dealt = b.spirit - Math.max(0, next);
  b.spirit = Math.max(0, next);
  return dealt;
}

function changeStats(s: BattleState, side: Side, changes: StatChanges | undefined, sloppy: boolean, events: BattleEvent[]): number {
  if (!changes) return 0;
  const b = s.sides[side].b;
  let applied = 0;
  for (const [k, raw] of Object.entries(changes) as [StatKey, number][]) {
    const delta = sloppy ? Math.trunc(raw / 2) : raw;
    if (delta === 0) continue;
    if (delta < 0 && abilityOf(b) === 'slippery') {
      events.push({ t: 'ability', side, ability: 'slippery' });
      events.push({ t: 'stat', side, stat: k, delta: 0, stage: b.stages[k], blocked: true });
      continue;
    }
    const before = b.stages[k];
    b.stages[k] = clampStage(before + delta);
    events.push({ t: 'stat', side, stat: k, delta: b.stages[k] - before, stage: b.stages[k] });
    applied++;
  }
  return applied;
}

function tryTangle(s: BattleState, target: Side, base: number, score: number, events: BattleEvent[]): void {
  const b = s.sides[target].b;
  if (abilityOf(b) === 'slippery') {
    events.push({ t: 'ability', side: target, ability: 'slippery' });
    events.push({ t: 'tangle', side: target, result: 'immune' });
    return;
  }
  if (b.tangled || b.tangleShield) {
    events.push({ t: 'tangle', side: target, result: 'resisted' });
    return;
  }
  const chance = Math.min(0.95, base * (0.6 + 0.6 * score));
  if (nextFloat(s) < chance) {
    b.tangled = true;
    events.push({ t: 'tangle', side: target, result: 'tangled' });
  } else {
    events.push({ t: 'tangle', side: target, result: 'missed' });
  }
}

// ── resolve ───────────────────────────────────────────────

export interface Resolution {
  state: BattleState;
  events: BattleEvent[];
}

export function resolveMove(prev: BattleState, actor: Side, moveId: string, score: number, defenseIn: DefenseGrade): Resolution {
  if (prev.winner !== null) throw new Error('battle is over');
  if (prev.order[prev.turnIndex] !== actor) throw new Error(`not side ${actor}'s turn`);
  const s = clone(prev);
  const events: BattleEvent[] = [];
  const foeSide = other(actor);
  const me = s.sides[actor];
  const a = me.b;
  const d = s.sides[foeSide].b;
  if (!a.moves.includes(moveId)) throw new Error(`${a.toyId} does not know ${moveId}`);
  const m = move(moveId);
  const sc = Math.max(0, Math.min(1, score));
  const grade = perfGrade(sc);

  a.repeat = a.lastMove === moveId ? a.repeat + 1 : 0;
  a.lastMove = moveId;

  events.push({ t: 'use', side: actor, moveId });
  events.push({ t: 'perf', side: actor, score: sc, grade });

  if (m.kind === 'show') {
    if (abilityOf(d) === 'cantCatchMe' && !d.spent.cantCatchMe) {
      d.spent.cantCatchMe = true;
      events.push({ t: 'ability', side: foeSide, ability: 'cantCatchMe' });
      events.push({ t: 'dodge', side: foeSide });
    } else {
      const surprise = abilityOf(a) === 'surprise' && !a.spent.surprise;
      if (surprise) {
        a.spent.surprise = true;
        events.push({ t: 'ability', side: actor, ability: 'surprise' });
      }
      if (abilityOf(a) === 'optimized' && a.repeat > 0) events.push({ t: 'ability', side: actor, ability: 'optimized' });
      const dmg = computeDamage({ state: s, actor, move: m, score: sc, defense: defenseIn, roll: range(s, 0.85, 1), surprise });
      if (dmg.defense !== defenseIn && abilityOf(d) === 'steady') events.push({ t: 'ability', side: foeSide, ability: 'steady' });
      const dealt = damage(s, foeSide, dmg.amount, events);
      events.push({ t: 'hit', side: foeSide, amount: dealt, spirit: d.spirit, eff: dmg.eff, arena: dmg.arena, defense: dmg.defense, grade });
      if (d.spirit > 0) {
        if (abilityOf(d) === 'shakeMeUp' && dealt > 0 && d.stages.flair < 3) {
          events.push({ t: 'ability', side: foeSide, ability: 'shakeMeUp' });
          changeStats(s, foeSide, { flair: 1 }, false, events);
        }
        changeStats(s, foeSide, m.foe, false, events);
        if (m.tangle) tryTangle(s, foeSide, m.tangle, sc, events);
      }
    }
  } else {
    const sloppy = grade === 'sloppy';
    let did = changeStats(s, actor, m.self, sloppy, events);
    did += changeStats(s, foeSide, m.foe, sloppy, events);
    if (m.heal) {
      const amt = Math.min(a.maxSpirit - a.spirit, Math.round(a.maxSpirit * m.heal * (0.7 + 0.45 * sc)));
      a.spirit += amt;
      events.push({ t: 'heal', side: actor, amount: amt, spirit: a.spirit });
      did++;
    }
    if (m.tangle) {
      tryTangle(s, foeSide, m.tangle, sc, events);
      did++;
    }
    if (did === 0) events.push({ t: 'fizzle', side: actor });
  }

  if (m.naughty) {
    const add = abilityOf(a) === 'noFilter' ? Math.round(m.naughty / 2) : m.naughty;
    if (abilityOf(a) === 'noFilter') events.push({ t: 'ability', side: actor, ability: 'noFilter' });
    me.naughty = Math.min(NAUGHTY_MAX, me.naughty + add);
    events.push({ t: 'naughty', side: actor, delta: add, value: me.naughty });
  }

  if (d.spirit <= 0) {
    events.push({ t: 'ko', side: foeSide }, { t: 'win', side: actor });
    s.winner = actor;
    s.turnIndex++;
    s.turns++;
    return { state: s, events };
  }

  // ── end of turn ──
  if (me.naughty >= NAUGHTY_MAX) {
    const amt = Math.round(a.maxSpirit * COAL_FRACTION);
    me.naughty = 0;
    if (abilityOf(a) === 'coalFired') {
      const healed = Math.min(amt, a.maxSpirit - a.spirit);
      a.spirit += healed;
      events.push({ t: 'ability', side: actor, ability: 'coalFired' });
      events.push({ t: 'coal', side: actor, amount: healed, healed: true, spirit: a.spirit });
    } else {
      const dealt = damage(s, actor, amt, events);
      events.push({ t: 'coal', side: actor, amount: dealt, healed: false, spirit: a.spirit });
    }
  }
  if (a.spirit > 0 && abilityOf(a) === 'bigSoftie' && a.spirit < a.maxSpirit) {
    const amt = Math.min(a.maxSpirit - a.spirit, Math.max(1, Math.round(a.maxSpirit * REGEN_FRACTION)));
    a.spirit += amt;
    events.push({ t: 'ability', side: actor, ability: 'bigSoftie' });
    events.push({ t: 'heal', side: actor, amount: amt, spirit: a.spirit });
  }
  a.tangleShield = false;
  if (a.spirit <= 0) {
    events.push({ t: 'ko', side: actor }, { t: 'win', side: foeSide });
    s.winner = foeSide;
  }
  s.turnIndex++;
  s.turns++;
  return { state: s, events };
}
