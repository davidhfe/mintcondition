import * as THREE from 'three';
import { CANDY, INK, GOLD, SPRUCE } from '../palette';
import { brow, eyes, mouth, pivot, wave, type ToyBuilder } from './rig';

/** Big Ted — retired from boxing. Unretired for boxing. Sweatband, stitched patch, button eyes. */
export const bigTed: ToyBuilder = (k, body) => {
  const fur = k.mat(0xc7843d);
  const cream = k.mat(0xf7dfb8);
  const band = k.mat(CANDY);
  const patch = k.mat(0x6fa8a0);

  for (const s of [-1, 1]) {
    const leg = pivot(body, [s * 0.4, 0.26, 0.12]);
    k.sphere([0.34, 0.27, 0.42], fur, leg, {});
    k.sphere([0.2, 0.2, 0.06], cream, leg, { pos: [0, 0, 0.4], outline: 'thin' });
  }
  const torso = pivot(body, [0, 0.98, 0]);
  k.sphere([0.8, 0.86, 0.7], fur, torso, {});
  k.sphere([0.5, 0.56, 0.3], cream, torso, { pos: [0, -0.1, 0.48] });
  const sq = k.box(0.28, 0.28, 0.06, patch, torso, { pos: [-0.42, 0.34, 0.5], rot: [0, -0.5, 0.15], r: 0.03 });
  for (let i = 0; i < 4; i++) k.box(0.07, 0.015, 0.02, k.mat(INK), sq, { pos: [-0.1 + i * 0.065, 0.15, 0.03], rot: [0, 0, 1.2], outline: false, r: 0 });

  const arms: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const sh = pivot(torso, [s * 0.68, 0.38, 0.08], [0, 0, s * 0.35]);
    k.sphere([0.26, 0.48, 0.27], fur, sh, { pos: [0, -0.36, 0] });
    k.sphere([0.16, 0.14, 0.06], cream, sh, { pos: [0, -0.66, 0.2], rot: [0.4, 0, 0], outline: 'thin' });
    arms.push(sh);
  }

  const head = pivot(body, [0, 2.0, 0.02]);
  k.sphere([0.66, 0.6, 0.6], fur, head, {});
  for (const s of [-1, 1]) {
    const ear = pivot(head, [s * 0.5, 0.44, -0.06], [0, 0, s * -0.3]);
    k.sphere([0.26, 0.26, 0.15], fur, ear, {});
    k.sphere([0.15, 0.15, 0.06], cream, ear, { pos: [0, 0, 0.11], outline: 'thin' });
  }
  k.sphere([0.36, 0.27, 0.27], cream, head, { pos: [0, -0.18, 0.48] });
  k.sphere([0.13, 0.09, 0.09], k.mat(INK, { gloss: 0.9 }), head, { pos: [0, -0.06, 0.74], outline: false });
  mouth(k, head, [0, -0.3, 0.72], 0.16, 'flat');
  eyes(k, head, { x: 0.25, y: 0.12, z: 0.52, size: 0.085, style: 'button' });
  brow(k, head, [-0.26, 0.28, 0.55], 0.18, -0.25);
  brow(k, head, [0.26, 0.28, 0.55], 0.18, 0.25);
  k.torus(0.6, 0.075, band, head, { pos: [0, 0.24, -0.02], rot: [Math.PI / 2 - 0.12, 0, 0.08], scale: [1.06, 1, 1] });

  return {
    parts: { torso, head, armL: arms[0]!, armR: arms[1]! },
    height: 2.75,
    headY: 2.0,
    badge: { parent: torso, pos: [0.38, 0.38, 0.58], scale: 0.9 },
    idle(t, p) {
      p.torso!.scale.set(1 + wave(t, 0.5) * 0.02, 1 - wave(t, 0.5) * 0.02, 1);
      p.head!.rotation.z = wave(t, 0.25) * 0.06;
      p.armL!.rotation.x = wave(t, 0.5) * 0.08;
      p.armR!.rotation.x = -wave(t, 0.5) * 0.08;
    },
  };
};

