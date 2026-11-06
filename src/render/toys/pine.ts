import * as THREE from 'three';
import { CANDY, GOLD, INK } from '../palette';
import { starShape } from '../kit';
import { brow, eyes, mouth, pivot, wave, type ToyBuilder } from './rig';

/** Colonel Crunch — 4,000 walnuts. Shako, epaulettes, a jaw that works. */
export const colonelCrunch: ToyBuilder = (k, body) => {
  const red = k.mat(CANDY, { gloss: 0.35 });
  const black = k.mat(0x241b30, { gloss: 0.6 });
  const white = k.mat(0xf6f0e4);
  const skin = k.mat(0xf2c9a1, { gloss: 0.25 });
  const gold = k.mat(GOLD, { gloss: 0.8 });
  const fig = pivot(body, [0, 0, 0]);
  for (const s of [-1, 1]) {
    k.box(0.3, 0.38, 0.42, black, fig, { pos: [s * 0.2, 0.19, 0.04], r: 0.06 });
    k.cyl(0.13, 0.13, 0.55, white, fig, { pos: [s * 0.2, 0.62, 0] });
  }
  const torso = pivot(fig, [0, 1.25, 0]);
  k.cyl(0.42, 0.46, 0.85, red, torso, {});
  k.cyl(0.47, 0.47, 0.1, k.mat(0x241b30), torso, { pos: [0, -0.32, 0] });
  k.box(0.14, 0.1, 0.04, gold, torso, { pos: [0, -0.32, 0.47], r: 0.02 });
  for (let i = 0; i < 3; i++) k.sphere(0.045, gold, torso, { pos: [0, 0.22 - i * 0.17, 0.43], outline: 'thin' });
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) k.capsule(0.02, 0.18, gold, torso, { pos: [s * (0.1 + i * 0.002), 0.22 - i * 0.17, 0.425], rot: [0, 0, Math.PI / 2], outline: false });
  const arms: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const sh = pivot(torso, [s * 0.52, 0.3, 0], [0, 0, s * 0.12]);
    k.cyl(0.16, 0.06, 0.12, gold, sh, { pos: [0, 0.08, 0], scale: [1.3, 1, 1] });
    k.cyl(0.12, 0.12, 0.65, red, sh, { pos: [0, -0.28, 0] });
    k.sphere(0.13, white, sh, { pos: [0, -0.66, 0.02] });
    arms.push(sh);
  }
  const head = pivot(fig, [0, 2.05, 0]);
  k.box(0.6, 0.62, 0.56, skin, head, { r: 0.12 });
  // jaw: the business end
  const jaw = pivot(head, [0, -0.3, 0.05]);
  k.box(0.56, 0.2, 0.5, skin, jaw, { pos: [0, -0.06, 0], r: 0.06 });
  for (let i = -2; i <= 2; i++) k.box(0.09, 0.08, 0.04, white, jaw, { pos: [i * 0.1, 0.02, 0.26], outline: 'thin', r: 0.015 });
  k.box(0.62, 0.3, 0.44, white, jaw, { pos: [0, -0.24, -0.04], r: 0.12 });
  for (const s of [-1, 1]) {
    k.capsule(0.07, 0.2, white, head, { pos: [s * 0.15, -0.12, 0.3], rot: [0, 0, s * 1.1] });
    k.sphere([0.08, 0.06, 0.03], k.mat(0xff8f9a), head, { pos: [s * 0.2, -0.04, 0.28], outline: false });
    k.sphere([0.1, 0.2, 0.14], white, head, { pos: [s * 0.32, 0.02, -0.05] });
  }
  eyes(k, head, { x: 0.14, y: 0.12, z: 0.28, size: 0.085, style: 'cartoon', look: [0, 0] });
  brow(k, head, [-0.15, 0.25, 0.3], 0.17, -0.35);
  brow(k, head, [0.15, 0.25, 0.3], 0.17, 0.35);
  k.sphere([0.07, 0.06, 0.08], skin, head, { pos: [0, 0.0, 0.3] });
  // shako
  const hat = pivot(head, [0, 0.52, -0.02]);
  k.cyl(0.33, 0.31, 0.5, black, hat, {});
  k.cyl(0.335, 0.335, 0.08, gold, hat, { pos: [0, -0.2, 0] });
  k.extrude(starShape(5, 0.13, 0.06), 0.04, gold, hat, { pos: [0, 0.02, 0.32] });
  k.sphere([0.09, 0.2, 0.09], red, hat, { pos: [0, 0.4, 0] });
  k.box(0.5, 0.05, 0.22, black, hat, { pos: [0, -0.24, 0.24], rot: [0.2, 0, 0], r: 0.02 });
  return {
    parts: { fig, torso, head, jaw, hat, armL: arms[0]!, armR: arms[1]! },
    height: 3.05,
    headY: 2.05,
    badge: { parent: torso, pos: [-0.25, 0.18, 0.43], scale: 0.7 },
    idle(t, p) {
      p.jaw!.position.y = -0.3 - Math.max(0, wave(t, 0.5)) * 0.03;
      p.fig!.rotation.y = wave(t, 0.2) * 0.04;
      p.armL!.rotation.x = wave(t, 0.5) * 0.04;
    },
  };
};

