import { CANDY, GOLD, INK, SPRUCE } from '../palette';
import { brow, eyes, mouth, pivot, wave, type ToyBuilder } from './rig';

/** Oddrey — night-shift elf, topped it up. Clipboard, singed eyebrows, permanent soot. */
export const oddrey: ToyBuilder = (k, body) => {
  const skin = k.mat(0xf3c9a4);
  const tunic = k.mat(SPRUCE);
  const red = k.mat(CANDY);
  const soot = k.mat(0x3a3344);
  const fig = pivot(body, [0, 0, 0]);
  // curly-toed boots
  for (const s of [-1, 1]) {
    const boot = pivot(fig, [s * 0.2, 0.12, 0.05]);
    k.sphere([0.16, 0.12, 0.26], red, boot, {});
    k.cone(0.06, 0.25, red, boot, { pos: [0, 0.08, 0.3], rot: [-0.6, 0, 0] });
    k.sphere(0.04, k.mat(GOLD, { gloss: 0.8 }), boot, { pos: [0, 0.2, 0.38], outline: 'thin' });
    k.cyl(0.08, 0.09, 0.4, k.mat(0xfff4e0, { pattern: { kind: 'stripe', color2: CANDY, scale: 9 } }), fig, { pos: [s * 0.2, 0.4, 0] });
  }
  const torso = pivot(fig, [0, 0.95, 0]);
  k.cone(0.48, 0.85, tunic, torso, { pos: [0, -0.05, 0] });
  k.torus(0.2, 0.06, k.mat(GOLD, { gloss: 0.6 }), torso, { pos: [0, -0.15, 0], rot: [Math.PI / 2, 0, 0], scale: [1.6, 1.4, 1] });
  // clipboard, held up like a shield
  const arm = pivot(torso, [0.3, 0.15, 0.15], [0, 0, -0.5]);
  k.capsule(0.07, 0.28, tunic, arm, { pos: [0, -0.15, 0] });
  const board = pivot(torso, [0.12, 0.0, 0.42], [-0.25, -0.3, 0.1]);
  k.box(0.42, 0.55, 0.04, k.mat(0x9a5a33), board, { r: 0.02 });
  k.box(0.34, 0.44, 0.02, k.mat(0xfffdf6), board, { pos: [0, -0.03, 0.03], r: 0.005, outline: 'thin' });
  k.box(0.14, 0.06, 0.05, k.mat(0xd8dde8, { gloss: 1 }), board, { pos: [0, 0.27, 0.03], r: 0.01, outline: 'thin' });
  for (let i = 0; i < 4; i++) k.box(0.24, 0.015, 0.01, k.mat(INK), board, { pos: [-0.02, 0.1 - i * 0.08, 0.045], outline: false, r: 0 });
  const armL = pivot(torso, [-0.3, 0.15, 0.05], [0, 0, 0.6]);
  k.capsule(0.07, 0.3, tunic, armL, { pos: [0, -0.18, 0] });
  k.sphere(0.08, skin, armL, { pos: [0, -0.4, 0] });
  // head
  const head = pivot(fig, [0, 1.58, 0.02]);
  k.sphere([0.36, 0.34, 0.33], skin, head, {});
  for (const s of [-1, 1]) k.cone(0.09, 0.38, skin, head, { pos: [s * 0.38, 0.08, -0.02], rot: [0, 0, s * -1.2] });
  k.sphere([0.08, 0.07, 0.08], k.mat(0xffa98f), head, { pos: [0, -0.04, 0.33], outline: 'thin' });
  eyes(k, head, { x: 0.13, y: 0.08, z: 0.28, size: 0.075, style: 'cartoon', look: [0, 0.1] });
  // singed: half an eyebrow each, plus soot
  brow(k, head, [-0.12, 0.2, 0.3], 0.08, 0.1);
  brow(k, head, [0.15, 0.21, 0.29], 0.06, -0.3);
  for (const [x, y] of [[-0.2, -0.1], [0.22, 0.02], [0.05, 0.25]] as const) k.sphere([0.06, 0.04, 0.02], soot, head, { pos: [x, y, 0.31], outline: false });
  mouth(k, head, [0, -0.17, 0.3], 0.13, 'flat');
  // hat: a long floppy cone with a smoking bell
  const hat = pivot(head, [0, 0.22, -0.02], [-0.15, 0, -0.12]);
  k.torus(0.31, 0.07, k.mat(0xfff4e0), hat, { rot: [Math.PI / 2, 0, 0] });
  const tip = pivot(hat, [0, 0.05, 0], [0, 0, 0]);
  k.cone(0.3, 0.75, red, tip, { pos: [0, 0.37, 0] });
  const bell = pivot(tip, [0, 0.78, 0]);
  k.sphere(0.08, k.mat(GOLD, { gloss: 0.9 }), bell, { outline: 'thin' });
  return {
    parts: { fig, torso, head, tip, armL },
    height: 2.55,
    headY: 1.6,
    badge: { parent: torso, pos: [-0.25, 0.1, 0.35], scale: 0.5 },
    idle(t, p) {
      p.tip!.rotation.z = wave(t, 0.4) * 0.12;
      p.head!.rotation.y = wave(t, 0.2) * 0.15;
      p.armL!.rotation.z = 0.6 + wave(t, 0.5) * 0.06;
    },
  };
};
