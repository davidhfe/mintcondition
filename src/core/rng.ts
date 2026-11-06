/**
 * Deterministic RNG (mulberry32). State is a plain uint32 so it can live inside
 * serialisable battle state and be replayed exactly.
 */
export interface RngHolder {
  rng: number;
}

export function nextFloat(h: RngHolder): number {
  let t = (h.rng = (h.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function range(h: RngHolder, lo: number, hi: number): number {
  return lo + (hi - lo) * nextFloat(h);
}

export function int(h: RngHolder, lo: number, hiInclusive: number): number {
  return lo + Math.floor(nextFloat(h) * (hiInclusive - lo + 1));
}

export function pick<T>(h: RngHolder, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('pick from empty array');
  return arr[Math.floor(nextFloat(h) * arr.length)] as T;
}

/** Approximately normal via sum of uniforms (Irwin–Hall, n=4). */
export function gauss(h: RngHolder, mean: number, sd: number): number {
  const s = nextFloat(h) + nextFloat(h) + nextFloat(h) + nextFloat(h) - 2;
  return mean + s * sd * Math.sqrt(3);
}

export function seedFrom(x: number | string): number {
  if (typeof x === 'number') return x >>> 0;
  let h = 2166136261;
  for (let i = 0; i < x.length; i++) h = Math.imul(h ^ x.charCodeAt(i), 16777619);
  return h >>> 0;
}
