import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { onKey, type Action } from '../input/keys';
import { sfx, unlockAudio } from '../audio/sfx';
import { portrait } from './portraits';
import type { BaseStats } from '../core/types';

/**
 * Keyboard navigation over a list/grid. Either player's keys work.
 * cols = 1 → vertical list; cols = n → grid.
 */
export function useNav(count: number, o: { cols?: number; onAct?: (i: number) => void; onBack?: () => void; onMove?: (i: number) => void; initial?: number; enabled?: boolean; capture?: boolean }) {
  const [i, setI] = useState(o.initial ?? 0);
  const ref = useRef({ i, o, count });
  ref.current = { i, o, count };
  useEffect(() => {
    return onKey((e) => {
      const { i: cur, o: opts, count: n } = ref.current;
      if (opts.enabled === false || n === 0) return;
      unlockAudio();
      const cols = opts.cols ?? 1;
      const step: Partial<Record<Action, number>> = cols === 1 ? { up: -1, down: 1, left: -1, right: 1 } : { up: -cols, down: cols, left: -1, right: 1 };
      if (e.action === 'act') {
        opts.onAct?.(cur);
        return;
      }
      if (e.action === 'back') {
        opts.onBack?.();
        return;
      }
      const d = step[e.action];
      if (d === undefined) return;
      const next = Math.max(0, Math.min(n - 1, cur + d));
      if (next !== cur) {
        sfx.move();
        setI(next);
        opts.onMove?.(next);
      }
    }, { capture: o.capture });
  }, []);
  return [i, (v: number) => { setI(v); o.onMove?.(v); }] as const;
}

export function Btn({ children, onClick, sel, kind = 'normal', disabled }: { children: ComponentChildren; onClick: () => void; sel?: boolean; kind?: 'normal' | 'big' | 'ghost'; disabled?: boolean }) {
  return (
    <button
      class={`btn ${kind} ${sel ? 'sel' : ''}`}
      disabled={disabled}
      onClick={() => {
        unlockAudio();
        sfx.select();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

export function Portrait({ toyId, deluxe, hidden, class: cls }: { toyId: string; deluxe?: boolean; hidden?: boolean; class?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void portrait(toyId, deluxe, hidden).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [toyId, deluxe, hidden]);
  return <div class={`portrait ${hidden ? 'unknown' : ''} ${cls ?? ''}`}>{url ? <img src={url} alt="" draggable={false} /> : <div class="portrait-wait" />}</div>;
}

const STAT_MAX = { spirit: 160, flair: 85, poise: 85, hustle: 90 };

export function StatBars({ s }: { s: BaseStats }) {
  return (
    <div class="stats">
      {(['spirit', 'flair', 'poise', 'hustle'] as const).map((k) => (
        <div class="stat" key={k}>
          <span>{k.toUpperCase()}</span>
          <div class="sbar"><div style={{ width: `${Math.min(100, (s[k] / STAT_MAX[k]) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

/** The type loop, always one glance away. */
export function TypeLoop() {
  const t = [
    ['frost', 'FROST'],
    ['warm', 'WARM'],
    ['pine', 'PINE'],
    ['spark', 'SPARK'],
    ['frost', 'FROST'],
  ] as const;
  return (
    <div class="typeloop" title="Each type is SUPER SWEET against the next one">
      {t.map(([k, l], i) => (
        <span key={i}>
          <span class={`tl t-${k}`}>{l}</span>
          {i < t.length - 1 && <span class="tl-arrow">›</span>}
        </span>
      ))}
    </div>
  );
}

export function KeyHint({ children }: { children: ComponentChildren }) {
  return <div class="keyhint">{children}</div>;
}
