import * as THREE from 'three';
import { CANDY, GOLD, INK } from '../palette';
import { starShape } from '../kit';
import { brow, eyes, mouth, pivot, wave, type ToyBuilder } from './rig';

/** Dame Flurry — shaken, not stirred. Glass globe, gold base, tiara, lashes. */
export const dameFlurry: ToyBuilder = (k, body) => {
  const gold = k.mat(GOLD, { gloss: 0.85 });
  const plum = k.mat(0x7a1f4a, { gloss: 0.4 });
  const fig = pivot(body, [0, 0, 0]);
  k.lathe([[0, 0], [0.75, 0], [0.8, 0.08], [0.72, 0.18], [0.6, 0.3], [0.62, 0.5], [0.5, 0.58], [0, 0.58]], gold, fig, {});
  k.box(0.5, 0.18, 0.06, plum, fig, { pos: [0, 0.32, 0.6], rot: [-0.1, 0, 0], r: 0.03 });
  const globe = pivot(fig, [0, 1.38, 0]);
  // interior diorama
  k.sphere([0.75, 0.25, 0.75], k.mat(0xffffff, { shade: 0xa8c4ee }), globe, { pos: [0, -0.62, 0] });
  const tree = pivot(globe, [0.22, -0.45, -0.15]);
  for (let i = 0; i < 3; i++) k.cone(0.24 - i * 0.06, 0.28, k.mat(0x1f7a5c), tree, { pos: [0, 0.15 + i * 0.15, 0], outline: 'thin' });
  const flakes = pivot(globe, [0, 0, 0]);
  const flakeMat = k.mat(0xffffff, { glow: true });
  for (let i = 0; i < 16; i++) {
    const a = i * 2.4;
    const r = 0.25 + (i % 4) * 0.12;
    k.sphere(0.035, flakeMat, flakes, { pos: [Math.cos(a) * r, -0.3 + ((i * 0.37) % 0.9), Math.sin(a) * r], outline: false });
  }
  // glass: no ink hull (its back faces would fill the globe); the ID pass inks the silhouette
  k.sphere(0.92, k.mat(0xbfeaff, { gloss: 0.9, opacity: 0.3, shade: 0x8fc4ee }), globe, { outline: false });
  // face painted on the glass
  const face = pivot(globe, [0, 0.12, 0.86]);
  eyes(k, face, { x: 0.22, y: 0.05, z: 0.0, size: 0.11, style: 'lidded', lid: 0.35, lidTilt: -0.1, glowColor: 0xbfeaff, look: [-0.3, 0.1] });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.box(0.1, 0.02, 0.02, k.mat(INK), face, { pos: [s * (0.31 + i * 0.03), 0.17 - i * 0.04, 0.03], rot: [0, 0, s * (0.4 + i * 0.35)], outline: false, r: 0.005 });
  const lips = pivot(face, [0, -0.25, 0.0]);
  k.sphere([0.11, 0.05, 0.04], k.mat(CANDY, { gloss: 0.8 }), lips, { pos: [0, 0.03, 0], outline: 'thin' });
  k.sphere([0.1, 0.045, 0.04], k.mat(CANDY, { gloss: 0.8 }), lips, { pos: [0, -0.03, 0], outline: 'thin' });
  // tiara
  const tiara = pivot(globe, [0, 0.86, 0.05], [-0.15, 0, 0]);
  k.torus(0.28, 0.035, gold, tiara, { rot: [Math.PI / 2, 0, 0] });
  for (let i = -2; i <= 2; i++) {
    const a = (i / 2) * 0.9;
    k.cone(0.05, 0.18 - Math.abs(i) * 0.03, gold, tiara, { pos: [Math.sin(a) * 0.28, 0.08, Math.cos(a) * 0.28], outline: 'thin' });
  }
  k.sphere(0.06, k.mat(0xff7ab6, { gloss: 0.9 }), tiara, { pos: [0, 0.1, 0.3], outline: 'thin' });
  return {
    parts: { fig, globe, flakes, face },
    height: 2.55,
    headY: 1.45,
    badge: { parent: fig, pos: [0.42, 0.32, 0.5], scale: 0.6 },
    idle(t, p) {
      p.flakes!.rotation.y = t * 0.6;
      p.flakes!.position.y = wave(t, 0.25) * 0.05;
      p.globe!.rotation.z = wave(t, 0.3) * 0.03;
    },
  };
};

