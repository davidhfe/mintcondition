import * as THREE from 'three';
import { Kit } from '../kit';
import { rosette, type ToyBuilder, type ToyRig } from './rig';
import { bigTed, gingerSnap, chuggs } from './warm';
import { colonelCrunch, dobbin, jack } from './pine';
import { sprocket, cymon, chatterbox } from './spark';
import { dameFlurry, slick, abner, topper } from './frost';
import { oddrey } from './oddrey';

export const BUILDERS: Record<string, ToyBuilder> = {
  bigTed,
  gingerSnap,
  chuggs,
  colonelCrunch,
  dobbin,
  jack,
  sprocket,
  cymon,
  chatterbox,
  dameFlurry,
  slick,
  abner,
  topper,
  oddrey,
};

export function buildToy(id: string, rim: number): ToyRig {
  const builder = BUILDERS[id];
  if (!builder) throw new Error(`No model for ${id}`);
  const kit = new Kit(rim);
  const root = new THREE.Group();
  root.name = id;
  const body = new THREE.Group();
  root.add(body);
  const r = builder(kit, body);
  const badge = rosette(kit, r.badge.parent, r.badge.pos, r.badge.scale ?? 1);
  badge.visible = false;
  return {
    id,
    root,
    body,
    parts: r.parts,
    height: r.height,
    headY: r.headY,
    kit,
    idle: (t) => r.idle?.(t, r.parts),
    setDeluxe: (on) => (badge.visible = on),
  };
}
