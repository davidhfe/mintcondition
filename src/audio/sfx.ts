/**
 * Sound effects, synthesised with WebAudio — no asset files, no licensing.
 * No music (by request). Optional voice-over clips load from /vo if a
 * manifest lists them (see docs/VO_SCRIPT.md); otherwise VO is silent.
 */
import type { MoveType } from '../core/types';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let comp: DynamicsCompressorNode | null = null;
let volume = 0.8;
let noiseBuf: AudioBuffer | null = null;

function ac(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    ctx = new AudioContext();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(comp);
    comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ac();
  if (c && c.state === 'suspended') void c.resume();
}

export function setVolume(v: number) {
  volume = v;
  if (master) master.gain.value = v;
}

interface ToneOpts {
  f: number;
  to?: number;
  type?: OscillatorType;
  dur: number;
  at?: number;
  gain?: number;
  attack?: number;
  /** FM: modulator ratio + depth (bells, chimes). */
  fm?: [number, number];
}

function tone(o: ToneOpts) {
  const c = ac();
  if (!c || !master || volume <= 0) return;
  const t0 = c.currentTime + (o.at ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.dur);
  if (o.fm) {
    const mod = c.createOscillator();
    const mg = c.createGain();
    mod.frequency.value = o.f * o.fm[0];
    mg.gain.setValueAtTime(o.f * o.fm[1], t0);
    mg.gain.exponentialRampToValueAtTime(1, t0 + o.dur);
    mod.connect(mg).connect(osc.frequency);
    mod.start(t0);
    mod.stop(t0 + o.dur + 0.05);
  }
  const peak = o.gain ?? 0.25;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + (o.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.05);
}

interface NoiseOpts {
  dur: number;
  at?: number;
  gain?: number;
  filter?: BiquadFilterType;
  f?: number;
  to?: number;
  q?: number;
  attack?: number;
}