/** Slick — fastest thing on ice. Penguin, skates, scarf, unbearable lids. */
export const slick: ToyBuilder = (k, body) => {
  const black = k.mat(0x22223a, { gloss: 0.3 });
  const white = k.mat(0xfbf8f2);
  const orange = k.mat(0xff9a2a, { gloss: 0.4 });
  const scarf = k.mat(0x24b3a8);
  const silver = k.mat(0xd8e0ee, { gloss: 1.0 });
  const fig = pivot(body, [0, 0, 0]);
  for (const s of [-1, 1]) {
    const sk = pivot(fig, [s * 0.24, 0, 0.05]);
    k.box(0.22, 0.28, 0.4, white, sk, { pos: [0, 0.3, 0], r: 0.08 });
    k.box(0.04, 0.06, 0.6, silver, sk, { pos: [0, 0.08, 0.05], r: 0.015 });
    k.cyl(0.02, 0.02, 0.16, silver, sk, { pos: [0, 0.12, 0.18], outline: false });
    k.cyl(0.02, 0.02, 0.16, silver, sk, { pos: [0, 0.12, -0.12], outline: false });
  }
  const torso = pivot(fig, [0, 0.95, 0]);
  k.sphere([0.52, 0.62, 0.46], black, torso, {});
  k.sphere([0.38, 0.5, 0.3], white, torso, { pos: [0, -0.05, 0.22] });
  const flips: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const f = pivot(torso, [s * 0.48, 0.15, 0], [0, 0, s * 0.35]);
    k.sphere([0.1, 0.38, 0.2], black, f, { pos: [0, -0.28, 0] });
    flips.push(f);
  }
  const head = pivot(fig, [0, 1.62, 0.02]);
  k.sphere([0.4, 0.38, 0.38], black, head, {});
  k.sphere([0.3, 0.22, 0.2], white, head, { pos: [0, 0.03, 0.24] });
  k.cone(0.09, 0.3, orange, head, { pos: [0, -0.06, 0.48], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.7] });
  eyes(k, head, { x: 0.13, y: 0.05, z: 0.37, size: 0.085, style: 'lidded', lid: 0.55, lidTilt: -0.2, glowColor: 0xfbf8f2, look: [0.6, 0] });
  // scarf
  k.torus(0.36, 0.08, scarf, fig, { pos: [0, 1.38, 0], rot: [Math.PI / 2, 0, 0] });
  const tail = pivot(fig, [0.2, 1.36, -0.3], [0.4, 0, 0]);
  k.box(0.16, 0.42, 0.06, scarf, tail, { pos: [0, -0.2, 0], r: 0.03 });
  for (let i = 0; i < 3; i++) k.box(0.03, 0.06, 0.03, scarf, tail, { pos: [-0.05 + i * 0.05, -0.43, 0], outline: false, r: 0.01 });
  return {
    parts: { fig, torso, head, tail, flipL: flips[0]!, flipR: flips[1]! },
    height: 2.1,
    headY: 1.62,
    badge: { parent: torso, pos: [0.3, 0.2, 0.33], scale: 0.6 },
    idle(t, p) {
      p.fig!.rotation.z = wave(t, 0.5) * 0.05;
      p.fig!.position.x = wave(t, 0.25) * 0.05;
      p.tail!.rotation.x = 0.4 + wave(t, 1) * 0.25;
      p.flipL!.rotation.z = -0.35 - Math.max(0, wave(t, 0.5)) * 0.2;
    },
  };
};

