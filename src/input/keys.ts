/**
 * Two players, one keyboard. P1: WASD + Space. P2: arrows + Enter.
 * In single-player screens either set drives the human (player = 'any').
 */
export type Action = 'up' | 'down' | 'left' | 'right' | 'act' | 'back';
export type PlayerId = 0 | 1;
export type Control = 'p1' | 'p2' | 'any';

export interface KeyEvt {
  player: PlayerId;
  action: Action;
  time: number;
  repeat: boolean;
}

const P1: Record<string, Action> = { KeyW: 'up', KeyA: 'left', KeyS: 'down', KeyD: 'right', Space: 'act', KeyF: 'act', Escape: 'back' };
const P2: Record<string, Action> = { ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right', Enter: 'act', NumpadEnter: 'act', Slash: 'act', Backspace: 'back' };

export const KEY_LABEL: Record<PlayerId, Record<Action, string>> = {
  0: { up: 'W', left: 'A', down: 'S', right: 'D', act: 'SPACE', back: 'ESC' },
  1: { up: '↑', left: '←', down: '↓', right: '→', act: 'ENTER', back: '⌫' },
};

export function labelFor(control: Control, a: Action): string {
  if (control === 'p2') return KEY_LABEL[1][a];
  if (control === 'p1') return KEY_LABEL[0][a];
  return a === 'act' ? 'SPACE' : KEY_LABEL[1][a];
}

export function accepts(control: Control, p: PlayerId): boolean {
  return control === 'any' || (control === 'p1' && p === 0) || (control === 'p2' && p === 1);
}

type Fn = (e: KeyEvt) => void;
const subs = new Set<Fn>();
let installed = false;

function install() {
  if (installed) return;
  installed = true;
  addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const a1 = P1[e.code];
    const a2 = P2[e.code];
    if (!a1 && !a2) return;
    e.preventDefault();
    const evt: KeyEvt = { player: a1 ? 0 : 1, action: (a1 ?? a2)!, time: e.timeStamp, repeat: e.repeat };
    for (const s of [...subs]) s(evt);
  });
}

/** Subscribe to mapped key presses. Returns an unsubscribe function. */
export function onKey(fn: Fn): () => void {
  install();
  subs.add(fn);
  return () => subs.delete(fn);
}
