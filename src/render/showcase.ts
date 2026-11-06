/** A non-battle arrangement of toys in an arena: title screen, intro panels, ending. */
import * as THREE from 'three';
import type { ArenaId } from '../core/types';
import { arenaSet } from './sets';
import { buildToy } from './toys';
import { PLAYER_RIM } from './palette';
import type { StageSet } from './stage';
import type { ToyRig } from './toys/rig';

export function showcase(arena: ArenaId, toyIds: string[], radius = 3.4, deluxe = false): StageSet & { rigs: ToyRig[] } {
  const set = arenaSet(arena);
  const n = toyIds.length;
  const rigs = toyIds.map((id, i) => {
    const r = buildToy(id, PLAYER_RIM[i % 2]!);
    r.setDeluxe(deluxe);
    const a = n === 1 ? 0 : (i / (n - 1) - 0.5) * Math.PI * 0.75;
    r.root.position.set(Math.sin(a) * radius, 0, -Math.cos(a) * radius * 0.45 + 0.6);
    r.root.rotation.y = -a * 0.6;
    set.root.add(r.root);
    return r;
  });
  const base = set.update;
  return {
    ...set,
    rigs,
    update(anim, game, dt) {
      base?.(anim, game, dt);
      rigs.forEach((r, i) => {
        r.idle(anim + i * 0.37);
        r.body.position.y = Math.max(0, Math.sin((anim + i * 0.5) * Math.PI * 1.2)) * 0.12;
      });
    },
  };
}

export const TITLE_SHOT = { pos: [-2.6, 2.4, 11.5] as [number, number, number], look: [-3.4, 1.6, 0] as [number, number, number], fov: 34 };
export { THREE };