/** Abner — big, soft, slightly damp. Yeti, beanie, permanent sweat drop. */
export const abner: ToyBuilder = (k, body) => {
  const fur = k.mat(0xf1f6ff, { shade: 0x8d9fd6 });
  const face = k.mat(0x9db3dd);
  const horn = k.mat(0xd9cfc0);
  const hat = k.mat(CANDY);
  const fig = pivot(body, [0, 0, 0]);
  for (const s of [-1, 1]) k.sphere([0.32, 0.18, 0.45], fur, fig, { pos: [s * 0.4, 0.14, 0.12] });
  const torso = pivot(fig, [0, 1.15, 0]);
  k.sphere([0.88, 0.95, 0.78], fur, torso, {});
  for (const [x, y, z, r] of [[0.7, 0.4, 0.2, 0.3], [-0.72, 0.35, 0.2, 0.3], [0.55, -0.6, 0.35, 0.28], [-0.55, -0.62, 0.35, 0.28], [0.0, 0.8, 0.3, 0.32]] as const)
    k.sphere(r, fur, torso, { pos: [x, y, z], ink: undefined });
  const arms: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const sh = pivot(torso, [s * 0.75, 0.3, 0.1], [0, 0, s * 0.18]);
    k.capsule(0.22, 0.7, fur, sh, { pos: [0, -0.5, 0] });
    k.sphere([0.22, 0.16, 0.24], face, sh, { pos: [0, -0.95, 0.05] });
    arms.push(sh);
  }
  const head = pivot(fig, [0, 1.6, 0.48]);
  k.sphere([0.48, 0.42, 0.25], face, head, {});
  eyes(k, head, { x: 0.16, y: 0.08, z: 0.2, size: 0.075, style: 'cartoon', look: [0, -0.2] });
  brow(k, head, [-0.17, 0.2, 0.22], 0.14, 0.2);
  brow(k, head, [0.17, 0.2, 0.22], 0.14, -0.2);
  mouth(k, head, [0, -0.14, 0.23], 0.16, 'flat');
  for (const s of [-1, 1]) k.cone(0.08, 0.28, horn, fig, { pos: [s * 0.5, 2.05, 0.05], rot: [0, 0, s * -0.6] });
  const beanie = pivot(fig, [0, 2.12, 0.05]);
  k.sphere([0.5, 0.32, 0.48], hat, beanie, {});
  k.torus(0.48, 0.07, k.mat(0xfff4e0), beanie, { pos: [0, -0.05, 0], rot: [Math.PI / 2, 0, 0] });
  k.sphere(0.15, k.mat(0xfff4e0), beanie, { pos: [0, 0.32, 0] });
  const drop = pivot(fig, [0.5, 2.0, 0.55]);
  k.sphere([0.07, 0.1, 0.05], k.mat(0x7fd8ff, { gloss: 1 }), drop, { outline: 'thin' });
  k.cone(0.06, 0.1, k.mat(0x7fd8ff, { gloss: 1 }), drop, { pos: [0, 0.1, 0], outline: 'thin' });
  return {
    parts: { fig, torso, head, beanie, drop, armL: arms[0]!, armR: arms[1]! },
    height: 2.6,
    headY: 1.65,
    badge: { parent: torso, pos: [-0.45, 0.2, 0.68], scale: 0.85 },
    idle(t, p) {
      p.torso!.scale.set(1 + wave(t, 0.4) * 0.025, 1 - wave(t, 0.4) * 0.02, 1);
      p.armL!.rotation.z = -0.18 - wave(t, 0.4) * 0.05;
      p.armR!.rotation.z = 0.18 + wave(t, 0.4) * 0.05;
      p.drop!.position.y = 2.0 - ((t * 0.5) % 1) * 0.15;
    },
  };
};

/** The Topper — will not come down. Frankly, a star. */
export const topper: ToyBuilder = (k, body) => {
  const gold = k.mat(GOLD, { gloss: 0.9, shade: 0xb3561d });
  const fig = pivot(body, [0, 0, 0]);
  const tip = pivot(fig, [0, 0, 0]);
  k.cone(0.55, 1.1, k.mat(0x1f7a5c), tip, { pos: [0, 0.55, 0] });
  const spiral: THREE.Vector3[] = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    spiral.push(new THREE.Vector3(Math.cos(t * 14) * 0.5 * (1 - t), t * 1.05 + 0.02, Math.sin(t * 14) * 0.5 * (1 - t)));
  }
  k.part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral), 160, 0.03, 6), gold, tip, { outline: 'thin' });
  const star = pivot(fig, [0, 1.95, 0]);
  const rays = pivot(star, [0, 0, -0.3]);
  const rayMat = k.mat(0xfff1b8, { glow: true });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.box(0.08, 0.6 + (i % 2) * 0.35, 0.02, rayMat, rays, { pos: [Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0], rot: [0, 0, a - Math.PI / 2], outline: 'thin', r: 0.02 });
  }
  k.extrude(starShape(5, 1.0, 0.46), 0.3, gold, star, { bevel: 0.08 });
  const face = pivot(star, [0, 0.0, 0.23]);
  eyes(k, face, { x: 0.18, y: 0.1, z: 0.02, size: 0.11, style: 'lidded', lid: 0.4, lidTilt: -0.15, glowColor: GOLD, look: [0, 0] });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.box(0.1, 0.02, 0.02, k.mat(INK), face, { pos: [s * (0.27 + i * 0.03), 0.22 - i * 0.04, 0.05], rot: [0, 0, s * (0.4 + i * 0.35)], outline: false, r: 0.005 });
  mouth(k, face, [0, -0.2, 0.03], 0.24, 'smile');
  return {
    parts: { fig, star, rays, face },
    height: 3.2,
    headY: 1.95,
    badge: { parent: star, pos: [0.45, -0.45, 0.25], scale: 0.7 },
    idle(t, p) {
      p.rays!.rotation.z = t * 0.4;
      p.star!.rotation.z = wave(t, 0.25) * 0.06;
      p.star!.position.y = 1.95 + wave(t, 0.25) * 0.05;
    },
  };
};
