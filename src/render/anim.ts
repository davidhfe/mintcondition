/** Tiny tween system driven by the stage's game clock (so slow-mo and hit-stop apply). */

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  outBack: (t: number) => {
    const c1 = 2.2;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inBack: (t: number) => 2.7 * t * t * t - 1.7 * t * t,
  outElastic: (t: number) => (t === 0 || t === 1 ? t : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

interface Tw {
  start: number;
  dur: number;
  update: (k: number) => void;
  ease: Ease;
  twos: boolean;
  resolve: () => void;
}

/** Animation "on twos": 12 drawings a second, the Spider-Verse cadence. */
export const TWOS_FPS = 12;
export const onTwos = (t: number) => Math.floor(t * TWOS_FPS) / TWOS_FPS;

export class Tweens {
  now = 0;
  private list: Tw[] = [];

  to(dur: number, update: (k: number) => void, e: Ease = ease.outCubic, twos = false): Promise<void> {
    return new Promise((resolve) => {
      if (dur <= 0) {
        update(1);
        resolve();
        return;
      }
      this.list.push({ start: this.now, dur, update, ease: e, twos, resolve });
    });
  }

  wait(dur: number): Promise<void> {
    return this.to(dur, () => {}, ease.linear);
  }

  tick(now: number) {
    this.now = now;
    const done: Tw[] = [];
    for (const tw of this.list) {
      const el = tw.twos ? onTwos(now - tw.start) : now - tw.start;
      const k = Math.min(1, el / tw.dur);
      tw.update(tw.ease(k));
      if (now - tw.start >= tw.dur) done.push(tw);
    }
    if (done.length) {
      this.list = this.list.filter((t) => !done.includes(t));
      for (const t of done) {
        t.update(t.ease(1));
        t.resolve();
      }
    }
  }

  /** Finish everything immediately (used when leaving a screen). */
  flush() {
    const l = this.list;
    this.list = [];
    for (const t of l) {
      t.update(t.ease(1));
      t.resolve();
    }
  }
}

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
