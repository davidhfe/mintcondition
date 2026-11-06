/**
 * Dev-only lab.
 *   /lab.html?toys=bigTed,chuggs&deluxe&spin   lineup on a turntable
 *   /lab.html?arena=bakery&toys=bigTed,jack    battle framing in an arena
 */
import * as THREE from 'three';
import { Stage } from './render/stage';
import { buildToy, BUILDERS } from './render/toys';
import { PLAYER_RIM } from './render/palette';
import { comic } from './render/materials';
import { Kit } from './render/kit';
import { arenaSet } from './render/sets';
import type { ArenaId } from './core/types';

const q = new URLSearchParams(location.search);
const ids = (q.get('toys') ?? Object.keys(BUILDERS).join(',')).split(',');
const stage = new Stage(document.getElementById('stage') as HTMLCanvasElement);
const arena = q.get('arena') as ArenaId | null;

if (arena) {
  const set = arenaSet(arena);
  const rigs = ids.slice(0, 2).map((id, i) => {
    const r = buildToy(id, PLAYER_RIM[i]!);
    r.root.position.copy(set.mounts[i]!);
    r.root.rotation.y = i === 0 ? 0.85 : -0.85;
    r.setDeluxe(q.has('deluxe'));
    set.root.add(r.root);
    return r;
  });
  const base = set.update;
  set.update = (a, g, dt) => {
    base?.(a, g, dt);
    rigs.forEach((r) => r.idle(a));
  };
  stage.setSet(set);
  const shot = q.get('shot') ?? 'wide';
  if (shot === 'wide') stage.rig.shot({ pos: [0, 2.6, 10.5], look: [0, 1.35, 0], fov: 32 }, true);
  if (shot === 'high') stage.rig.shot({ pos: [0, 6, 13], look: [0, 1, -2], fov: 34 }, true);
  if (shot === 'a') stage.rig.shot({ pos: [1.2, 2.1, 4.6], look: [-1.9, 1.6, 0.3], fov: 30, roll: 0.08 }, true);
  if (shot === 'b') stage.rig.shot({ pos: [-1.2, 2.1, 4.6], look: [1.9, 1.6, 0.3], fov: 30, roll: -0.08 }, true);
} else {
  const root = new THREE.Group();
  const kit = new Kit(0xffe9a8);
  kit.part(new THREE.CylinderGeometry(ids.length * 1.6 + 1, ids.length * 1.6 + 1, 0.3, 64), comic(0xf3e2c2), root, { pos: [0, -0.15, 0] });
  const rigs = ids.map((id, i) => {
    const r = buildToy(id, PLAYER_RIM[i % 2]!);
    r.root.position.x = (i - (ids.length - 1) / 2) * 2.6;
    r.root.rotation.y = q.has('spin') ? 0 : Number(q.get('ry') ?? 0.35);
    r.setDeluxe(q.has('deluxe'));
    root.add(r.root);
    return r;
  });
  stage.setSet({
    root,
    bg: { a: 0xfff1d6, b: 0xf6c58a, dot: 0xe8344e },
    update(anim, game) {
      for (const r of rigs) {
        r.idle(anim);
        if (q.has('spin')) r.root.rotation.y = game * 0.8;
      }
    },
  });
  const dist = Math.max(8, ids.length * 2.6 * 1.55);
  stage.rig.shot({ pos: [0, 2.2, dist], look: [0, 1.25, 0], fov: 30 }, true);
}
stage.rig.drift = 0;
stage.start();
