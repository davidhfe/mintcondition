/**
 * Persistence. Versioned + validated so a hand-edited or stale save can never
 * crash the game: anything that fails validation is backed up and replaced.
 */
import { ZONES, type SaveData } from './campaign';
import { TOYS } from './data/toys';
import { MAX_LEVEL } from './stats';
import type { CpuLevel } from './ai';

export const SAVE_KEY = 'mint-condition/save';
export const SETTINGS_KEY = 'mint-condition/settings';
export const CURRENT_VERSION = 1;

export interface Settings {
  sfx: number;
  reduceFx: boolean;
  cpu: CpuLevel;
}

export const DEFAULT_SETTINGS: Settings = { sfx: 0.8, reduceFx: false, cpu: 'normal' };

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

export function validateSave(raw: unknown): SaveData | null {
  if (!isObj(raw) || raw.v !== CURRENT_VERSION) return null;
  if (!isNum(raw.createdAt) || !isNum(raw.updatedAt) || !isNum(raw.seed)) return null;
  if (!Array.isArray(raw.shelf) || !isObj(raw.zones) || !isObj(raw.stats)) return null;
  const uids = new Set<string>();
  for (const t of raw.shelf) {
    if (!isObj(t) || typeof t.uid !== 'string' || typeof t.toyId !== 'string') return null;
    if (!TOYS[t.toyId] || !isNum(t.level) || !isNum(t.xp)) return null;
    if (t.level < 1 || t.level > MAX_LEVEL || t.xp < 0 || uids.has(t.uid)) return null;
    uids.add(t.uid);
  }
  for (const z of ZONES) {
    const p = raw.zones[z.id];
    if (!isObj(p) || !isNum(p.wins) || typeof p.stewardBeaten !== 'boolean') return null;
  }
  if (!isNum(raw.stats.battles) || !isNum(raw.stats.wins)) return null;
  return raw as unknown as SaveData;
}

/** Upgrade older shapes to the current version. Only v1 exists so far. */
export function migrate(raw: unknown): unknown {
  return raw;
}

export type LoadResult = { status: 'empty' } | { status: 'ok'; save: SaveData } | { status: 'corrupt'; backupKey: string };

export function loadSave(kv: KV): LoadResult {
  const text = kv.getItem(SAVE_KEY);
  if (text === null) return { status: 'empty' };
  try {
    const save = validateSave(migrate(JSON.parse(text)));
    if (save) return { status: 'ok', save };
  } catch {
    /* fall through */
  }
  const backupKey = `${SAVE_KEY}/corrupt-${Date.now()}`;
  kv.setItem(backupKey, text);
  kv.removeItem(SAVE_KEY);
  return { status: 'corrupt', backupKey };
}

export function writeSave(kv: KV, save: SaveData): void {
  kv.setItem(SAVE_KEY, JSON.stringify(save));
}

export function clearSave(kv: KV): void {
  kv.removeItem(SAVE_KEY);
}

export function loadSettings(kv: KV): Settings {
  try {
    const raw: unknown = JSON.parse(kv.getItem(SETTINGS_KEY) ?? 'null');
    if (!isObj(raw)) return { ...DEFAULT_SETTINGS };
    return {
      sfx: isNum(raw.sfx) ? Math.max(0, Math.min(1, raw.sfx)) : DEFAULT_SETTINGS.sfx,
      reduceFx: typeof raw.reduceFx === 'boolean' ? raw.reduceFx : DEFAULT_SETTINGS.reduceFx,
      cpu: raw.cpu === 'easy' || raw.cpu === 'normal' || raw.cpu === 'hard' ? raw.cpu : DEFAULT_SETTINGS.cpu,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(kv: KV, s: Settings): void {
  kv.setItem(SETTINGS_KEY, JSON.stringify(s));
}

/** In-memory KV for tests and for browsers with storage disabled. */
export function memoryKV(): KV & { dump(): Record<string, string> } {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

