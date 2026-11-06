import * as THREE from 'three';
import { CANDY, GOLD, INK } from '../palette';
import { starShape } from '../kit';
import { brow, eyes, mouth, pivot, wave, type ToyBuilder } from './rig';

/** Sprocket — tin wind-up middle manager. Visor eyes, rivets, a necktie. */
export const sprocket: ToyBuilder = (k, body) => {
  const tin = k.mat(0x9db4cf, { gloss: 0.75 });
  const tinDark = k.mat(0x5f7594, { gloss: 0.6 });
  const gold = k.mat(GOLD, { gloss: 0.85 });
  const fig = pivot(body, [0, 0, 0]);
  for (const s of [-1, 1]) {
    k.box(0.26, 0.5, 0.3, tinDark, fig, { pos: [s * 0.24, 0.3, 0], r: 0.05 });
    k.box(0.34, 0.12, 0.46, tin, fig, { pos: [s * 0.24, 0.06, 0.06], r: 0.04 });
  }
  const torso = pivot(fig, [0, 1.0, 0]);
  k.box(1.0, 0.9, 0.7, tin, torso, { r: 0.1 });
  k.box(0.62, 0.5, 0.06, tinDark, torso, { pos: [0, 0.02, 0.35], r: 0.04 });
  // the tie
  k.box(0.16, 0.1, 0.06, k.mat(CANDY), torso, { pos: [0, 0.32, 0.39], r: 0.02 });
  const tie = new THREE.Shape();
  tie.moveTo(-0.06, 0);
  tie.lineTo(0.06, 0);
  tie.lineTo(0.1, -0.4);
  tie.lineTo(0, -0.5);
  tie.lineTo(-0.1, -0.4);
  tie.closePath();
  k.extrude(tie, 0.03, k.mat(CANDY), torso, { pos: [0, 0.27, 0.4], bevel: 0.01 });
  for (const [x, c] of [[-0.22, 0x7cf27c], [0.22, 0xffd23f]] as const) k.cyl(0.07, 0.07, 0.05, k.mat(c, { glow: true }), torso, { pos: [x, 0.12, 0.38], rot: [Math.PI / 2, 0, 0], outline: 'thin' });
  for (const [x, y] of [[-0.44, 0.38], [0.44, 0.38], [-0.44, -0.38], [0.44, -0.38]] as const) k.sphere(0.035, gold, torso, { pos: [x, y, 0.33], outline: false });
  // wind-up key
  const key = pivot(torso, [0, 0.05, -0.36]);
  k.cyl(0.05, 0.05, 0.2, gold, key, { rot: [Math.PI / 2, 0, 0], pos: [0, 0, -0.08] });
  for (const s of [-1, 1]) k.torus(0.13, 0.04, gold, key, { pos: [s * 0.14, 0, -0.2], rot: [0, 0, 0] });
  const arms: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const sh = pivot(torso, [s * 0.56, 0.25, 0], [0, 0, s * 0.25]);
    k.sphere(0.12, gold, sh, { outline: 'thin' });
    k.cyl(0.08, 0.08, 0.55, tinDark, sh, { pos: [0, -0.3, 0] });
    const claw = pivot(sh, [0, -0.62, 0], [0, Math.PI / 2, 0]);
    k.torus(0.1, 0.035, tin, claw, { arc: Math.PI * 1.4, rot: [0, 0, Math.PI * 0.8] });
    arms.push(sh);
  }
  const head = pivot(fig, [0, 1.82, 0]);
  k.box(0.78, 0.6, 0.62, tin, head, { r: 0.12 });
  k.box(0.66, 0.24, 0.06, k.mat(0x221a30, { gloss: 0.9 }), head, { pos: [0, 0.06, 0.31], r: 0.06 });
  eyes(k, head, { x: 0.16, y: 0.06, z: 0.34, size: 0.075, style: 'glow', glowColor: 0xffe066, squash: 0.75 });
  for (let i = 0; i < 4; i++) k.box(0.32, 0.025, 0.02, k.mat(0x221a30), head, { pos: [0, -0.13 - i * 0.045, 0.31], outline: false, r: 0.005 });
  for (const s of [-1, 1]) k.cyl(0.09, 0.09, 0.08, gold, head, { pos: [s * 0.41, 0.02, 0], rot: [0, 0, Math.PI / 2], outline: 'thin' });
  const ant = pivot(head, [0, 0.3, 0]);
  k.cyl(0.02, 0.02, 0.3, tinDark, ant, { pos: [0, 0.15, 0], outline: 'thin' });
  const bulb = k.sphere(0.07, k.mat(CANDY, { glow: true }), ant, { pos: [0, 0.32, 0], outline: 'thin' });
  return {
    parts: { fig, torso, head, key, bulb, armL: arms[0]!, armR: arms[1]! },
    height: 2.55,
    headY: 1.85,
    badge: { parent: torso, pos: [0.33, 0.25, 0.38], scale: 0.7 },
    idle(t, p) {
      p.key!.rotation.z = t * 2.5;
      p.fig!.position.y = Math.abs(wave(t, 1)) * 0.03;
      p.bulb!.visible = Math.floor(t * 2) % 3 !== 0;
      p.head!.rotation.y = wave(t, 0.15) * 0.1;
    },
  };
};

