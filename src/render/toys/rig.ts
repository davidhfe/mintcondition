import * as THREE from 'three';
import { Kit, starShape } from '../kit';
import { GOLD, CANDY, INK } from '../palette';

/** What every toy model exposes to the stage and director. */
export interface ToyRig {
  id: string;
  /** World placement + facing. */
  root: THREE.Group;
  /** Pivot at the feet: squash/stretch, lean, hop. */
  body: THREE.Group;
  parts: Record<string, THREE.Object3D>;
  /** Top of the toy, in local units. */
  height: number;
  /** Face height (close-ups, lettering anchor). */
  headY: number;
  kit: Kit;
  idle(t: number): void;
  setDeluxe(on: boolean): void;
}

export interface BuildResult {
  parts: Record<string, THREE.Object3D>;
  height: number;
  headY: number;
  /** Where the Deluxe rosette is pinned. */
  badge: { parent: THREE.Object3D; pos: [number, number, number]; scale?: number };
  idle?(t: number, p: Record<string, THREE.Object3D>): void;
}

export type ToyBuilder = (k: Kit, body: THREE.Group) => BuildResult;

/** "Best in Show" rosette: the Deluxe Edition mark. */
export function rosette(k: Kit, parent: THREE.Object3D, pos: [number, number, number], scale = 1): THREE.Group {
  const g = new THREE.Group();
  g.position.set(...pos);
  g.scale.setScalar(scale);
  parent.add(g);
  const gold = k.mat(GOLD, { gloss: 0.8 });
  const red = k.mat(CANDY);
  k.part(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16, 1).rotateX(Math.PI / 2), gold, g, {});
  k.torus(0.2, 0.04, red, g, {});
  k.extrude(starShape(5, 0.13, 0.06), 0.03, k.mat(0xfff4e0), g, { pos: [0, 0, 0.04], outline: 'thin' });
  k.box(0.09, 0.32, 0.02, red, g, { pos: [-0.07, -0.26, -0.02], rot: [0, 0, 0.25], r: 0.005 });
  k.box(0.09, 0.32, 0.02, red, g, { pos: [0.07, -0.26, -0.02], rot: [0, 0, -0.25], r: 0.005 });
  return g;
}

// ── faces ─────────────────────────────────────────────────

export interface EyeOpts {
  y: number;
  x: number;
  z: number;
  size: number;
  style: 'button' | 'cartoon' | 'lidded' | 'glow';
  /** Pupil offset toward a direction, in eye radii. */
  look?: [number, number];
  lid?: number;
  /** Upper-lid tilt (radians, + = grumpy/inward). */
  lidTilt?: number;
  glowColor?: number;
  squash?: number;
}

export function eyes(k: Kit, parent: THREE.Object3D, o: EyeOpts): { left: THREE.Group; right: THREE.Group } {
  const make = (sx: number) => {
    const g = new THREE.Group();
    g.position.set(sx * o.x, o.y, o.z);
    parent.add(g);
    const s = o.size;
    const sq = o.squash ?? 1;
    if (o.style === 'button') {
      k.sphere([s, s * sq, s * 0.6], k.mat(INK, { gloss: 0.9, shade: 0x05030a }), g, { outline: false });
      k.sphere(s * 0.28, k.mat(0xffffff, { glow: true }), g, { pos: [-s * 0.35, s * 0.35, s * 0.5], outline: false });
      return g;
    }
    if (o.style === 'glow') {
      k.sphere([s, s * sq, s * 0.4], k.mat(o.glowColor ?? 0xffe066, { glow: true }), g, { outline: 'thin' });
      k.sphere(s * 0.25, k.mat(0xffffff, { glow: true }), g, { pos: [-s * 0.3, s * 0.3, s * 0.35], outline: false });
      return g;
    }
    k.sphere([s, s * 1.15 * sq, s * 0.55], k.mat(0xfffdf6, { shade: 0xc9c4e0 }), g, { outline: 'thin' });
    const [lx, ly] = o.look ?? [0, 0];
    const pupil = k.sphere([s * 0.48, s * 0.55 * sq, s * 0.3], k.mat(INK, { shade: 0x05030a }), g, { pos: [lx * s * 0.35 * sx, ly * s * 0.35, s * 0.42], outline: false });
    k.sphere(s * 0.16, k.mat(0xffffff, { glow: true }), pupil, { pos: [-0.35, 0.4, 0.8], scale: [0.35 / 0.48, 0.35 / 0.55, 0.3], outline: false });
    if (o.style === 'lidded') {
      const lid = new THREE.Group();
      lid.rotation.z = (o.lidTilt ?? 0) * -sx;
      g.add(lid);
      const amt = o.lid ?? 0.45;
      k.sphere([s * 1.08, s * 1.22 * sq, s * 0.62], k.mat(o.glowColor ?? 0x8a6a5a), lid, {
        pos: [0, s * 1.22 * sq * (1 - amt * 2) + s * 0.05, 0.01],
        outline: 'thin',
      });
    }
    return g;
  };
  return { left: make(-1), right: make(1) };
}

/** A smile/frown arc in ink. */
export function mouth(k: Kit, parent: THREE.Object3D, pos: [number, number, number], w: number, curve: 'smile' | 'frown' | 'smirk' | 'flat', color = INK) {
  const g = new THREE.Group();
  g.position.set(...pos);
  parent.add(g);
  const m = k.mat(color, { shade: color });
  if (curve === 'flat') {
    k.capsule(w * 0.06, w, m, g, { rot: [0, 0, Math.PI / 2], outline: false });
    return g;
  }
  const arc = curve === 'smirk' ? Math.PI * 0.55 : Math.PI * 0.7;
  const t = k.torus(w * 0.55, w * 0.07, m, g, { arc, outline: false });
  t.rotation.z = curve === 'frown' ? Math.PI * 0.15 + 0 : Math.PI + (Math.PI - arc) / 2;
  if (curve === 'frown') t.rotation.z = (Math.PI - arc) / 2;
  if (curve === 'smirk') t.rotation.z += 0.35;
  return g;
}

export function brow(k: Kit, parent: THREE.Object3D, pos: [number, number, number], w: number, angle: number, color = INK) {
  return k.box(w, w * 0.22, w * 0.2, k.mat(color, { shade: color }), parent, { pos, rot: [0, 0, angle], outline: false, r: w * 0.08 });
}

/** An unscaled transform node, so children don't inherit a part's squash. */
export function pivot(parent: THREE.Object3D, pos: [number, number, number] = [0, 0, 0], rot: [number, number, number] = [0, 0, 0]): THREE.Group {
  const g = new THREE.Group();
  g.position.set(...pos);
  g.rotation.set(...rot);
  parent.add(g);
  return g;
}

export const wave = (t: number, speed = 1, phase = 0) => Math.sin(t * speed * Math.PI * 2 + phase);
