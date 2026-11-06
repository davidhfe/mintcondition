import { describe, expect, it } from 'vitest';
import { MOVE_LIST, MOVES } from '../../src/core/data/moves';
import { ABILITIES, TOY_LIST } from '../../src/core/data/toys';
import { ARENA_LIST } from '../../src/core/data/arenas';
import { ZONES, STARTERS } from '../../src/core/campaign';

const words = (s: string) => s.trim().split(/\s+/).length;

describe('data integrity', () => {
  it('every toy knows four real moves and has an ability', () => {
    for (const t of TOY_LIST) {
      expect(t.moves).toHaveLength(4);
      for (const m of t.moves) expect(MOVES[m], `${t.id}.${m}`).toBeDefined();
      expect(ABILITIES[t.ability]).toBeDefined();
    }
  });

  it('every move is used by exactly one toy (no orphans, no sharing)', () => {
    const used = TOY_LIST.flatMap((t) => t.moves);
    expect(new Set(used).size).toBe(used.length);
    for (const m of MOVE_LIST) expect(used, m.id).toContain(m.id);
  });

  it('SHOW moves have power, TRICK moves do something', () => {
    for (const m of MOVE_LIST) {
      if (m.kind === 'show') expect(m.power, m.id).toBeGreaterThan(0);
      else expect(Boolean(m.self || m.foe || m.heal || m.tangle), m.id).toBe(true);
    }
  });

  it('signature (4th) moves are the hardest to perform', () => {
    for (const t of TOY_LIST.filter((x) => !x.boss)) expect(MOVES[t.moves[3]]!.difficulty, t.id).toBe(3);
  });

  it('roster is 3 toys per type, and every non-boss toy appears in exactly one zone', () => {
    const counts: Record<string, number> = {};
    for (const t of TOY_LIST.filter((x) => !x.boss)) counts[t.type] = (counts[t.type] ?? 0) + 1;
    expect(counts).toEqual({ warm: 3, frost: 3, pine: 3, spark: 3 });
    const placed = ZONES.flatMap((z) => [...new Set([...z.wild, z.steward])]);
    for (const t of TOY_LIST) expect(placed.filter((x) => x === t.id), t.id).toHaveLength(1);
    for (const s of STARTERS) expect(TOY_LIST.find((t) => t.id === s)).toBeDefined();
  });

  it('zone toys share the type their arena boosts (the route teaches the loop)', () => {
    for (const z of ZONES.filter((x) => x.id !== 'tree')) {
      const boost = ARENA_LIST.find((a) => a.id === z.id)!.boost;
      for (const id of [...z.wild, z.steward]) expect(TOY_LIST.find((t) => t.id === id)!.type, `${z.id}:${id}`).toBe(boost);
    }
  });

  // Tone rule #3 from docs/DESIGN.md — enforced, so the edit pass sticks.
  it('keeps every line of flavour text short (≤ 12 words)', () => {
    const lines = [
      ...TOY_LIST.flatMap((t) => [t.bio, t.taunt]),
      ...MOVE_LIST.map((m) => m.blurb),
      ...ARENA_LIST.map((a) => a.blurb),
    ];
    for (const l of lines) expect(words(l), l).toBeLessThanOrEqual(12);
  });

  it('names are unique', () => {
    const names = [...TOY_LIST.map((t) => t.name), ...MOVE_LIST.map((m) => m.name)];
    expect(new Set(names).size).toBe(names.length);
  });
});