function noise(o: NoiseOpts) {
  const c = ac();
  if (!c || !master || !noiseBuf || volume <= 0) return;
  const t0 = c.currentTime + (o.at ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const flt = c.createBiquadFilter();
  flt.type = o.filter ?? 'bandpass';
  flt.frequency.setValueAtTime(o.f ?? 1000, t0);
  if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
  flt.Q.value = o.q ?? 1;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.3, t0 + (o.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  src.connect(flt).connect(g).connect(master);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + o.dur + 0.05);
}

const bell = (f: number, at = 0, gain = 0.18, dur = 0.6) => tone({ f, at, gain, dur, fm: [3.5, 2.2] });

export const sfx = {
  move: () => tone({ f: 660, dur: 0.05, type: 'triangle', gain: 0.12 }),
  select: () => {
    tone({ f: 520, dur: 0.06, type: 'square', gain: 0.07 });
    tone({ f: 780, dur: 0.08, at: 0.05, type: 'square', gain: 0.07 });
  },
  confirm: () => {
    bell(880, 0, 0.14, 0.35);
    bell(1320, 0.06, 0.12, 0.4);
  },
  back: () => tone({ f: 440, to: 300, dur: 0.12, type: 'triangle', gain: 0.12 }),
  page: () => noise({ dur: 0.18, f: 2500, to: 600, filter: 'bandpass', q: 0.8, gain: 0.18 }),
  whoosh: () => noise({ dur: 0.28, f: 300, to: 3000, filter: 'bandpass', q: 1.5, gain: 0.28, attack: 0.08 }),
  impact: (big: boolean) => {
    tone({ f: big ? 140 : 180, to: 40, dur: big ? 0.45 : 0.3, type: 'sine', gain: big ? 0.6 : 0.45 });
    noise({ dur: big ? 0.3 : 0.18, f: 1800, to: 300, filter: 'lowpass', gain: big ? 0.45 : 0.3 });
    if (big) noise({ dur: 0.5, f: 5000, to: 2000, filter: 'highpass', gain: 0.12, at: 0.02 });
  },
  hitNote: (lane: number) => tone({ f: [523, 587, 659, 784][lane] ?? 523, dur: 0.12, type: 'triangle', gain: 0.16 }),
  missNote: () => tone({ f: 140, to: 90, dur: 0.12, type: 'sawtooth', gain: 0.07 }),
  tick: () => tone({ f: 1400, dur: 0.03, type: 'square', gain: 0.05 }),
  mash: (n: number) => tone({ f: 300 + Math.min(n, 20) * 30, dur: 0.05, type: 'square', gain: 0.07 }),
  perfect: () => [1047, 1319, 1568, 2093].forEach((f, i) => bell(f, i * 0.05, 0.13, 0.5)),
  great: () => [784, 1047, 1319].forEach((f, i) => bell(f, i * 0.05, 0.12, 0.4)),
  ok: () => bell(660, 0, 0.12, 0.3),
  sloppy: () => tone({ f: 330, to: 200, dur: 0.3, type: 'triangle', gain: 0.14 }),
  ring: () => tone({ f: 1800, to: 2400, dur: 0.6, type: 'sine', gain: 0.05, attack: 0.4 }),
  unfazed: () => {
    bell(2093, 0, 0.16, 0.7);
    bell(2637, 0.04, 0.12, 0.7);
  },
  steady: () => bell(1568, 0, 0.12, 0.4),
  flinch: () => tone({ f: 260, to: 180, dur: 0.12, type: 'square', gain: 0.06 }),
  superSweet: () => [659, 784, 988, 1319, 1568].forEach((f, i) => tone({ f, dur: 0.18, at: i * 0.045, type: 'square', gain: 0.07 })),
  naughty: () => {
    tone({ f: 220, to: 110, dur: 0.35, type: 'sawtooth', gain: 0.12 });
    tone({ f: 233, to: 116, dur: 0.35, type: 'sawtooth', gain: 0.1 });
  },
  coal: () => {
    tone({ f: 90, to: 35, dur: 0.5, gain: 0.6 });
    noise({ dur: 0.4, f: 600, to: 150, filter: 'lowpass', gain: 0.4, at: 0.02 });
    for (let i = 0; i < 5; i++) noise({ dur: 0.05, f: 3000, filter: 'bandpass', gain: 0.12, at: 0.08 + i * 0.05 });
  },
  tangle: () => tone({ f: 300, to: 900, dur: 0.25, type: 'triangle', gain: 0.15 }),
  statUp: () => [523, 659, 784].forEach((f, i) => tone({ f, dur: 0.1, at: i * 0.06, type: 'triangle', gain: 0.12 })),
  statDown: () => [784, 659, 523].forEach((f, i) => tone({ f, dur: 0.1, at: i * 0.06, type: 'triangle', gain: 0.12 })),
  heal: () => [784, 988, 1175, 1568].forEach((f, i) => bell(f, i * 0.07, 0.1, 0.6)),
  fizzle: () => noise({ dur: 0.4, f: 4000, to: 800, filter: 'highpass', gain: 0.12 }),
  ko: () => {
    tone({ f: 1200, to: 120, dur: 1.1, type: 'sine', gain: 0.22 }); // slide whistle
    tone({ f: 80, to: 40, dur: 0.6, at: 0.9, gain: 0.5 });
  },
  victory: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => bell(f, i * 0.09, 0.14, 0.6)),
  boxed: () => {
    noise({ dur: 0.35, f: 1500, to: 4000, filter: 'bandpass', q: 0.6, gain: 0.25 });
    tone({ f: 600, to: 1800, dur: 0.25, at: 0.35, type: 'triangle', gain: 0.14 });
    bell(1568, 0.6, 0.15, 0.8);
  },
  callout: () => tone({ f: 220, to: 330, dur: 0.12, type: 'square', gain: 0.06 }),
  round: () => {
    bell(1047, 0, 0.12, 0.4);
    bell(1047, 0.18, 0.12, 0.5);
  },
  type: (t: MoveType) => {
    if (t === 'warm') for (let i = 0; i < 6; i++) noise({ dur: 0.04, f: 2500 + Math.random() * 2000, filter: 'bandpass', q: 3, gain: 0.15, at: i * 0.04 * Math.random() * 2 });
    else if (t === 'frost') [2093, 2637, 3136].forEach((f, i) => bell(f, i * 0.04, 0.08, 0.5));
    else if (t === 'pine') [0, 0.08].forEach((at, i) => tone({ f: i ? 1100 : 880, dur: 0.06, at, type: 'square', gain: 0.1 }));
    else if (t === 'spark') tone({ f: 120, to: 2400, dur: 0.18, type: 'sawtooth', gain: 0.09 });
    else bell(1320, 0, 0.1, 0.3);
  },
};

// ── optional voice-over ─────────────────────────────────────
const voBuffers = new Map<string, AudioBuffer>();
let voLoaded = false;

/** Loads /vo/manifest.json (a list of clip ids) if present. Silent no-op otherwise. */
export async function loadVoiceOver(base = `${import.meta.env.BASE_URL}vo/`) {
  if (voLoaded) return;
  voLoaded = true;
  try {
    const res = await fetch(`${base}manifest.json`);
    if (!res.ok) return;
    const ids = (await res.json()) as string[];
    const c = ac();
    if (!c) return;
    await Promise.all(
      ids.map(async (id) => {
        const r = await fetch(`${base}${id}.mp3`);
        if (r.ok) voBuffers.set(id, await c.decodeAudioData(await r.arrayBuffer()));
      }),
    );
  } catch {
    /* VO is optional */
  }
}

export function voice(id: string) {
  const c = ac();
  const b = voBuffers.get(id);
  if (!c || !master || !b) return;
  const src = c.createBufferSource();
  src.buffer = b;
  src.connect(master);
  src.start();
}
