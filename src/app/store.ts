import type { ArenaId } from '../core/types';
import type { Encounter, ResultSummary, SaveData } from '../core/campaign';
import { DEFAULT_SETTINGS, loadSave, loadSettings, memoryKV, writeSave, writeSettings, clearSave, type KV, type Settings } from '../core/save';
import { Obs } from './obs';
import type { Stage } from '../render/stage';
import { setVolume } from '../audio/sfx';

export type Screen =
  | { id: 'title' }
  | { id: 'intro' }
  | { id: 'starter' }
  | { id: 'map' }
  | { id: 'encounter'; enc: Encounter }
  | { id: 'battle'; enc: Encounter; uid: string }
  | { id: 'results'; result: ResultSummary; won: boolean; enc: Encounter; usedUid: string }
  | { id: 'ending' }
  | { id: 'versus'; cpu: boolean }
  | { id: 'versusBattle'; cpu: boolean; arena: ArenaId; toys: [string, string] }
  | { id: 'shelf'; back: Screen };

export interface AppState {
  screen: Screen;
  save: SaveData | null;
  settings: Settings;
  settingsOpen: boolean;
  notice: string | null;
  ask: { text: string; yes: string; resolve: (ok: boolean) => void } | null;
}

function safeKV(): KV {
  try {
    const t = '__mc_probe';
    localStorage.setItem(t, '1');
    localStorage.removeItem(t);
    return localStorage;
  } catch {
    return memoryKV();
  }
}

export const kv = safeKV();
const loaded = loadSave(kv);
const settings = loadSettings(kv);
setVolume(settings.sfx);

export const app = new Obs<AppState>({
  screen: { id: 'title' },
  save: loaded.status === 'ok' ? loaded.save : null,
  settings: settings ?? DEFAULT_SETTINGS,
  settingsOpen: false,
  ask: null,
  notice: loaded.status === 'corrupt' ? 'Your save was damaged, so we started fresh. (A backup was kept.)' : null,
});

/** In-game confirm (no native dialogs). */
export function ask(text: string, yes = 'Yes'): Promise<boolean> {
  return new Promise((resolve) => {
    app.update((s) => ({
      ...s,
      ask: {
        text,
        yes,
        resolve: (ok) => {
          app.update((x) => ({ ...x, ask: null }));
          resolve(ok);
        },
      },
    }));
  });
}

export function go(screen: Screen) {
  app.update((s) => ({ ...s, screen }));
}

export function setSave(save: SaveData | null) {
  if (save) writeSave(kv, save);
  else clearSave(kv);
  app.update((s) => ({ ...s, save }));
}

export function setSettings(p: Partial<Settings>) {
  const next = { ...app.get().settings, ...p };
  writeSettings(kv, next);
  setVolume(next.sfx);
  stageRef.current?.setReduceFx(next.reduceFx);
  app.update((s) => ({ ...s, settings: next }));
}

export const stageRef: { current: Stage | null } = { current: null };

export function stage(): Stage {
  if (!stageRef.current) throw new Error('stage not ready');
  return stageRef.current;
}
