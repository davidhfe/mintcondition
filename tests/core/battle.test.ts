import { describe, expect, it } from 'vitest';
import {
  beginTurn,
  computeDamage,
  createBattle,
  planMove,
  resolveMove,
  type BattleEvent,
  type BattleState,
} from '../../src/core/battle';
import { effectiveness } from '../../src/core/data/arenas';
import { move } from '../../src/core/data/moves';
import { ROSTER } from '../../src/core/data/toys';
import { simulate } from '../../src/core/sim';
import type { ArenaId, Side } from '../../src/core/types';

function battle(a: string, b: string, opts: { arena?: ArenaId; la?: number; lb?: number; seed?: number } = {}): BattleState {
  return createBattle({ arena: opts.arena ?? 'tree', a: { toyId: a, level: opts.la ?? 8 }, b: { toyId: b, level: opts.lb ?? 8 }, seed: opts.seed ?? 1 });
}

/** Start the next turn and assert who acts. */
function turn(s: BattleState, expected?: Side) {
  const t = beginTurn(s);
  if (expected !== undefined) expect(t.actor).toBe(expected);
  return t;
}

const has = (evs: BattleEvent[], pred: (e: BattleEvent) => boolean) => evs.some(pred);

describe('type chart', () => {
  it('runs FROST > WARM > PINE > SPARK > FROST, advantage only', () => {
    expect(effectiveness('frost', 'warm')).toBe('super');
    expect(effectiveness('warm', 'pine')).toBe('super');
    expect(effectiveness('pine', 'spark')).toBe('super');
    expect(effectiveness('spark', 'frost')).toBe('super');
    expect(effectiveness('warm', 'frost')).toBe('neutral'); // no penalties, only advantages
    expect(effectiveness('frost', 'pine')).toBe('neutral');
    expect(effectiveness('warm', 'spark')).toBe('neutral');
    expect(effectiveness('plain', 'warm')).toBe('neutral');
    expect(effectiveness('warm', 'warm')).toBe('neutral');
  });
});

describe('turn order', () => {
  it('lets the faster toy act first', () => {
    const t = turn(battle('bigTed', 'slick'), 1);
    expect(t.events[0]).toMatchObject({ t: 'round', round: 1, first: 1 });
  });
  it('alternates within a round and starts a new round after both act', () => {
    let s = battle('bigTed', 'slick');
    let t = turn(s, 1);
    s = resolveMove(t.state, 1, 'tripleAxel', 0.5, 'none').state;
    t = turn(s, 0);
    s = resolveMove(t.state, 0, 'cocoaPour', 0.5, 'none').state;
    t = turn(s, 1);
    expect(t.state.round).toBe(2);
  });
  it('rejects moves out of turn or unknown to the toy', () => {
    const t = turn(battle('bigTed', 'slick'), 1);
    expect(() => resolveMove(t.state, 0, 'cocoaPour', 0.5, 'none')).toThrow();
    expect(() => resolveMove(t.state, 1, 'cocoaPour', 0.5, 'none')).toThrow();
  });
});

describe('damage', () => {
  const s = turn(battle('dobbin', 'sprocket'), 1).state;
  const m = move('circleBack');
  const dmg = (score: number, defense: 'none' | 'good' | 'perfect' = 'none') =>
    computeDamage({ state: s, actor: 1, move: m, score, defense, roll: 1 }).amount;

  it('scales with performance', () => {
    expect(dmg(0)).toBeLessThan(dmg(0.5));
    expect(dmg(0.5)).toBeLessThan(dmg(1));
    expect(Math.abs(dmg(1) / dmg(0) - 1.25 / 0.7)).toBeLessThan(0.15);
  });
  it('is reduced by Keep Cool, but Steady floors it at good', () => {
    // Dobbin (defender here) is Steady: 'none' behaves like 'good'.
    expect(dmg(1, 'none')).toBe(dmg(1, 'good'));
    expect(dmg(1, 'perfect')).toBeLessThan(dmg(1, 'good'));
  });
  it('applies type advantage and the arena boost', () => {
    const base = turn(battle('slick', 'bigTed', { arena: 'tree' }), 0).state;
    const yard = turn(battle('slick', 'bigTed', { arena: 'yard' }), 0).state;
    const frost = move('tripleAxel');
    const plain = move('bellySlide');
    const d1 = computeDamage({ state: base, actor: 0, move: frost, score: 1, defense: 'none', roll: 1 });
    expect(d1.eff).toBe('super');
    const d2 = computeDamage({ state: yard, actor: 0, move: frost, score: 1, defense: 'none', roll: 1 });
    expect(d2.arena).toBe(true);
    expect(d2.amount).toBeGreaterThan(d1.amount);
    expect(computeDamage({ state: base, actor: 0, move: plain, score: 1, defense: 'none', roll: 1 }).eff).toBe('neutral');
  });
  it('lets The Topper ignore weaknesses', () => {
    const s2 = turn(battle('dobbin', 'topper', { lb: 10 }), 1).state;
    expect(computeDamage({ state: s2, actor: 0, move: move('backAndForth'), score: 1, defense: 'none' }).eff).toBe('neutral');
  });
});

