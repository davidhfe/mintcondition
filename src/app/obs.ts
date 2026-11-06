import { useEffect, useState } from 'preact/hooks';

/** Minimal observable value: the controller writes, components read via useObs. */
export class Obs<T> {
  private subs = new Set<(v: T) => void>();
  constructor(private v: T) {}
  get(): T {
    return this.v;
  }
  set(v: T) {
    this.v = v;
    for (const s of this.subs) s(v);
  }
  update(fn: (v: T) => T) {
    this.set(fn(this.v));
  }
  subscribe(fn: (v: T) => void): () => void {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }
}

export function useObs<T>(o: Obs<T>): T {
  const [v, setV] = useState(o.get());
  useEffect(() => {
    setV(o.get());
    return o.subscribe(setV);
  }, [o]);
  return v;
}