/** Dobbin — goes nowhere, takes his time. Rockers, yarn mane, deadpan lids. */
export const dobbin: ToyBuilder = (k, body) => {
  const hide = k.mat(0xf4ead8);
  const spot = k.mat(0xb9aec9);
  const red = k.mat(CANDY, { gloss: 0.4 });
  const wood = k.mat(0x9a5a33, { gloss: 0.3 });
  const gold = k.mat(GOLD, { gloss: 0.8 });
  const rock = pivot(body, [0, 0, 0]);
  // rockers: shallow arcs
  for (const s of [-1, 1]) {
    const arc = pivot(rock, [s * 0.36, 2.6, 0]);
    k.torus(2.5, 0.1, red, arc, { arc: Math.PI * 0.3, rot: [0, Math.PI / 2, Math.PI * 1.35], scale: [1, 1, 1.6] });
  }
  k.box(0.9, 0.06, 0.14, wood, rock, { pos: [0, 0.16, 0.85], r: 0.02 });
  k.box(0.9, 0.06, 0.14, wood, rock, { pos: [0, 0.16, -0.85], r: 0.02 });
  const horse = pivot(rock, [0, 1.15, 0]);
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) k.cyl(0.08, 0.07, 0.95, hide, horse, { pos: [sx * 0.24, -0.5, sz * 0.5], rot: [sz * -0.15, 0, sx * 0.1] });
  k.capsule(0.38, 0.85, hide, horse, { rot: [Math.PI / 2, 0, 0] });
  for (const [x, y, z] of [[0.3, 0.12, 0.2], [-0.22, 0.2, -0.3], [0.25, -0.05, -0.45], [-0.33, -0.1, 0.35]] as const)
    k.sphere([0.1, 0.08, 0.1], spot, horse, { pos: [x * 1.05, y, z], outline: false });
  // saddle + blanket
  k.box(0.85, 0.08, 0.6, red, horse, { pos: [0, 0.35, -0.05], r: 0.03 });
  k.box(0.5, 0.14, 0.42, k.mat(0x6b3b26, { gloss: 0.3 }), horse, { pos: [0, 0.44, -0.05], r: 0.06 });
  for (const s of [-1, 1]) k.box(0.02, 0.3, 0.55, red, horse, { pos: [s * 0.4, 0.2, -0.05], r: 0.01 });
  // neck + head
  const neck = pivot(horse, [0, 0.25, 0.55], [-0.55, 0, 0]);
  k.capsule(0.22, 0.55, hide, neck, { pos: [0, 0.35, 0] });
  const head = pivot(neck, [0, 0.8, 0.05], [1.0, 0, 0]);
  k.capsule(0.22, 0.6, hide, head, { pos: [0, 0, 0.25], rot: [Math.PI / 2, 0, 0] });
  k.sphere([0.23, 0.2, 0.18], k.mat(0xb9aec9), head, { pos: [0, -0.04, 0.66] });
  for (const s of [-1, 1]) {
    k.sphere([0.03, 0.02, 0.02], k.mat(INK), head, { pos: [s * 0.09, -0.02, 0.83], outline: false });
    k.cone(0.07, 0.2, hide, head, { pos: [s * 0.12, 0.25, -0.05], rot: [-0.3, 0, s * -0.2] });
  }
  eyes(k, head, { x: 0.19, y: 0.12, z: 0.05, size: 0.07, style: 'lidded', lid: 0.55, lidTilt: 0, glowColor: 0xe8dcc8, look: [0.4, -0.2] });
  // yarn mane + tail
  const mane = k.mat(CANDY);
  for (let i = 0; i < 6; i++) k.sphere(0.11, mane, neck, { pos: [0, 0.05 + i * 0.15, -0.2 + i * 0.01], outline: 'thin' });
  k.sphere(0.12, mane, head, { pos: [0, 0.22, 0.02], outline: 'thin' });
  const tail = pivot(horse, [0, 0.15, -0.8], [-0.8, 0, 0]);
  k.capsule(0.09, 0.35, mane, tail, { pos: [0, -0.2, 0] });
  // bridle
  k.torus(0.22, 0.03, gold, head, { pos: [0, -0.02, 0.5], scale: [1.05, 0.95, 1], outline: false });
  return {
    parts: { rock, horse, head, neck, tail },
    height: 2.65,
    headY: 2.1,
    badge: { parent: horse, pos: [0.42, 0.15, 0.2], scale: 0.7 },
    idle(t, p) {
      const a = wave(t, 0.33) * 0.09;
      p.rock!.rotation.x = a;
      p.rock!.position.z = -a * 1.2;
      p.tail!.rotation.x = -0.8 + wave(t, 0.33, 1) * 0.1;
    },
  };
};