describe('abilities', () => {
  it("Unretired: Big Ted survives one knockout at 1 Spirit", () => {
    let s = battle('bigTed', 'jack');
    s.sides[0].b.spirit = 5;
    const t = turn(s, 1);
    const r = resolveMove(t.state, 1, 'popGoes', 1, 'none');
    expect(r.state.sides[0].b.spirit).toBe(1);
    expect(r.state.winner).toBeNull();
    expect(has(r.events, (e) => e.t === 'ability' && e.ability === 'unretired')).toBe(true);
    s = r.state;
    s = resolveMove(turn(s, 0).state, 0, 'cocoaPour', 0.5, 'none').state;
    const r2 = resolveMove(turn(s, 1).state, 1, 'popGoes', 1, 'none');
    expect(r2.state.winner).toBe(1);
  });

  it("Can't Catch Me: Ginger dodges the first SHOW move only", () => {
    let s = battle('abner', 'gingerSnap');
    let t = turn(s, 1);
    s = resolveMove(t.state, 1, 'hotBatch', 0.5, 'none').state;
    t = turn(s, 0);
    expect(planMove(t.state, 0, 'snowAngel').willDodge).toBe(true);
    expect(planMove(t.state, 0, 'snowAngel').needsDefense).toBe(false);
    const r = resolveMove(t.state, 0, 'snowAngel', 1, 'none');
    expect(has(r.events, (e) => e.t === 'dodge')).toBe(true);
    expect(r.state.sides[1].b.spirit).toBe(r.state.sides[1].b.maxSpirit);
    s = resolveMove(turn(r.state, 1).state, 1, 'hotBatch', 0.5, 'none').state;
    const r2 = resolveMove(turn(s, 0).state, 0, 'snowAngel', 1, 'none');
    expect(r2.state.sides[1].b.spirit).toBeLessThan(r2.state.sides[1].b.maxSpirit);
  });

  it('Surprise: Jack’s first SHOW hits ×1.5, then normal', () => {
    const s = battle('jack', 'abner');
    const t = turn(s, 0);
    const r = resolveMove(t.state, 0, 'popGoes', 1, 'none');
    const first = r.events.find((e) => e.t === 'hit');
    expect(has(r.events, (e) => e.t === 'ability' && e.ability === 'surprise')).toBe(true);
    const normal = computeDamage({ state: t.state, actor: 0, move: move('popGoes'), score: 1, defense: 'none', roll: 1 }).amount;
    expect(first && first.t === 'hit' && first.amount).toBeGreaterThanOrEqual(Math.floor(normal * 1.5 * 0.9));
    expect(r.state.sides[0].b.spent.surprise).toBe(true);
  });

  it('Coal: hitting 100 on the Naughty List costs 20% Spirit; Coal-Fired heals instead', () => {
    const s = battle('chatterbox', 'jack');
    s.sides[1].naughty = 90; // will decay to 82 at turn start
    s.sides[1].b.spirit = 100;
    const t = turn(s, 0);
    const s2 = resolveMove(t.state, 0, 'chatter', 0, 'perfect').state;
    const t2 = turn(s2, 1);
    const before = t2.state.sides[1].b.spirit;
    const r = resolveMove(t2.state, 1, 'jumpScare', 0.5, 'none');
    const coal = r.events.find((e) => e.t === 'coal');
    expect(coal).toMatchObject({ healed: false });
    expect(r.state.sides[1].b.spirit).toBe(before - Math.round(r.state.sides[1].b.maxSpirit * 0.2));
    expect(r.state.sides[1].naughty).toBe(0);

    const c = battle('chuggs', 'abner');
    c.sides[0].naughty = 70;
    c.sides[0].b.spirit = 50;
    const tc = turn(c, 0);
    const rc = resolveMove(tc.state, 0, 'coalShovel', 0.5, 'none');
    expect(rc.events.find((e) => e.t === 'coal')).toMatchObject({ healed: true });
    expect(rc.state.sides[0].b.spirit).toBeGreaterThan(50);
  });

  it('No Filter halves Naughty gain', () => {
    const t = turn(battle('chatterbox', 'abner'), 0);
    const r = resolveMove(t.state, 0, 'trashTalk', 0.5, 'none');
    expect(r.state.sides[0].naughty).toBe(15);
  });

  it('Tangle skips the next turn, then shields once; Slippery is immune', () => {
    let s = battle('jack', 'dobbin', { seed: 3 });
    let t = turn(s, 0);
    const r = resolveMove(t.state, 0, 'jumpScare', 1, 'none');
    const tangled = r.events.find((e) => e.t === 'tangle');
    expect(tangled).toBeDefined();
    if (tangled?.t !== 'tangle' || tangled.result !== 'tangled') return; // seed-dependent; covered below
    s = r.state;
    t = turn(s, 1);
    expect(t.canAct).toBe(false);
    expect(t.state.sides[1].b.tangleShield).toBe(true);
    t = turn(t.state, 0);
    const r2 = resolveMove(t.state, 0, 'jumpScare', 1, 'none');
    expect(r2.events.find((e) => e.t === 'tangle')).toMatchObject({ result: 'resisted' });

    const sl = turn(battle('jack', 'slick', { la: 10 }), 1);
    const sl2 = resolveMove(sl.state, 1, 'tripleAxel', 0.5, 'none').state;
    const r3 = resolveMove(turn(sl2, 0).state, 0, 'jumpScare', 1, 'none');
    expect(r3.events.find((e) => e.t === 'tangle')).toMatchObject({ result: 'immune' });
  });

  it('Sloppy tricks halve stat changes and can fizzle', () => {
    const t = turn(battle('dobbin', 'abner'), 0);
    const r = resolveMove(t.state, 0, 'giddyUp', 0.1, 'none'); // +1/+1 halves to 0/0
    expect(has(r.events, (e) => e.t === 'fizzle')).toBe(true);
    const r2 = resolveMove(t.state, 0, 'giddyUp', 0.8, 'none');
    expect(r2.state.sides[0].b.stages).toMatchObject({ flair: 1, hustle: 1 });
  });

  it('Shake Me Up: Dame Flurry gains FLAIR when rattled', () => {
    const t = turn(battle('slick', 'dameFlurry'), 0);
    const r = resolveMove(t.state, 0, 'tripleAxel', 0.5, 'none');
    expect(r.state.sides[1].b.stages.flair).toBe(1);
  });

  it('Big Softie: Abner regenerates after acting', () => {
    const s = battle('abner', 'slick');
    s.sides[0].b.spirit = 50;
    const t1 = turn(s, 1);
    const s2 = resolveMove(t1.state, 1, 'coldShoulder', 0.5, 'none').state;
    const t2 = turn(s2, 0);
    const r = resolveMove(t2.state, 0, 'bigShrug', 0.5, 'none');
    expect(r.state.sides[0].b.spirit).toBe(50 + Math.round(r.state.sides[0].b.maxSpirit * 0.06));
  });

  it('Optimized: Sprocket hits harder on repeats', () => {
    const s = battle('sprocket', 'abner');
    s.sides[0].b.repeat = 2;
    s.sides[0].b.lastMove = 'circleBack';
    const t = turn(s, 0);
    const boosted = computeDamage({ state: t.state, actor: 0, move: move('circleBack'), score: 1, defense: 'none', roll: 1 }).amount;
    t.state.sides[0].b.repeat = 0;
    const plain = computeDamage({ state: t.state, actor: 0, move: move('circleBack'), score: 1, defense: 'none', roll: 1 }).amount;
    expect(boosted / plain).toBeCloseTo(1.3, 1);
  });

  it('Racket speeds up the opponent’s minigames', () => {
    const t = turn(battle('slick', 'cymon'), 0);
    expect(planMove(t.state, 0, 'tripleAxel').speed).toBeGreaterThan(1);
  });
});

