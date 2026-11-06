/**
 * Particle bursts drawn like printed shapes: flat colour, inked by the ID pass,
 * animated on twos. One InstancedMesh per burst; removed when done.
 */
import * as THREE from 'three';
import type { MoveType } from '../core/types';
import { comic } from './materials';
import { starShape, newInkId } from './kit';
import { onTwos } from './anim';
import { CANDY, CYAN, GOLD, MAGENTA, TYPE_COLOR } from './palette';

type ShapeKind = 'star' | 'flake' | 'orb' | 'chip' | 'spark' | 'arrowUp' | 'arrowDown' | 'puff';

const geos: Partial<Record<ShapeKind, THREE.BufferGeometry>> = {};
function geo(kind: ShapeKind): THREE.BufferGeometry {
  if (geos[kind]) return geos[kind]!;
  let g: THREE.BufferGeometry;
  const flat = (s: THREE.Shape) => new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false }).translate(0, 0, -0.02);
  switch (kind) {
    case 'star': g = flat(starShape(5, 1, 0.45)); break;
    case 'flake': g = flat(starShape(6, 1, 0.3)); break;
    case 'spark': g = flat(starShape(4, 1, 0.22)); break;
    case 'chip': g = new THREE.BoxGeometry(1, 0.55, 0.08); break;
    case 'orb': g = new THREE.SphereGeometry(1, 10, 8); break;
    case 'puff': g = new THREE.SphereGeometry(1, 12, 10); break;
    case 'arrowUp':
    case 'arrowDown': {
      const s = new THREE.Shape();
      s.moveTo(0, 1); s.lineTo(0.8, 0.1); s.lineTo(0.3, 0.1); s.lineTo(0.3, -0.9); s.lineTo(-0.3, -0.9); s.lineTo(-0.3, 0.1); s.lineTo(-0.8, 0.1); s.closePath();
      g = flat(s);
      if (kind === 'arrowDown') g.rotateZ(Math.PI);
      break;
    }
  }
  geos[kind] = g;
  return g;
}

export interface BurstOpts {
  kind: ShapeKind;
  colors: number[];
  count: number;
  size: [number, number];
  speed: [number, number];
  /** Directional bias (unit-ish vector); particles spray in a cone around it. */
  dir?: THREE.Vector3;
  spread?: number;
  gravity?: number;
  life: number;
  /** Rise straight up (stat arrows, heal sparkles). */
  rise?: boolean;
}

interface P {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
  size: number;
}

export class FxLayer {
  private bursts: { mesh: THREE.InstancedMesh; ps: P[]; born: number; o: BurstOpts }[] = [];
  constructor(private parent: THREE.Object3D, private clock: () => number) {}

  burst(at: THREE.Vector3, o: BurstOpts) {
    const mats = o.colors.map((c) => comic(c, { glow: true }));
    // one mesh per colour keeps it simple
    o.colors.forEach((_, ci) => {
      const n = Math.ceil(o.count / o.colors.length);
      const mesh = new THREE.InstancedMesh(geo(o.kind), mats[ci]!, n);
      mesh.userData.inkId = newInkId();
      mesh.frustumCulled = false;
      const ps: P[] = [];
      for (let i = 0; i < n; i++) {
        const v = o.rise
          ? new THREE.Vector3((Math.random() - 0.5) * 0.6, 1, (Math.random() - 0.5) * 0.3)
          : new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize();
        if (o.dir) v.lerp(o.dir.clone().normalize(), 1 - (o.spread ?? 0.6)).normalize();
        v.multiplyScalar(o.speed[0] + Math.random() * (o.speed[1] - o.speed[0]));
        ps.push({
          pos: at.clone().add(o.rise ? new THREE.Vector3((Math.random() - 0.5) * 1.2, Math.random() * 0.8, (Math.random() - 0.5) * 0.6) : new THREE.Vector3()),
          vel: v,
          rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
          spin: new THREE.Vector3(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4),
          size: o.size[0] + Math.random() * (o.size[1] - o.size[0]),
        });
      }
      this.parent.add(mesh);
      this.bursts.push({ mesh, ps, born: this.clock(), o });
    });
  }

  /** Called every frame with game time. */
  update() {
    const now = this.clock();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    this.bursts = this.bursts.filter((b) => {
      const age = onTwos(now - b.born);
      const k = age / b.o.life;
      if (k >= 1) {
        this.parent.remove(b.mesh);
        b.mesh.dispose();
        return false;
      }
      b.ps.forEach((p, i) => {
        const g = b.o.gravity ?? 4;
        const pos = p.pos.clone().addScaledVector(p.vel, age).add(new THREE.Vector3(0, -0.5 * g * age * age, 0));
        const e = new THREE.Euler(p.rot.x + p.spin.x * age, p.rot.y + p.spin.y * age, p.rot.z + p.spin.z * age);
        const facing = b.o.kind === 'arrowUp' || b.o.kind === 'arrowDown';
        q.setFromEuler(facing ? new THREE.Euler(0, 0, 0) : e);
        const sz = p.size * (b.o.kind === 'puff' ? 0.6 + k * 1.2 : k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25);
        s.setScalar(Math.max(0.001, sz));
        m.compose(pos, q, s);
        b.mesh.setMatrixAt(i, m);
      });
      b.mesh.instanceMatrix.needsUpdate = true;
      return true;
    });
  }

  clear() {
    for (const b of this.bursts) this.parent.remove(b.mesh);
    this.bursts = [];
  }
}

/** The house style for each move type's impact. */
export function impactBurst(type: MoveType, big: boolean): BurstOpts {
  const count = big ? 34 : 20;
  switch (type) {
    case 'warm': return { kind: 'orb', colors: [0xff7a2f, GOLD, CANDY], count, size: [0.05, 0.13], speed: [2.5, 5.5], life: 0.8, gravity: 2 };
    case 'frost': return { kind: 'flake', colors: [0xffffff, 0x7fd8ff, CYAN], count, size: [0.08, 0.18], speed: [2, 5], life: 0.9, gravity: 1 };
    case 'pine': return { kind: 'chip', colors: [0x43b56d, GOLD, 0x9a5a33], count, size: [0.08, 0.16], speed: [3, 6], life: 0.8, gravity: 6 };
    case 'spark': return { kind: 'spark', colors: [0xffd23f, 0xffffff, CYAN], count, size: [0.1, 0.22], speed: [3, 6.5], life: 0.6, gravity: 0 };
    default: return { kind: 'star', colors: [GOLD, MAGENTA, CYAN, 0xffffff], count, size: [0.07, 0.15], speed: [2.5, 5], life: 0.8, gravity: 3 };
  }
}

export const typeColor = (t: MoveType) => TYPE_COLOR[t];