/** Ginger Snap — fast, knows it. A flat cookie with piped icing and a smug grin. */
export const gingerSnap: ToyBuilder = (k, body) => {
  const dough = k.mat(0xbf6f33, { shade: 0x6e2f22 });
  const icing = k.mat(0xfffaf0, { shade: 0xcfd3ee });
  const s = new THREE.Shape();
  // classic gingerbread silhouette (head + arms + legs), centred at origin
  s.moveTo(-0.22, -1.05);
  s.quadraticCurveTo(-0.5, -1.1, -0.52, -0.95);
  s.lineTo(-0.36, -0.2);
  s.quadraticCurveTo(-0.7, -0.05, -0.82, 0.15);
  s.quadraticCurveTo(-0.85, 0.36, -0.62, 0.36);
  s.lineTo(-0.3, 0.3);
  s.quadraticCurveTo(-0.5, 0.55, -0.42, 0.82);
  s.quadraticCurveTo(-0.3, 1.15, 0, 1.16);
  s.quadraticCurveTo(0.3, 1.15, 0.42, 0.82);
  s.quadraticCurveTo(0.5, 0.55, 0.3, 0.3);
  s.lineTo(0.62, 0.36);
  s.quadraticCurveTo(0.85, 0.36, 0.82, 0.15);
  s.quadraticCurveTo(0.7, -0.05, 0.36, -0.2);
  s.lineTo(0.52, -0.95);
  s.quadraticCurveTo(0.5, -1.1, 0.22, -1.05);
  s.lineTo(0, -0.55);
  s.closePath();
  const cookie = pivot(body, [0, 1.12, 0]);
  k.extrude(s, 0.26, dough, cookie, { bevel: 0.06 });
  const front = 0.2;
  // piped icing squiggles on wrists and ankles
  for (const [x, y, r] of [[-0.66, 0.17, 1.3], [0.66, 0.17, -1.3], [-0.42, -0.86, 0.3], [0.42, -0.86, -0.3]] as const) {
    const g = pivot(cookie, [x, y, front], [0, 0, r]);
    for (let i = 0; i < 3; i++) k.capsule(0.03, 0.12, icing, g, { pos: [(i - 1) * 0.07, 0, 0], rot: [0, 0, 0.5], outline: false });
  }
  // gumdrop buttons
  const gum = [k.mat(CANDY, { gloss: 0.7 }), k.mat(0x3fae6a, { gloss: 0.7 }), k.mat(GOLD, { gloss: 0.7 })];
  [0.12, -0.12, -0.36].forEach((y, i) => k.sphere([0.085, 0.085, 0.05], gum[i]!, cookie, { pos: [0, y, front], outline: 'thin' }));
  // piped icing border following the silhouette
  const pts = s.getSpacedPoints(70);
  const border = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x * 0.86, p.y * 0.9 + 0.02, front + 0.02)), true);
  k.part(new THREE.TubeGeometry(border, 160, 0.022, 6, true), icing, cookie, { outline: false });
  const face = pivot(cookie, [0, 0.78, front]);
  eyes(k, face, { x: 0.15, y: 0.06, z: 0.03, size: 0.09, style: 'lidded', lid: 0.38, lidTilt: -0.15, glowColor: 0xa85c2a, look: [0.7, 0.1] });
  mouth(k, face, [0.04, -0.18, 0.03], 0.3, 'smirk', 0xfffaf0);
  return {
    parts: { cookie, face },
    height: 2.35,
    headY: 1.85,
    badge: { parent: cookie, pos: [0.3, 0.05, 0.2], scale: 0.7 },
    idle(t, p) {
      p.cookie!.rotation.z = wave(t, 1) * 0.05;
      p.cookie!.position.y = 1.12 + Math.abs(wave(t, 1)) * 0.06;
    },
  };
};

/** Chuggs — runs on coal, has made peace with it. Headlamp eyes, cow-catcher moustache. */
export const chuggs: ToyBuilder = (k, body) => {
  const red = k.mat(CANDY, { gloss: 0.5 });
  const green = k.mat(SPRUCE, { gloss: 0.4 });
  const black = k.mat(0x2a2233, { gloss: 0.5 });
  const gold = k.mat(GOLD, { gloss: 0.8 });
  const train = pivot(body, [0, 0, -0.1]);
  // wheels
  const wheels: THREE.Group[] = [];
  for (const z of [0.55, -0.05, -0.65])
    for (const s of [-1, 1]) {
      const w = pivot(train, [s * 0.5, 0.32, z], [0, 0, Math.PI / 2]);
      k.cyl(0.32, 0.32, 0.12, black, w, {});
      k.cyl(0.12, 0.12, 0.14, gold, w, { outline: 'thin' });
      wheels.push(w);
    }
  k.box(0.95, 0.18, 1.8, black, train, { pos: [0, 0.6, -0.05] });
  // boiler (along z) and cab
  const boiler = pivot(train, [0, 1.08, 0.25], [Math.PI / 2, 0, 0]);
  k.cyl(0.46, 0.46, 1.2, red, boiler, {});
  for (const y of [-0.35, 0.42]) k.torus(0.465, 0.035, gold, boiler, { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0], outline: false });
  const cab = pivot(train, [0, 1.3, -0.65]);
  k.box(1.0, 1.1, 0.7, green, cab, {});
  k.box(1.15, 0.12, 0.85, black, cab, { pos: [0, 0.6, 0] });
  for (const s of [-1, 1]) k.box(0.02, 0.35, 0.35, k.mat(0xffe9a8, { glow: true }), cab, { pos: [s * 0.505, 0.15, 0], outline: 'thin' });
  // smokestack
  const stack = pivot(train, [0, 1.52, 0.6]);
  k.cyl(0.14, 0.14, 0.5, black, stack, {});
  k.cyl(0.26, 0.14, 0.26, black, stack, { pos: [0, 0.35, 0] });
  // face on the smokebox door: big headlamp eyes, grumpy lids, a push-broom moustache
  const face = pivot(train, [0, 1.08, 0.86]);
  k.cyl(0.44, 0.44, 0.1, k.mat(0x4a4258), face, { rot: [Math.PI / 2, 0, 0] });
  eyes(k, face, { x: 0.19, y: 0.1, z: 0.08, size: 0.15, style: 'lidded', lid: 0.38, lidTilt: 0.3, glowColor: CANDY, look: [0, -0.2] });
  const stache = pivot(face, [0, -0.17, 0.1]);
  for (const sx of [-1, 1]) k.capsule(0.08, 0.2, k.mat(0xe9e2d6), stache, { pos: [sx * 0.13, 0, 0], rot: [0, 0, sx * 1.25] });
  const catcher = pivot(train, [0, 0.5, 0.98], [0.35, 0, 0]);
  for (let i = -2; i <= 2; i++) k.box(0.07, 0.36, 0.06, red, catcher, { pos: [i * 0.13, 0, 0], rot: [0, 0, -i * 0.12], r: 0.02 });
  return {
    parts: { train, stack, face, wheels: wheels[0]!, ...Object.fromEntries(wheels.map((w, i) => [`w${i}`, w])) },
    height: 2.1,
    headY: 1.2,
    badge: { parent: cab, pos: [0.52, -0.1, 0.1], scale: 0.8 },
    idle(t, p) {
      p.train!.position.y = Math.abs(wave(t, 2)) * 0.03;
      p.stack!.scale.y = 1 + Math.abs(wave(t, 2)) * 0.08;
    },
  };
};