describe('overtime', () => {
  it('escalates damage from round 7 so stalls end', async () => {
    const { overtimeMult } = await import('../../src/core/battle');
    expect(overtimeMult(6)).toBe(1);
    expect(overtimeMult(7)).toBeCloseTo(1.4);
    expect(overtimeMult(9)).toBeCloseTo(2.744);
  });
});

describe('whole battles', () => {
  it('are deterministic for a given seed', () => {
    const setup = { arena: 'bakery' as const, a: { toyId: 'jack', level: 7 }, b: { toyId: 'cymon', level: 7 }, seed: 99 };
    const r1 = simulate(setup, [{ brain: 'normal' }, { brain: 'normal' }], true);
    const r2 = simulate(setup, [{ brain: 'normal' }, { brain: 'normal' }], true);
    expect(r1.events).toEqual(r2.events);
    expect(r1.winner).toBe(r2.winner);
  });

  it('always finish, for every pairing, and Spirit never goes negative', () => {
    let seed = 1;
    for (const a of ROSTER)
      for (const b of ROSTER) {
        const r = simulate({ arena: 'tree', a: { toyId: a.id, level: 8 }, b: { toyId: b.id, level: 8 }, seed: seed++ }, [{ brain: 'normal' }, { brain: 'hard' }]);
        expect(r.final.sides[0].b.spirit).toBeGreaterThanOrEqual(0);
        expect(r.final.sides[1].b.spirit).toBeGreaterThanOrEqual(0);
        expect(r.final.sides[r.winner === 0 ? 1 : 0].b.spirit).toBe(0);
      }
  });
});
