/**
 * The performance minigames. Each resolves its request with a score 0–1.
 * Judging uses KeyboardEvent.timeStamp (same clock as performance.now()),
 * per the input spike. Pointer/touch works for everything in single player.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { DefenseGrade } from '../../core/types';
import { accepts, labelFor, onKey, type Action } from '../../input/keys';
import { sfx } from '../../audio/sfx';
import { hex, TYPE_COLOR } from '../../render/palette';
import type { DefenseReq, MinigameReq } from './hud';

import { RHYTHM, TIMING, MASH, KEEP_COOL, LATE_ALLOWANCE_MS, rhythmNoteScore, rhythmWindow, timingScore, keepCoolGrade } from './scoring';

const LANES: Action[] = ['left', 'down', 'up', 'right'];
const ARROW_ROT: Record<string, number> = { left: -90, down: 180, up: 0, right: 90 };

function Arrow({ dir, color, size = 44 }: { dir: Action; color: string; size?: number }) {
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size} style={{ transform: `rotate(${ARROW_ROT[dir]}deg)` }}>
      <path d="M0,-42 L38,0 L16,0 L16,40 L-16,40 L-16,0 L-38,0 Z" fill={color} stroke="var(--ink)" stroke-width="9" stroke-linejoin="round" />
    </svg>
  );
}

function Header({ req, hint }: { req: MinigameReq; hint: string }) {
  return (
    <div class="mg-head">
      <span class="mg-move" style={{ color: hex(TYPE_COLOR[req.type]) }}>{req.moveName}</span>
      <span class="mg-hint">{req.speed > 1 && <b class="racket">RACKET: 20% FASTER · </b>}{hint}</span>
    </div>
  );
}

// ── RHYTHM ──────────────────────────────────────────────────
interface Note { lane: number; t: number; judged: boolean; score: number; el?: HTMLDivElement }

function pattern(n: number, seed: number): number[] {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    let lane = (s >>> 16) % 4;
    if (i >= 2 && out[i - 1] === lane && out[i - 2] === lane) lane = (lane + 1) % 4;
    out.push(lane);
  }
  return out;
}

export function Rhythm({ req }: { req: MinigameReq }) {
  const field = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState<{ lane: number; text: string; k: number } | null>(null);
  useEffect(() => {
    const d = req.difficulty - 1;
    const n = RHYTHM.notes[d]!;
    const spacing = RHYTHM.spacingMs[d]! / req.speed;
    const travel = RHYTHM.travelMs / req.speed;
    const start = performance.now() + 450;
    const lanesOf = pattern(n, req.id * 7919);
    const notes: Note[] = lanesOf.map((lane, i) => ({ lane, t: start + travel + i * spacing, judged: false, score: 0 }));
    const root = field.current!;
    const H = root.clientHeight;
    for (const nt of notes) {
      const el = document.createElement('div');
      el.className = 'rh-note';
      el.style.left = `${nt.lane * 25}%`;
      el.innerHTML = root.querySelector(`[data-glyph="${nt.lane}"]`)!.innerHTML;
      root.appendChild(el);
      nt.el = el;
    }
    let stray = 0;
    let done = false;
    let raf = 0;
    const show = (lane: number, text: string) => setFlash({ lane, text, k: Math.random() });
    const judge = (lane: number, time: number) => {
      let best: Note | null = null;
      const okWin = rhythmWindow(req.difficulty);
      for (const nt of notes) if (!nt.judged && nt.lane === lane && Math.abs(time - nt.t) <= okWin && (!best || Math.abs(time - nt.t) < Math.abs(time - best.t))) best = nt;
      if (!best) {
        stray++;
        sfx.missNote();
        return;
      }
      best.judged = true;
      best.score = rhythmNoteScore(time - best.t, req.difficulty);
      best.el?.classList.add('hit');
      sfx.hitNote(lane);
      show(lane, best.score === 1 ? 'PERFECT' : best.score >= 0.75 ? 'GOOD' : 'OK');
    };
    const frame = () => {
      const now = performance.now();
      for (const nt of notes) {
        if (!nt.el) continue;
        const y = ((nt.t - now) / travel) * (H - 70);
        nt.el.style.transform = `translateY(${y}px)`;
        if (!nt.judged && now - nt.t > rhythmWindow(req.difficulty)) {
          nt.judged = true;
          nt.el.classList.add('miss');
          show(nt.lane, 'MISS');
          sfx.missNote();
        }
      }
      if (!done && notes.every((x) => x.judged) && now > notes[notes.length - 1]!.t + 250) {
        done = true;
        const avg = notes.reduce((a, b) => a + b.score, 0) / notes.length;
        req.resolve(Math.max(0, avg - Math.min(0.3, stray * 0.05)));
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const off = onKey((e) => {
      if (!accepts(req.control, e.player) || e.repeat) return;
      const lane = LANES.indexOf(e.action);
      if (lane >= 0) judge(lane, e.time);
    });
    (root as unknown as { __judge: typeof judge }).__judge = judge;
    return () => {
      done = true;
      cancelAnimationFrame(raf);
      off();
      notes.forEach((x) => x.el?.remove());
    };
  }, [req.id]);
  const color = hex(TYPE_COLOR[req.type]);
  const tap = (lane: number) => (e: PointerEvent) => {
    e.preventDefault();
    (field.current as unknown as { __judge?: (l: number, t: number) => void }).__judge?.(lane, e.timeStamp);
  };
  return (
    <div class="mg panel rhythm" data-control={req.control}>
      <Header req={req} hint="Hit the arrows as they reach the top" />
      <div class="rh-field" ref={field}>
        {LANES.map((l, i) => (
          <div class="rh-lane" key={l} style={{ left: `${i * 25}%` }} onPointerDown={tap(i)}>
            <div class="rh-recv"><Arrow dir={l} color="var(--paper)" /></div>
            <div class="rh-key">{labelFor(req.control, l)}</div>
            {flash?.lane === i && <div class="rh-judge" key={flash.k}>{flash.text}</div>}
            <div hidden data-glyph={i}><Arrow dir={l} color={color} size={52} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TIMING ──────────────────────────────────────────────────
export function Timing({ req }: { req: MinigameReq }) {
  const needle = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<number | null>(null);
  const d = req.difficulty;
  const sweet = TIMING.sweet[d - 1]!;
  const perfect = TIMING.perfect[d - 1]!;
  const stopRef = useRef<(t: number) => void>(() => {});
  useEffect(() => {
    const sweep = TIMING.sweepMs[d - 1]! / req.speed;
    const t0 = performance.now() + 300;
    let raf = 0;
    let stopped = false;
    const pos = (t: number) => {
      const ph = Math.max(0, (t - t0) / sweep);
      const f = ph % 2;
      return f < 1 ? f : 2 - f;
    };
    const finish = (score: number) => {
      if (stopped) return;
      stopped = true;
      setResult(score);
      setTimeout(() => req.resolve(score), 380);
    };
    stopRef.current = (t: number) => {
      if (t < t0 || stopped) return;
      const x = pos(t);
      if (needle.current) needle.current.style.left = `${x * 100}%`;
      finish(timingScore(x, d));
    };
    const frame = () => {
      const now = performance.now();
      if (stopped) return;
      if (needle.current) needle.current.style.left = `${pos(now) * 100}%`;
      if (now - t0 > sweep * 3.2) {
        finish(0.15);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const off = onKey((e) => {
      if (accepts(req.control, e.player) && e.action === 'act' && !e.repeat) stopRef.current(e.time);
    });
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      off();
    };
  }, [req.id]);
  return (
    <div class="mg panel timing" data-control={req.control} onPointerDown={(e) => stopRef.current(e.timeStamp)}>
      <Header req={req} hint={`Stop it in the gold — ${labelFor(req.control, 'act')}`} />
      <div class="tm-bar">
        <div class="tm-sweet" style={{ width: `${sweet * 100}%`, left: `${(0.5 - sweet / 2) * 100}%` }} />
        <div class="tm-perfect" style={{ width: `${perfect * 100}%`, left: `${(0.5 - perfect / 2) * 100}%` }} />
        <div class="tm-needle" ref={needle} />
      </div>
      {result !== null && <div class={`tm-result ${result >= 0.9 ? 'gold' : ''}`}>{result >= 0.9 ? 'BULLSEYE' : result >= 0.65 ? 'CLOSE' : 'WIDE'}</div>}
    </div>
  );
}

// ── MASH ────────────────────────────────────────────────────
export function Mash({ req }: { req: MinigameReq }) {
  const [count, setCount] = useState(0);
  const [left, setLeft] = useState(1);
  const [phase, setPhase] = useState<'ready' | 'go' | 'done'>('ready');
  const target = MASH.target[req.difficulty - 1]!;
  const hit = useRef<() => void>(() => {});
  useEffect(() => {
    const dur = MASH.durationMs / req.speed;
    let n = 0;
    let t0 = 0;
    let raf = 0;
    let live = false;
    const ready = setTimeout(() => {
      live = true;
      t0 = performance.now();
      setPhase('go');
      const frame = () => {
        const k = 1 - (performance.now() - t0) / dur;
        setLeft(Math.max(0, k));
        if (k <= 0) {
          live = false;
          setPhase('done');
          setTimeout(() => req.resolve(Math.min(1, n / target)), 250);
          return;
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }, 450);
    hit.current = () => {
      if (!live) return;
      n++;
      setCount(n);
      sfx.mash(n);
    };
    const off = onKey((e) => {
      if (accepts(req.control, e.player) && e.action === 'act' && !e.repeat) hit.current();
    });
    return () => {
      clearTimeout(ready);
      cancelAnimationFrame(raf);
      off();
    };
  }, [req.id]);
  const fill = Math.min(1, count / target);
  return (
    <div class="mg panel mash" data-control={req.control} onPointerDown={(e) => { e.preventDefault(); hit.current(); }}>
      <Header req={req} hint={phase === 'ready' ? 'Get ready…' : `MASH ${labelFor(req.control, 'act')}!`} />
      <div class="ms-meter"><div class="ms-fill" style={{ width: `${fill * 100}%`, background: req.type === 'plain' ? 'var(--gold)' : hex(TYPE_COLOR[req.type]) }} /></div>
      <div class="ms-row">
        <div class={`ms-count ${fill >= 1 ? 'full' : ''}`} key={count}>{count}<small>/{target}</small></div>
        <div class="ms-timer"><div style={{ width: `${left * 100}%` }} /></div>
      </div>
    </div>
  );
}

// ── KEEP COOL (defender) ────────────────────────────────────
export function KeepCool({ req }: { req: DefenseReq }) {
  const ring = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'wait' | DefenseGrade | 'flinch'>('wait');
  const press = useRef<(t: number) => void>(() => {});
  useEffect(() => {
    const t0 = performance.now();
    const T = t0 + req.duration * 1000;
    let decided = false;
    let raf = 0;
    const decide = (g: DefenseGrade, shown: DefenseGrade | 'flinch') => {
      if (decided) return;
      decided = true;
      setState(shown);
      if (shown === 'flinch') sfx.flinch();
      req.resolve(g);
    };
    press.current = (t) => {
      const g = keepCoolGrade(t - T);
      decide(g === 'flinch' ? 'none' : g, g);
    };
    const frame = () => {
      const now = performance.now();
      const k = Math.min(1, (now - t0) / (req.duration * 1000));
      if (ring.current) ring.current.style.transform = `translate(-50%,-50%) scale(${3.2 - 2.2 * k})`;
      if (now > T + KEEP_COOL.goodMs + LATE_ALLOWANCE_MS) {
        decide('none', 'none');
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const off = onKey((e) => {
      if (accepts(req.control, e.player) && e.action === 'act' && !e.repeat) press.current(e.time);
    });
    return () => {
      cancelAnimationFrame(raf);
      off();
    };
  }, [req.id]);
  return (
    <div class="kc" data-control={req.control} onPointerDown={req.control === 'any' ? (e) => press.current(e.timeStamp) : undefined}>
      <div class="kc-anchor" style={{ left: `${req.x}px`, top: `${req.y}px` }}>
        <div class="kc-target" />
        <div class={`kc-ring ${state}`} ref={ring} />
        <div class="kc-label">{state === 'wait' ? <>KEEP COOL <b>{labelFor(req.control, 'act')}</b></> : state === 'flinch' ? 'FLINCHED' : ''}</div>
      </div>
    </div>
  );
}

export function MinigameView({ req }: { req: MinigameReq }) {
  if (req.game === 'rhythm') return <Rhythm req={req} key={req.id} />;
  if (req.game === 'timing') return <Timing req={req} key={req.id} />;
  return <Mash req={req} key={req.id} />;
}

