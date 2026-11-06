/**
 * Portraits and thumbnails rendered by the same comic pipeline (so the UI and
 * the 3D stage can never drift apart stylistically). Cached as data URLs.
 */
import * as THREE from 'three';
import type { ArenaId } from '../core/types';
import { toy } from '../core/data/toys';
import { buildToy } from '../render/toys';
import { arenaSet } from '../render/sets';
import { Kit } from '../render/kit';
import { PLAYER_RIM, TYPE_COLOR } from '../render/palette';
import { stage } from './store';

const cache = new Map<string, string>();
const waiting = new Map<string, ((url: string) => void)[]>();
const queue: (() => void)[] = [];
let busy = false;

function pump() {
  if (busy) return;
  const job = queue.shift();
  if (!job) return;
  busy = true;
  setTimeout(() => {
    job();
    busy = false;
    pump();
  }, 0);
}

function request(key: string, make: () => string): Promise<string> {
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve) => {
    const list = waiting.get(key);
    if (list) {
      list.push(resolve);
      return;
    }
    waiting.set(key, [resolve]);
    queue.push(() => {
      const url = make();
      cache.set(key, url);
      for (const r of waiting.get(key) ?? []) r(url);
      waiting.delete(key);
    });
    pump();
  });
}

const shade = (c: number, k: number) => new THREE.Color(c).multiplyScalar(k).getHex();

export function portrait(toyId: string, deluxe = false): Promise<string> {
  return request(`p:${toyId}:${deluxe}`, () => {
    const t = toy(toyId);
    const rig = buildToy(toyId, PLAYER_RIM[0]);
    rig.setDeluxe(deluxe);
    rig.root.rotation.y = 0.45;
    rig.idle(0);
    const root = new THREE.Group();
    root.add(rig.root);
    const k = new Kit(0xffe9a8);
    k.cyl(1.6, 1.6, 0.2, k.mat(0xfff4e0), root, { pos: [0, -0.1, 0] });
    const h = rig.height;
    const tc = TYPE_COLOR[t.type];
    return stage().snapshot(
      { root, bg: { a: shade(tc, 1.0), b: shade(tc, 0.55), dot: shade(tc, 0.35), dotAmt: 0.7, burst: 0.6 } },
      { pos: [0.3, h * 0.55, 4 + h * 1.15], look: [0, h * 0.47, 0], fov: 32 },
      300,
      340,
    );
  });
}

export function thumbnail(id: ArenaId): Promise<string> {
  return request(`a:${id}`, () => {
    const set = arenaSet(id);
    return stage().snapshot(set, { pos: [0, 4.2, 12.5], look: [0, 1.6, -3], fov: 40 }, 480, 270);
  });
}

/** Any stage set → cached image (story panels). */
export function sceneShot(key: string, make: () => import('../render/stage').StageSet, shot: import('../render/stage').Shot, w: number, h: number): Promise<string> {
  return request(`s:${key}`, () => stage().snapshot(make(), shot, w, h));
}