/** Jack — wound up since 1987. Star-printed box, crank, spring, jester. */
export const jack: ToyBuilder = (k, body) => {
  const blue = k.mat(0x2f4fb3, { gloss: 0.3 });
  const red = k.mat(CANDY, { gloss: 0.3 });
  const gold = k.mat(GOLD, { gloss: 0.8 });
  const box = pivot(body, [0, 0.5, 0]);
  k.box(1.0, 1.0, 1.0, blue, box, { r: 0.05 });
  for (const [rx, ry, rz, px, py, pz] of [[0, 0, 0, 0, 0, 0.505], [0, Math.PI / 2, 0, 0.505, 0, 0], [0, -Math.PI / 2, 0, -0.505, 0, 0]] as const)
    k.extrude(starShape(5, 0.28, 0.12), 0.02, gold, box, { pos: [px, py, pz], rot: [rx, ry, rz], outline: 'thin', bevel: 0.005 });
  k.box(1.06, 0.08, 1.06, red, box, { pos: [0, 0.5, 0], r: 0.02 });
  const lid = pivot(box, [0, 0.52, -0.5], [-2.1, 0, 0]);
  k.box(1.0, 0.07, 1.0, red, lid, { pos: [0, 0, 0.5], r: 0.02 });
  const crank = pivot(box, [0.52, 0.05, 0], [0, 0, 0]);
  k.cyl(0.05, 0.05, 0.25, gold, crank, { pos: [0.1, 0, 0], rot: [0, 0, Math.PI / 2], outline: 'thin' });
  const arm = pivot(crank, [0.22, 0, 0]);
  k.box(0.05, 0.32, 0.06, gold, arm, { pos: [0, 0.13, 0], r: 0.02 });
  k.cyl(0.05, 0.05, 0.16, red, arm, { pos: [0.06, 0.28, 0], rot: [0, 0, Math.PI / 2] });
  // spring (helix)
  const spring = pivot(body, [0, 1.0, 0]);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2 * 5;
    pts.push(new THREE.Vector3(Math.cos(a) * 0.17, (i / 120) * 0.7, Math.sin(a) * 0.17));
  }
  k.part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.035, 6, false), k.mat(0xd8dde8, { gloss: 0.9 }), spring, { outline: 'thin' });
  const head = pivot(spring, [0, 0.95, 0.02]);
  k.cyl(0.32, 0.18, 0.18, k.mat(0xfff4e0), head, { pos: [0, -0.32, 0] });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.sphere([0.13, 0.06, 0.1], i % 2 ? red : k.mat(0xfff4e0), head, { pos: [Math.cos(a) * 0.3, -0.32, Math.sin(a) * 0.3], outline: 'thin' });
  }
  k.sphere([0.36, 0.38, 0.34], k.mat(0xfbe3cf), head, {});
  k.sphere(0.08, red, head, { pos: [0, -0.03, 0.34], outline: 'thin' });
  eyes(k, head, { x: 0.13, y: 0.1, z: 0.28, size: 0.1, style: 'cartoon', look: [0.2, 0.3] });
  mouth(k, head, [0, -0.17, 0.3], 0.26, 'smile', 0x8c1d3a);
  // jester hat
  for (const s of [-1, 1]) {
    const h = pivot(head, [s * 0.14, 0.24, 0], [0, 0, s * -0.9]);
    k.cone(0.17, 0.55, s < 0 ? red : k.mat(0x3fae6a), h, { pos: [0, 0.25, 0] });
    k.sphere(0.07, gold, h, { pos: [0, 0.55, 0], outline: 'thin' });
  }
  return {
    parts: { box, spring, head, crank: arm, lid },
    height: 2.6,
    headY: 1.95,
    badge: { parent: box, pos: [-0.3, -0.15, 0.52], scale: 0.7 },
    idle(t, p) {
      p.spring!.scale.y = 1 + wave(t, 1.2) * 0.08;
      p.head!.rotation.z = wave(t, 0.6) * 0.12;
      p.crank!.rotation.x = t * 3;
    },
  };
};