/** Cymon — knows one song. Fez, vest, two very loud cymbals. */
export const cymon: ToyBuilder = (k, body) => {
  const fur = k.mat(0x8a5634);
  const face = k.mat(0xf2cfa3);
  const vest = k.mat(CANDY, { gloss: 0.3 });
  const gold = k.mat(GOLD, { gloss: 0.9 });
  const fig = pivot(body, [0, 0, 0]);
  for (const s of [-1, 1]) {
    k.capsule(0.13, 0.35, fur, fig, { pos: [s * 0.22, 0.3, 0] });
    k.sphere([0.16, 0.08, 0.22], face, fig, { pos: [s * 0.22, 0.06, 0.08] });
  }
  const torso = pivot(fig, [0, 0.95, 0]);
  k.sphere([0.45, 0.5, 0.4], fur, torso, {});
  k.sphere([0.3, 0.36, 0.2], face, torso, { pos: [0, -0.05, 0.28] });
  for (const s of [-1, 1]) k.box(0.28, 0.6, 0.06, vest, torso, { pos: [s * 0.28, 0.02, 0.32], rot: [0, s * 0.5, 0], r: 0.03 });
  for (let i = 0; i < 2; i++) k.sphere(0.035, gold, torso, { pos: [0.18, 0.12 - i * 0.18, 0.42], outline: false });
  const arms: THREE.Group[] = [];
  const cymbals: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const sh = pivot(torso, [s * 0.42, 0.25, 0.05], [0, 0, s * 1.2]);
    k.capsule(0.1, 0.4, fur, sh, { pos: [0, -0.3, 0] });
    const c = pivot(sh, [0, -0.62, 0.05], [0, 0, -s * 1.2]);
    const yaw = pivot(c, [0, 0, 0], [0, s * 0.55, 0]);
    const disc = pivot(yaw, [0, 0, 0], [Math.PI / 2, 0, 0]);
    k.lathe([[0.0, -0.02], [0.4, -0.06], [0.38, -0.04], [0.1, 0.0], [0.08, 0.04], [0, 0.03]], gold, disc, {});
    arms.push(sh);
    cymbals.push(c);
  }
  const head = pivot(fig, [0, 1.62, 0.02]);
  k.sphere([0.4, 0.38, 0.36], fur, head, {});
  for (const s of [-1, 1]) {
    k.sphere([0.14, 0.15, 0.08], fur, head, { pos: [s * 0.4, 0.04, 0] });
    k.sphere([0.08, 0.09, 0.04], face, head, { pos: [s * 0.42, 0.04, 0.06], outline: false });
  }
  k.sphere([0.3, 0.27, 0.2], face, head, { pos: [0, -0.06, 0.24] });
  eyes(k, head, { x: 0.13, y: 0.08, z: 0.36, size: 0.1, style: 'cartoon', look: [0, 0.2] });
  const grin = pivot(head, [0, -0.15, 0.42]);
  k.sphere([0.17, 0.08, 0.04], k.mat(0x8c1d3a), grin, { outline: 'thin' });
  for (let i = -2; i <= 2; i++) k.box(0.05, 0.05, 0.02, k.mat(0xfffdf6), grin, { pos: [i * 0.055, 0.035, 0.035], outline: false, r: 0.01 });
  const fez = pivot(head, [0.05, 0.36, 0], [0, 0, -0.18]);
  k.cyl(0.13, 0.17, 0.24, vest, fez, {});
  k.cyl(0.01, 0.01, 0.1, k.mat(INK), fez, { pos: [0.06, 0.13, 0], rot: [0, 0, -0.8], outline: false });
  k.sphere([0.04, 0.09, 0.04], gold, fez, { pos: [0.13, 0.08, 0], outline: 'thin' });
  return {
    parts: { fig, torso, head, armL: arms[0]!, armR: arms[1]!, cymL: cymbals[0]!, cymR: cymbals[1]! },
    height: 2.15,
    headY: 1.62,
    badge: { parent: torso, pos: [-0.25, 0.15, 0.4], scale: 0.65 },
    idle(t, p) {
      const c = Math.max(0, wave(t, 0.7));
      p.armL!.rotation.z = -1.2 + c * 0.25;
      p.armR!.rotation.z = 1.2 - c * 0.25;
      p.head!.rotation.z = wave(t, 0.35) * 0.08;
    },
  };
};

