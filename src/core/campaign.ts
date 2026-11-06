/** Campaign progression: departments, encounters, results. Pure functions over SaveData. */
import type { ArenaId } from './types';
import type { CpuLevel } from './ai';
import { addXp, MAX_LEVEL, xpReward, type LevelUpResult } from './stats';
import { int, pick, type RngHolder } from './rng';
import { toy } from './data/toys';

export interface ZoneDef {
  id: ArenaId;
  wild: readonly [string, string];
  wildLevels: readonly [number, number];
  steward: string;
  stewardLevel: number;
  requires: ArenaId | null;
}

export const ZONES: readonly ZoneDef[] = [
  { id: 'bakery', wild: ['gingerSnap', 'bigTed'], wildLevels: [2, 3], steward: 'chuggs', stewardLevel: 4, requires: null },
  { id: 'wrapping', wild: ['jack', 'dobbin'], wildLevels: [3, 4], steward: 'colonelCrunch', stewardLevel: 5, requires: 'bakery' },
  { id: 'roof', wild: ['cymon', 'chatterbox'], wildLevels: [4, 5], steward: 'sprocket', stewardLevel: 6, requires: 'wrapping' },
  { id: 'yard', wild: ['slick', 'abner'], wildLevels: [6, 7], steward: 'dameFlurry', stewardLevel: 8, requires: 'roof' },
  { id: 'tree', wild: ['topper', 'topper'], wildLevels: [9, 9], steward: 'topper', stewardLevel: 9, requires: 'yard' },
];

export const STARTERS = ['bigTed', 'slick', 'chatterbox'] as const;

/**
 * How campaign opponents play: [brain, hands]. Wild toys are pushovers,
 * Stewards think harder, The Topper has real hands. The CPU setting shifts
 * everything one notch.
 */
export type Opp = { brain: CpuLevel; hands: CpuLevel };
const NOTCH: readonly CpuLevel[] = ['easy', 'normal', 'hard'];
const shift = (l: CpuLevel, by: number): CpuLevel => NOTCH[Math.max(0, Math.min(2, NOTCH.indexOf(l) + by))]!;
export function opponentProfile(enc: { zone: ArenaId; steward: boolean }, setting: CpuLevel = 'normal'): Opp {
  const by = NOTCH.indexOf(setting) - 1;
  const base: Opp = enc.zone === 'tree' ? { brain: 'hard', hands: 'normal' } : enc.steward ? { brain: 'hard', hands: 'easy' } : { brain: 'easy', hands: 'easy' };
  return { brain: shift(base.brain, by), hands: shift(base.hands, by) };
}
export const STARTER_LEVEL = 3;
export const STEWARD_AFTER_WINS = 2;

export function zone(id: ArenaId): ZoneDef {
  const z = ZONES.find((x) => x.id === id);
  if (!z) throw new Error(`Unknown zone ${id}`);
  return z;
}

export interface OwnedToy {
  uid: string;
  toyId: string;
  level: number;
  xp: number;
}

export interface ZoneProgress {
  wins: number;
  stewardBeaten: boolean;
}

export interface SaveData {
  v: 1;
  createdAt: number;
  updatedAt: number;
  shelf: OwnedToy[];
  zones: Record<ArenaId, ZoneProgress>;
  stats: { battles: number; wins: number };
  /** Advances on every encounter so wild rolls are reproducible but varied. */
  seed: number;
}

export function newSave(now: number, seed: number): SaveData {
  const zones = Object.fromEntries(ZONES.map((z) => [z.id, { wins: 0, stewardBeaten: false }])) as Record<ArenaId, ZoneProgress>;
  return { v: 1, createdAt: now, updatedAt: now, shelf: [], zones, stats: { battles: 0, wins: 0 }, seed: seed >>> 0 };
}

export function owns(save: SaveData, toyId: string): boolean {
  return save.shelf.some((t) => t.toyId === toyId);
}

function boxToy(save: SaveData, toyId: string, level: number): OwnedToy {
  const owned: OwnedToy = { uid: `${save.shelf.length + 1}-${toyId}`, toyId, level, xp: 0 };
  save.shelf.push(owned);
  return owned;
}

