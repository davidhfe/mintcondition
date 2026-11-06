/**
 * Arena sets: toy-theatre dioramas. A platform the two toys stand on, props,
 * and cut-out backdrop layers at a few depths so camera moves get real parallax.
 */
import * as THREE from 'three';
import type { ArenaId } from '../core/types';
import { Kit, starShape } from './kit';
import { CANDY, GOLD, INK, SPRUCE } from './palette';
import type { StageSet } from './stage';
import { pivot } from './toys/rig';

export interface ArenaSet extends StageSet {
  /** Where each side's toy stands. */
  mounts: [THREE.Vector3, THREE.Vector3];
}

const W = 0xfff4e0;

function giftBox(k: Kit, parent: THREE.Object3D, pos: [number, number, number], size: [number, number, number], color: number, ribbon: number, rotY = 0) {
  const g = pivot(parent, pos, [0, rotY, 0]);
  const [w, h, d] = size;
  k.box(w, h, d, k.mat(color), g, { pos: [0, h / 2, 0], r: Math.min(w, h, d) * 0.05 });
  const rb = k.mat(ribbon, { gloss: 0.5 });
  k.box(w * 0.16, h + 0.02, d + 0.02, rb, g, { pos: [0, h / 2, 0], outline: 'thin', r: 0.01 });
  k.box(w + 0.02, h + 0.02, d * 0.16, rb, g, { pos: [0, h / 2, 0], outline: 'thin', r: 0.01 });
  for (const s of [-1, 1]) k.torus(Math.min(w, d) * 0.16, Math.min(w, d) * 0.05, rb, g, { pos: [s * w * 0.12, h + 0.05, 0], rot: [0, 0, s * 0.6], scale: [1, 0.7, 0.6] });
  return g;
}

function pineTree(k: Kit, parent: THREE.Object3D, pos: [number, number, number], h: number, snow = true) {
  const g = pivot(parent, pos);
  const green = k.mat(0x1f6f55);
  const white = k.mat(0xffffff, { shade: 0x9bb6e6 });
  k.cyl(h * 0.06, h * 0.08, h * 0.2, k.mat(0x6b3b26), g, { pos: [0, h * 0.1, 0] });
  for (let i = 0; i < 3; i++) {
    const r = h * (0.36 - i * 0.08);
    const y = h * (0.35 + i * 0.22);
    k.cone(r, h * 0.38, green, g, { pos: [0, y, 0] });
    if (snow) k.cone(r * 0.55, h * 0.16, white, g, { pos: [0, y + h * 0.12, 0], outline: 'thin' });
  }
  return g;
}

