import { describe, expect, it } from 'vitest';
import { addXp, isDeluxe, movesAt, statsAt, xpToNext, MAX_LEVEL } from '../../src/core/stats';
import {
  applyResult,
  chooseStarter,
  isComplete,
  isUnlocked,
  newSave,
  rollEncounter,
  stewardEncounter,
  stewardReady,
  STARTER_LEVEL,
} from '../../src/core/campaign';
import { DEFAULT_SETTINGS, loadSave, loadSettings, memoryKV, SAVE_KEY, SETTINGS_KEY, writeSave } from '../../src/core/save';

describe('stats & levels', () => {
  it('scale with level and get a Deluxe bump at L6', () => {
    const l5 = statsAt('bigTed', 5);
    const l6 = statsAt('bigTed', 6);
    expect(isDeluxe(5)).toBe(false);
    expect(isDeluxe(6)).toBe(true);
    expect(l6.spirit / l5.spirit).toBeCloseTo((1.08 / 1.0) * 1.1, 1);
  });
  it('unlock moves at 1, 1, 3, 6', () => {
    expect(movesAt('jack', 1)).toEqual(['popGoes', 'woundUp']);
    expect(movesAt('jack', 3)).toHaveLength(3);
    expect(movesAt('jack', 6)).toHaveLength(4);
  });
  it('level up across multiple thresholds and report learned moves', () => {
    const r = addXp('jack', 2, 0, xpToNext(2) + xpToNext(3) + 1);
    expect(r).toMatchObject({ level: 4, xp: 1, levelsGained: 2, learned: ['jumpScare'], becameDeluxe: false });
    const d = addXp('jack', 5, 0, xpToNext(5));
    expect(d.becameDeluxe).toBe(true);
    expect(d.learned).toEqual(['jackpot']);
  });
  it('cap at max level', () => {
    expect(addXp('jack', 9, 0, 100000)).toMatchObject({ level: MAX_LEVEL, xp: 0 });
  });
});

describe('campaign', () => {
  const start = () => chooseStarter(newSave(0, 42), 'slick', 1);

  it('starts with one toy at the starter level; only the Bakery is open', () => {
    const s = start();
    expect(s.shelf).toEqual([{ uid: '1-slick', toyId: 'slick', level: STARTER_LEVEL, xp: 0 }]);
    expect(isUnlocked(s, 'bakery')).toBe(true);
    expect(isUnlocked(s, 'wrapping')).toBe(false);
    expect(() => chooseStarter(s, 'bigTed', 2)).toThrow();
    expect(() => chooseStarter(newSave(0, 1), 'topper', 2)).toThrow();
  });

  it('prefers toys you have not boxed yet, and boxes them on a win', () => {
    let s = start();
    const e1 = rollEncounter(s, 'bakery');
    s = e1.save;
    const r1 = applyResult(s, '1-slick', e1.encounter, true, 2);
    expect(r1.boxed?.toyId).toBe(e1.encounter.toyId);
    s = r1.save;
    const e2 = rollEncounter(s, 'bakery');
    expect(e2.encounter.toyId).not.toBe(e1.encounter.toyId);
  });

  it('a loss still pays some XP, boxes nothing, and does not count as a win', () => {
    const s = start();
    const e = rollEncounter(s, 'bakery');
    const r = applyResult(e.save, '1-slick', e.encounter, false, 2);
    expect(r.boxed).toBeNull();
    expect(r.gained).toBeGreaterThan(0);
    expect(r.save.zones.bakery.wins).toBe(0);
    expect(r.save.stats).toEqual({ battles: 1, wins: 0 });
  });

  it('opens the Steward after two wins and the next zone after the Steward', () => {
    let s = start();
    expect(stewardReady(s, 'bakery')).toBe(false);
    for (let i = 0; i < 2; i++) {
      const e = rollEncounter(s, 'bakery');
      s = applyResult(e.save, '1-slick', e.encounter, true, 2).save;
    }
    expect(stewardReady(s, 'bakery')).toBe(true);
    const r = applyResult(s, '1-slick', stewardEncounter('bakery'), true, 3);
    expect(r.unlocked).toBe('wrapping');
    expect(r.boxed?.toyId).toBe('chuggs');
    // joins at max(its level, best - 1)
    const best = Math.max(...s.shelf.map((t) => t.level));
    expect(r.boxed?.level).toBe(Math.max(4, best - 1));
    expect(isUnlocked(r.save, 'wrapping')).toBe(true);
  });

  it('finishes when The Topper is beaten', () => {
    let s = start();
    for (const z of ['bakery', 'wrapping', 'roof', 'yard'] as const) s = applyResult(s, '1-slick', stewardEncounter(z), true, 1).save;
    expect(isUnlocked(s, 'tree')).toBe(true);
    const r = applyResult(s, '1-slick', stewardEncounter('tree'), true, 1);
    expect(r.finished).toBe(true);
    expect(isComplete(r.save)).toBe(true);
    expect(r.boxed?.toyId).toBe('topper');
  });

  it('benched toys earn a watcher share of XP', () => {
    let s = start();
    s = applyResult(s, '1-slick', stewardEncounter('bakery'), true, 1).save; // boxes Chuggs
    const before = s.shelf.find((t) => t.toyId === 'chuggs')!;
    const r = applyResult(s, '1-slick', { zone: 'bakery', toyId: 'bigTed', level: 3, steward: false }, true, 2);
    const after = r.save.shelf.find((t) => t.toyId === 'chuggs')!;
    expect(after.xp + (after.level > before.level ? 1000 : 0)).toBeGreaterThan(before.xp);
    expect(Math.round(r.gained * 0.3)).toBeGreaterThan(0);
  });

  it('refuses locked zones', () => {
    expect(() => rollEncounter(start(), 'roof')).toThrow();
  });
});