export function chooseStarter(prev: SaveData, toyId: string, now: number): SaveData {
  if (!(STARTERS as readonly string[]).includes(toyId)) throw new Error(`${toyId} is not a starter`);
  if (prev.shelf.length > 0) throw new Error('starter already chosen');
  const save = structuredClone(prev);
  boxToy(save, toyId, STARTER_LEVEL);
  save.updatedAt = now;
  return save;
}

export function isUnlocked(save: SaveData, id: ArenaId): boolean {
  const req = zone(id).requires;
  return req === null || save.zones[req].stewardBeaten;
}

export function stewardReady(save: SaveData, id: ArenaId): boolean {
  if (id === 'tree') return isUnlocked(save, 'tree');
  return save.zones[id].wins >= STEWARD_AFTER_WINS;
}

export function isComplete(save: SaveData): boolean {
  return save.zones.tree.stewardBeaten;
}

export interface Encounter {
  zone: ArenaId;
  toyId: string;
  level: number;
  steward: boolean;
}

/** Wild encounter. Prefers species you don't own yet. */
export function rollEncounter(prev: SaveData, id: ArenaId): { save: SaveData; encounter: Encounter } {
  const z = zone(id);
  if (!isUnlocked(prev, id)) throw new Error(`${id} is locked`);
  if (id === 'tree') return { save: prev, encounter: stewardEncounter(id) };
  const save = structuredClone(prev);
  const h: RngHolder = { rng: save.seed };
  const unowned = z.wild.filter((t) => !owns(save, t));
  const toyId = pick(h, unowned.length ? unowned : z.wild);
  const level = int(h, z.wildLevels[0], z.wildLevels[1]);
  save.seed = h.rng;
  return { save, encounter: { zone: id, toyId, level, steward: false } };
}

export function stewardEncounter(id: ArenaId): Encounter {
  const z = zone(id);
  return { zone: id, toyId: z.steward, level: z.stewardLevel, steward: true };
}

export interface ResultSummary {
  save: SaveData;
  gained: number;
  levelUp: LevelUpResult;
  boxed: OwnedToy | null;
  unlocked: ArenaId | null;
  finished: boolean;
  /** Benched toys that levelled up from the watcher's share. */
  benchLevelUps: { uid: string; level: number; becameDeluxe: boolean }[];
}

/** Toys on the shelf earn this share of the XP — they were watching. */
export const BENCH_SHARE = 0.3;

export function applyResult(prev: SaveData, uid: string, enc: Encounter, won: boolean, now: number): ResultSummary {
  const save = structuredClone(prev);
  const mine = save.shelf.find((t) => t.uid === uid);
  if (!mine) throw new Error(`No toy ${uid} on the shelf`);
  const gained = xpReward(enc.level, won);
  const levelUp = addXp(mine.toyId, mine.level, mine.xp, gained);
  mine.level = levelUp.level;
  mine.xp = levelUp.xp;
  const benchLevelUps: ResultSummary['benchLevelUps'] = [];
  const share = Math.round(gained * BENCH_SHARE);
  for (const t of save.shelf) {
    if (t.uid === uid || share === 0) continue;
    const r = addXp(t.toyId, t.level, t.xp, share);
    if (r.levelsGained > 0) benchLevelUps.push({ uid: t.uid, level: r.level, becameDeluxe: r.becameDeluxe });
    t.level = r.level;
    t.xp = r.xp;
  }
  save.stats.battles++;
  let boxed: OwnedToy | null = null;
  let unlocked: ArenaId | null = null;
  if (won) {
    save.stats.wins++;
    const zp = save.zones[enc.zone];
    zp.wins++;
    // New toys join near your best toy's level ("they've been watching"), so the
    // counter you just boxed is actually usable in the next department.
    const best = Math.max(...save.shelf.map((t) => t.level));
    if (!owns(save, enc.toyId)) boxed = boxToy(save, enc.toyId, Math.max(enc.level, Math.min(MAX_LEVEL, best - 1)));
    if (enc.steward && !zp.stewardBeaten) {
      zp.stewardBeaten = true;
      unlocked = ZONES.find((z) => z.requires === enc.zone)?.id ?? null;
    }
  }
  save.updatedAt = now;
  return { save, gained, levelUp, boxed, unlocked, finished: won && enc.zone === 'tree', benchLevelUps };
}

/** Pretty label for a toy on the shelf. */
export function shelfLabel(t: OwnedToy): string {
  return `${toy(t.toyId).name} · L${t.level}`;
}