/** Falling snow (instanced, flat glow, inked by the ID pass). */
function snowfall(k: Kit, parent: THREE.Object3D, count: number, area: [number, number, number], center: [number, number, number]) {
  const geo = new THREE.SphereGeometry(1, 8, 6);
  const mesh = new THREE.InstancedMesh(geo, k.mat(0xffffff, { glow: true }), count);
  mesh.userData.inkId = 9999;
  const seeds = Array.from({ length: count }, (_, i) => ({ x: ((i * 7919) % 1000) / 1000, y: ((i * 104729) % 1000) / 1000, z: ((i * 1299709) % 1000) / 1000, s: 0.03 + ((i * 31) % 10) / 300 }));
  const m = new THREE.Matrix4();
  const update = (t: number) => {
    seeds.forEach((p, i) => {
      const y = (((p.y - t * 0.06 * (0.6 + p.s * 10)) % 1) + 1) % 1;
      m.makeScale(p.s, p.s, p.s).setPosition(center[0] + (p.x - 0.5) * area[0] + Math.sin(t + i) * 0.2, center[1] + (y - 0.5) * area[1], center[2] + (p.z - 0.5) * area[2]);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  parent.add(mesh);
  return update;
}

// ── The Bakery — Cookie Bake-Off ─────────────────────────────
function bakery(k: Kit, root: THREE.Group): Partial<ArenaSet> {
  k.part(new THREE.PlaneGeometry(80, 60).rotateX(-Math.PI / 2), k.mat(0xfff0d6, { pattern: { kind: 'checker', color2: 0xf2b8a0, scale: 0.6 } }), root, { pos: [0, -0.6, 0], outline: false });
  // cake stand
  const stand = pivot(root, [0, 0, 0]);
  k.cyl(4.6, 4.6, 0.32, k.mat(0xffe8f0), stand, { pos: [0, -0.16, 0] });
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    k.sphere([0.32, 0.2 + (i % 3) * 0.08, 0.2], k.mat(0xff9fbf), stand, { pos: [Math.cos(a) * 4.55, -0.12, Math.sin(a) * 4.55], rot: [0, -a, 0], outline: 'thin' });
  }
  k.cyl(1.2, 1.6, 0.5, k.mat(GOLD, { gloss: 0.7 }), stand, { pos: [0, -0.55, 0] });
  // oven
  const oven = pivot(root, [-6.2, -0.6, -6]);
  k.box(4.2, 4.6, 2.2, k.mat(0x3b2b4f), oven, { pos: [0, 2.3, 0], r: 0.25 });
  k.box(2.8, 1.8, 0.1, k.mat(0xff9b3d, { glow: true }), oven, { pos: [0, 2.2, 1.12], r: 0.2 });
  k.box(3.0, 0.18, 0.3, k.mat(GOLD, { gloss: 0.8 }), oven, { pos: [0, 3.4, 1.2], r: 0.08 });
  for (let i = 0; i < 4; i++) k.cyl(0.18, 0.18, 0.12, k.mat(0xfff4e0), oven, { pos: [-1.2 + i * 0.8, 3.95, 1.15], rot: [Math.PI / 2, 0, 0] });
  // shelf of jars
  const shelf = pivot(root, [6.5, -0.6, -6.5]);
  k.box(4.6, 0.25, 1.2, k.mat(0x9a5a33), shelf, { pos: [0, 2.6, 0] });
  k.box(4.6, 0.25, 1.2, k.mat(0x9a5a33), shelf, { pos: [0, 4.6, 0] });
  const jarCols = [0xffd23f, 0xff7a2f, 0x7fd8ff, 0xe8344e, 0x43b56d];
  for (let i = 0; i < 5; i++) {
    for (const y of [2.73, 4.73]) {
      const h = 0.8 + ((i * 3 + y) % 3) * 0.25;
      k.cyl(0.36, 0.36, h, k.mat(jarCols[(i + Math.round(y)) % 5]!, { gloss: 0.5 }), shelf, { pos: [-1.8 + i * 0.9, y + h / 2, 0] });
      k.cyl(0.38, 0.38, 0.14, k.mat(0xfff4e0), shelf, { pos: [-1.8 + i * 0.9, y + h + 0.07, 0] });
    }
  }
  // hanging cookie-cutter stars
  for (const [x, y, z, r] of [[-2.2, 6.2, -5, 0.3], [1.5, 6.8, -6, -0.2], [3.6, 5.6, -4.5, 0.5]] as const) {
    k.cyl(0.015, 0.015, 3, k.mat(INK), root, { pos: [x, y + 1.6, z], outline: false });
    const s = starShape(5, 0.75, 0.35);
    s.holes.push(new THREE.Path(starShape(5, 0.6, 0.25).getPoints()));
    k.extrude(s, 0.1, k.mat(0xd8dde8, { gloss: 0.9 }), root, { pos: [x, y, z], rot: [0, r, 0.2] });
  }
  // giant rolling pin
  const pin = pivot(root, [-6.4, -0.15, -1.2], [0, 1.1, Math.PI / 2]);
  k.cyl(0.45, 0.45, 3.2, k.mat(0xe0a96b), pin, {});
  for (const s of [-1, 1]) k.cyl(0.14, 0.14, 0.9, k.mat(CANDY), pin, { pos: [0, s * 2.0, 0] });
  return { bg: { a: 0xffe6bf, b: 0xff9c5b, dot: 0xd9432f, dotAmt: 0.6, burst: 0.35 } };
}

// ── The Wrapping Room — Wrap Battle ─────────────────────────
function wrapping(k: Kit, root: THREE.Group): Partial<ArenaSet> {
  k.part(new THREE.PlaneGeometry(80, 60).rotateX(-Math.PI / 2), k.mat(0xb7794a, { pattern: { kind: 'checker', color2: 0xa86a3d, scale: 0.35 } }), root, { pos: [0, -0.6, 0], outline: false });
  // giant gift-box platform (we stand on its lid)
  const lid = pivot(root, [0, 0, 0]);
  k.box(8.6, 0.7, 5.4, k.mat(CANDY, { pattern: { kind: 'stripe', color2: 0xc8203a, scale: 1.2 } }), lid, { pos: [0, -0.35, 0], r: 0.12 });
  k.box(0.7, 0.71, 5.41, k.mat(GOLD, { gloss: 0.6 }), lid, { pos: [0, -0.35, 0], r: 0.02, outline: false });
  // paper rolls standing at the back
  const rollCols: [number, number][] = [[0x2ad4e0, 0xfff4e0], [0xff3d8b, 0xffd23f], [0x43b56d, 0xfff4e0], [0xffd23f, 0xe8344e]];
  rollCols.forEach(([a, b], i) => {
    const h = 5 + (i % 2) * 1.6;
    k.cyl(0.75, 0.75, h, k.mat(a, { pattern: { kind: 'stripe', color2: b, scale: 1.4 } }), root, { pos: [-6 + i * 1.7, -0.6 + h / 2, -6.5 - (i % 2)] });
  });
  giftBox(k, root, [6.0, -0.6, -5.5], [2.6, 2.2, 2.4], 0x2f4fb3, GOLD, 0.3);
  giftBox(k, root, [6.3, 1.6, -5.6], [1.6, 1.4, 1.6], 0x43b56d, CANDY, -0.4);
  giftBox(k, root, [4.2, -0.6, -7], [1.8, 1.6, 1.8], 0xffd23f, 0x2f4fb3, 0.6);
  giftBox(k, root, [-6.5, -0.6, 2.4], [1.6, 1.3, 1.6], 0xff3d8b, W, -0.3);
  // giant scissors hanging on the wall
  const sc = pivot(root, [2, 5.5, -8], [0, 0, -0.5]);
  for (const s of [-1, 1]) {
    const blade = pivot(sc, [0, 0, s * 0.05], [0, 0, s * 0.18]);
    k.box(0.35, 3.4, 0.08, k.mat(0xd8dde8, { gloss: 1 }), blade, { pos: [0, 1.6, 0], r: 0.04 });
    k.torus(0.5, 0.13, k.mat(CANDY, { gloss: 0.5 }), blade, { pos: [s * 0.25, -0.55, 0] });
  }
  // ribbon spools
  for (const [x, c] of [[-2.5, 0xff3d8b], [-1.2, 0x2ad4e0]] as const) {
    k.cyl(0.6, 0.6, 0.4, k.mat(c), root, { pos: [x, 7.2, -9], rot: [Math.PI / 2, 0, 0] });
  }
  return { bg: { a: 0xdff7e8, b: 0x2f8f73, dot: SPRUCE, dotAmt: 0.6, burst: 0.3 } };
}

// ── The Roof — Light Show ───────────────────────────────────
function roof(k: Kit, root: THREE.Group): Partial<ArenaSet> & { tick: (t: number) => void } {
  k.part(new THREE.PlaneGeometry(80, 60).rotateX(-Math.PI / 2), k.mat(0x4a3a6b, { pattern: { kind: 'stripe', color2: 0x3d2f5c, scale: 1.6 } }), root, { pos: [0, -0.6, 0], outline: false });
  const deck = pivot(root, [0, 0, 0]);
  k.cyl(4.6, 4.8, 0.4, k.mat(0x5e4a86), deck, { pos: [0, -0.2, 0] });
  k.torus(4.6, 0.16, k.mat(0xffffff, { shade: 0x9bb6e6 }), deck, { pos: [0, 0.02, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.8] });
  // moon
  k.cyl(2.0, 2.0, 0.1, k.mat(0xfff1c4, { glow: true }), root, { pos: [6.5, 6.4, -16], rot: [Math.PI / 2, 0, 0] });
  for (const [x, y, r] of [[6.0, 7.0, 0.4], [7.3, 5.8, 0.3]] as const) k.cyl(r, r, 0.12, k.mat(0xf0dca0, { glow: true }), root, { pos: [x, y, -15.9], rot: [Math.PI / 2, 0, 0], outline: false });
  // chimneys + distant rooftops
  for (const [x, z, h] of [[-7, -7, 2.6], [7.5, -6, 2.0], [-3.5, -10, 3.4]] as const) {
    k.box(1.1, h, 1.1, k.mat(0xb2433d), root, { pos: [x, -0.6 + h / 2, z] });
    for (let r = 0; r < Math.floor(h / 0.5); r++) k.box(1.12, 0.04, 1.12, k.mat(0x7a2a2a), root, { pos: [x, -0.6 + 0.5 * (r + 1), z], outline: false, r: 0 });
    k.box(1.35, 0.25, 1.35, k.mat(0x6b5a7a), root, { pos: [x, -0.6 + h + 0.12, z] });
    k.sphere([0.7, 0.2, 0.7], k.mat(0xffffff, { shade: 0x9bb6e6 }), root, { pos: [x, -0.6 + h + 0.3, z], outline: 'thin' });
  }
  const sky = new THREE.Shape();
  sky.moveTo(-30, 0);
  for (let i = 0; i <= 12; i++) {
    const x = -30 + i * 5;
    sky.lineTo(x, 1.2 + (i % 3) * 0.7);
    sky.lineTo(x + 2.5, 2.2 + (i % 2) * 1.1);
  }
  sky.lineTo(30, 0);
  sky.closePath();
  k.extrude(sky, 0.3, k.mat(0x2a2050), root, { pos: [0, -1, -13] });
  // string lights: two catenaries with glowing bulbs
  const bulbCols = [0xff3d8b, 0xffd23f, 0x2ad4e0, 0x7cf27c, 0xff7a2f];
  const bulbs: THREE.Group[] = [];
  for (const [y, z, x0, x1] of [[5.0, -4, -8, 8], [6.2, -7, -10, 6]] as const) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      pts.push(new THREE.Vector3(x0 + (x1 - x0) * t, y - Math.sin(t * Math.PI) * 1.4, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    k.part(new THREE.TubeGeometry(curve, 60, 0.03, 4), k.mat(0x1a1026), root, { outline: false });
    for (let i = 1; i < 14; i++) {
      const p = curve.getPoint(i / 14);
      const b = k.sphere([0.16, 0.24, 0.16], k.mat(bulbCols[i % 5]!, { glow: true }), root, { pos: [p.x, p.y - 0.25, p.z], outline: 'thin' });
      bulbs.push(b);
    }
  }
  const stars: THREE.Group[] = [];
  for (let i = 0; i < 26; i++) {
    const x = ((i * 7.31) % 36) - 18;
    const y = 6 + ((i * 3.7) % 7);
    stars.push(k.extrude(starShape(4, 0.22, 0.07), 0.04, k.mat(0xfff1c4, { glow: true }), root, { pos: [x, y, -14.5], outline: false, bevel: 0 }));
  }
  const snow = snowfall(k, root, 70, [26, 14, 12], [0, 4, -2]);
  return {
    bg: { a: 0x5b46a8, b: 0x15102e, dot: 0x8a6cf0, dotAmt: 0.45, burst: 0.15 },
    tick(t) {
      const on = Math.floor(t * 2) % 2;
      bulbs.forEach((b, i) => (b.visible = (i + on) % 3 !== 0));
      stars.forEach((s, i) => s.scale.setScalar(0.8 + 0.3 * Math.abs(Math.sin(t * 1.5 + i))));
      snow(t);
    },
  };
}

// ── The Yard — Snowman Build-Off ────────────────────────────
function yard(k: Kit, root: THREE.Group): Partial<ArenaSet> & { tick: (t: number) => void } {
  const snowM = k.mat(0xffffff, { shade: 0x9bb6e6 });
  k.part(new THREE.PlaneGeometry(80, 60).rotateX(-Math.PI / 2), snowM, root, { pos: [0, -0.6, 0], outline: false });
  k.sphere([5.2, 0.9, 4.2], snowM, root, { pos: [0, -0.9, 0] });
  // hills
  for (const [x, z, sx, sy] of [[-9, -12, 9, 4], [7, -14, 11, 5], [0, -18, 14, 6]] as const) k.sphere([sx, sy, 3], snowM, root, { pos: [x, -1, z] });
  // workshop
  const shop = pivot(root, [-5.5, -0.6, -9], [0, 0.35, 0]);
  k.box(5, 3.6, 3, k.mat(0xb2433d), shop, { pos: [0, 1.8, 0] });
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-3, 0);
  roofShape.lineTo(0, 2.4);
  roofShape.lineTo(3, 0);
  roofShape.closePath();
  k.extrude(roofShape, 3.4, k.mat(0x2a2050), shop, { pos: [0, 3.6, 0] });
  k.extrude(roofShape, 3.6, snowM, shop, { pos: [0, 3.85, 0], scale: [1.02, 0.6, 1], outline: 'thin' });
  for (const x of [-1.4, 1.4]) k.box(1.0, 1.1, 0.1, k.mat(0xffd27a, { glow: true }), shop, { pos: [x, 2.1, 1.52], r: 0.08 });
  k.box(1.1, 1.8, 0.1, k.mat(0x6b3b26), shop, { pos: [0, 0.9, 1.52], r: 0.06 });
  // trees
  for (const [x, z, h] of [[5.5, -5, 4.5], [7.5, -8, 5.5], [-8.5, -4.5, 4], [9.5, -3.5, 3.6], [3, -11, 5]] as const) pineTree(k, root, [x, -0.6, z], h);
  // the competition's unfinished snowman
  const sm = pivot(root, [6.2, -0.6, 1.8], [0, -0.5, 0]);
  k.sphere(0.9, snowM, sm, { pos: [0, 0.75, 0] });
  k.sphere(0.65, snowM, sm, { pos: [0, 1.9, 0] });
  k.cone(0.09, 0.5, k.mat(0xff9a2a), sm, { pos: [0.1, 1.95, 0.7], rot: [Math.PI / 2 - 0.2, 0, 0] });
  const snow = snowfall(k, root, 90, [28, 14, 14], [0, 4, -2]);
  return { bg: { a: 0xf4fbff, b: 0x8fc0ea, dot: 0x5a8fd8, dotAmt: 0.45, burst: 0.25 }, tick: snow };
}

// ── The Big Tree — Tree Trimming ────────────────────────────
function tree(k: Kit, root: THREE.Group): Partial<ArenaSet> {
  k.part(new THREE.PlaneGeometry(80, 60).rotateX(-Math.PI / 2), k.mat(0x8a1834, { pattern: { kind: 'checker', color2: 0x7a1430, scale: 0.4 } }), root, { pos: [0, -0.6, 0], outline: false });
  // tree skirt platform
  k.cyl(4.6, 4.9, 0.25, k.mat(CANDY), root, { pos: [0, -0.12, 0] });
  k.torus(4.8, 0.22, k.mat(0xffffff, { shade: 0xc9c4e0 }), root, { pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0] });
  // the tree
  const t = pivot(root, [0, -0.6, -8]);
  k.cyl(0.9, 1.1, 2.5, k.mat(0x6b3b26), t, { pos: [0, 1.2, 0] });
  const ornCols = [CANDY, GOLD, 0x2ad4e0, 0xff3d8b, 0xfff4e0];
  for (let i = 0; i < 4; i++) {
    const r = 6.5 - i * 1.4;
    const y = 3 + i * 3.2;
    k.cone(r, 4.6, k.mat(0x1f6f55), t, { pos: [0, y, 0] });
    for (let j = 0; j < 7 - i; j++) {
      const a = (j / (7 - i)) * Math.PI * 1.1 - Math.PI * 0.05 + i * 0.3;
      const rr = r * 0.78;
      k.sphere(0.42 - i * 0.04, k.mat(ornCols[(i + j) % 5]!, { gloss: 0.9 }), t, { pos: [Math.cos(a) * rr, y - 1.4, Math.sin(a) * rr * 0.9 + 0.5] });
    }
  }
  // presents
  giftBox(k, root, [-6, -0.6, -2.5], [1.8, 1.4, 1.8], 0x2f4fb3, GOLD, 0.4);
  giftBox(k, root, [-4.5, -0.6, -4.2], [1.3, 2.0, 1.3], GOLD, CANDY, -0.2);
  giftBox(k, root, [5.6, -0.6, -3.0], [2.0, 1.2, 1.6], 0x43b56d, W, -0.5);
  giftBox(k, root, [7.0, -0.6, -1.0], [1.2, 1.0, 1.2], 0xff3d8b, GOLD, 0.2);
  return { bg: { a: 0xffd56b, b: 0xc4243b, dot: 0x7a0f2a, dotAmt: 0.55, burst: 0.6 } };
}

const BUILD: Record<ArenaId, (k: Kit, root: THREE.Group) => Partial<ArenaSet> & { tick?: (t: number) => void }> = { bakery, wrapping, roof, yard, tree };

export function arenaSet(id: ArenaId): ArenaSet {
  const k = new Kit(0xffe9a8);
  const root = new THREE.Group();
  const built = BUILD[id](k, root);
  const extra: ((anim: number, game: number) => void)[] = [];
  return {
    root,
    bg: built.bg!,
    mounts: [new THREE.Vector3(-1.9, 0, 0.3), new THREE.Vector3(1.9, 0, 0.3)],
    update(anim, game) {
      built.tick?.(game);
      for (const e of extra) e(anim, game);
    },
  };
}