describe('save', () => {
  it('round-trips', () => {
    const kv = memoryKV();
    const s = chooseStarter(newSave(0, 1), 'bigTed', 1);
    writeSave(kv, s);
    expect(loadSave(kv)).toEqual({ status: 'ok', save: s });
  });
  it('reports empty', () => {
    expect(loadSave(memoryKV())).toEqual({ status: 'empty' });
  });
  it.each([
    ['not json', '{oops'],
    ['wrong version', JSON.stringify({ v: 99 })],
    ['unknown toy', JSON.stringify({ ...newSave(0, 1), shelf: [{ uid: 'a', toyId: 'furby', level: 1, xp: 0 }] })],
    ['bad level', JSON.stringify({ ...newSave(0, 1), shelf: [{ uid: 'a', toyId: 'jack', level: 99, xp: 0 }] })],
    ['duplicate uid', JSON.stringify({ ...newSave(0, 1), shelf: [{ uid: 'a', toyId: 'jack', level: 1, xp: 0 }, { uid: 'a', toyId: 'jack', level: 1, xp: 0 }] })],
    ['missing zone', JSON.stringify({ ...newSave(0, 1), zones: {} })],
  ])('backs up and clears a corrupt save (%s)', (_, text) => {
    const kv = memoryKV();
    kv.setItem(SAVE_KEY, text);
    const r = loadSave(kv);
    expect(r.status).toBe('corrupt');
    expect(kv.getItem(SAVE_KEY)).toBeNull();
    if (r.status === 'corrupt') expect(kv.getItem(r.backupKey)).toBe(text);
  });
  it('settings fall back to defaults and clamp', () => {
    const kv = memoryKV();
    expect(loadSettings(kv)).toEqual(DEFAULT_SETTINGS);
    kv.setItem(SETTINGS_KEY, JSON.stringify({ sfx: 7, reduceFx: true, cpu: 'nightmare' }));
    expect(loadSettings(kv)).toEqual({ sfx: 1, reduceFx: true, cpu: 'normal' });
  });
});