/** Chatterbox — no body, no filter. Gums, teeth, feet, wind-up key, googly eyes. */
export const chatterbox: ToyBuilder = (k, body) => {
  const gum = k.mat(0xf06d8a, { gloss: 0.5 });
  const tooth = k.mat(0xfffdf6, { gloss: 0.5, shade: 0xb9b7d6 });
  const shoe = k.mat(0xff8c2a, { gloss: 0.4 });
  const gold = k.mat(GOLD, { gloss: 0.85 });
  const fig = pivot(body, [0, 0, 0]);
  for (const s of [-1, 1]) {
    k.capsule(0.05, 0.25, k.mat(0xfff4e0), fig, { pos: [s * 0.3, 0.2, 0] });
    k.sphere([0.2, 0.12, 0.3], shoe, fig, { pos: [s * 0.3, 0.08, 0.1] });
  }
  const jawLow = pivot(fig, [0, 0.55, 0]);
  k.capsule(0.28, 0.75, gum, jawLow, { rot: [0, 0, Math.PI / 2], scale: [1, 1, 1.3] });
  for (let i = -3; i <= 3; i++) k.box(0.13, 0.17, 0.1, tooth, jawLow, { pos: [i * 0.15, 0.22, 0.25 - Math.abs(i) * 0.03], r: 0.03, outline: 'thin' });
  const jawUp = pivot(fig, [0, 0.95, -0.25]);
  const upper = pivot(jawUp, [0, 0, 0.25]);
  k.capsule(0.3, 0.75, gum, upper, { rot: [0, 0, Math.PI / 2], scale: [1, 1, 1.3] });
  for (let i = -3; i <= 3; i++) k.box(0.13, 0.17, 0.1, tooth, upper, { pos: [i * 0.15, -0.22, 0.26 - Math.abs(i) * 0.03], r: 0.03, outline: 'thin' });
  // googly eyes on stalks
  for (const s of [-1, 1]) {
    const st = pivot(upper, [s * 0.25, 0.25, 0.05], [0, 0, s * -0.2]);
    k.cyl(0.03, 0.03, 0.22, gum, st, { pos: [0, 0.1, 0], outline: 'thin' });
    eyes(k, st, { x: 0, y: 0.32, z: 0, size: 0.14, style: 'cartoon', look: [s * 0.5, 0.4] }).left.visible = false;
  }
  const key = pivot(fig, [0.62, 0.75, 0], [0, 0, 0]);
  k.cyl(0.04, 0.04, 0.2, gold, key, { rot: [0, 0, Math.PI / 2] });
  k.torus(0.12, 0.035, gold, key, { pos: [0.18, 0, 0], rot: [0, Math.PI / 2, 0] });
  k.torus(0.12, 0.035, gold, key, { pos: [0.18, 0, 0], rot: [Math.PI / 2, Math.PI / 2, 0] });
  return {
    parts: { fig, jawUp, key },
    height: 1.75,
    headY: 1.05,
    badge: { parent: jawLow, pos: [-0.5, -0.05, 0.3], scale: 0.6 },
    idle(t, p) {
      p.jawUp!.rotation.x = -Math.abs(wave(t, 2.5)) * 0.25;
      p.fig!.position.y = Math.abs(wave(t, 2.5)) * 0.05;
      p.key!.rotation.x = t * 4;
    },
  };
};

