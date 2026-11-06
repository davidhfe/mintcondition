/**
 * Battle choreography. Camera grammar + toy acting + comic impact FX.
 * Everything here is presentation; the rules live in core/battle.ts.
 */
import * as THREE from 'three';
import type { AnimKind, ArenaId, MoveDef, MoveType, Side } from '../core/types';
import type { Stage, Shot } from './stage';
import { arenaSet, type ArenaSet } from './sets';
import { buildToy } from './toys';
import type { ToyRig } from './toys/rig';
import { FxLayer, impactBurst } from './fx';
import { ease, lerp } from './anim';
import { Kit, setFlash } from './kit';
import { CANDY, GOLD, INK, PAPER, PLAYER_RIM, TYPE_COLOR } from './palette';

const FACE = [0.85, -0.85] as const;
const DIR = [1, -1] as const;

export interface ToySpec {
  toyId: string;
  deluxe: boolean;
}

export class Director {
  readonly set: ArenaSet;
  readonly rigs: [ToyRig, ToyRig];
  readonly fx: FxLayer;
  private tangles: (THREE.Group | null)[] = [null, null];
  private hidden: [boolean, boolean] = [false, false];

  constructor(readonly stage: Stage, arena: ArenaId, a: ToySpec | null, b: ToySpec | null) {
    this.set = arenaSet(arena);
    const mk = (spec: ToySpec | null, side: Side) => {
      const r = buildToy(spec?.toyId ?? 'bigTed', PLAYER_RIM[side]);
      r.setDeluxe(spec?.deluxe ?? false);
      r.root.position.copy(this.set.mounts[side]);
      r.root.rotation.y = FACE[side];
      r.root.visible = spec !== null;
      this.set.root.add(r.root);
      return r;
    };
    this.rigs = [mk(a, 0), mk(b, 1)];
    this.fx = new FxLayer(this.set.root, () => stage.game);
    const base = this.set.update;
    this.set.update = (anim, game, dt) => {
      base?.(anim, game, dt);
      this.rigs.forEach((r) => r.idle(anim));
      this.fx.update();
      this.tangles.forEach((t) => t && (t.rotation.y = game * 2));
    };
    stage.setSet(this.set);
  }

  /** Swap the toy on one side (versus preview, encounter screen). */
  setToy(side: Side, spec: ToySpec | null) {
    const old = this.rigs[side];
    this.set.root.remove(old.root);
    const r = buildToy(spec?.toyId ?? 'bigTed', PLAYER_RIM[side]);
    r.setDeluxe(spec?.deluxe ?? false);
    r.root.position.copy(this.set.mounts[side]);
    r.root.rotation.y = FACE[side];
    r.root.visible = spec !== null;
    this.set.root.add(r.root);
    this.rigs[side] = r;
    this.hidden[side] = false;
  }

  head(side: Side): THREE.Vector3 {
    const r = this.rigs[side];
    return r.root.localToWorld(new THREE.Vector3(0, r.headY, 0));
  }
  top(side: Side): THREE.Vector3 {
    const r = this.rigs[side];
    return r.root.localToWorld(new THREE.Vector3(0, r.height + 0.2, 0));
  }

  // ── camera grammar ─────────────────────────────────────

  shotWide(cut = false) {
    this.stage.rig.shot({ pos: [0, 2.7, 11], look: [0, 1.35, 0], fov: 32 }, cut, 3.5);
  }

  private closeShot(side: Side, dist = 4.2, roll = 0.06, low = 0): Shot {
    const h = this.head(side);
    const d = DIR[side];
    return { pos: [h.x + d * dist * 0.55, h.y - 0.25 - low, h.z + dist], look: [h.x + d * 0.2, h.y - 0.15, h.z], fov: 30, roll: roll * -d };
  }

  shotFocus(side: Side) {
    this.stage.rig.shot(this.closeShot(side, 5.4, 0.04), false, 3);
  }

  async intro() {
    const r = this.stage.rig;
    r.shot({ pos: [-7, 1.2, 6], look: [-1.9, 1.5, 0], fov: 28, roll: 0.1 }, true);
    r.shot({ pos: [-3.5, 1.6, 6], look: [-1.9, 1.6, 0], fov: 30, roll: 0.06 }, false, 2.2);
    void this.hop(0);
    await this.stage.tweens.wait(0.9);
    r.shot({ pos: [7, 1.2, 6], look: [1.9, 1.5, 0], fov: 28, roll: -0.1 }, true);
    r.shot({ pos: [3.5, 1.6, 6], look: [1.9, 1.6, 0], fov: 30, roll: -0.06 }, false, 2.2);
    void this.hop(1);
    await this.stage.tweens.wait(0.9);
    this.stage.rig.shot({ pos: [0, 4.5, 15], look: [0, 1.2, 0], fov: 32 }, true);
    this.shotWide();
    this.stage.speedLines(new THREE.Vector3(0, 1.5, 0), 0.6, 600);
    await this.stage.tweens.wait(0.5);
  }

  // ── acting primitives (on twos) ───────────────────────────

  private tw(dur: number, f: (k: number) => void, e = ease.outCubic) {
    return this.stage.tweens.to(dur, f, e, true);
  }

  private resetPose(side: Side) {
    const r = this.rigs[side];
    r.root.position.copy(this.set.mounts[side]);
    r.root.rotation.set(0, FACE[side], 0);
    r.body.position.set(0, 0, 0);
    r.body.rotation.set(0, 0, 0);
    r.body.scale.set(1, 1, 1);
  }

  async hop(side: Side, height = 0.5) {
    const b = this.rigs[side].body;
    await this.tw(0.08, (k) => b.scale.set(1 + 0.12 * k, 1 - 0.15 * k, 1 + 0.12 * k));
    await this.tw(0.18, (k) => {
      b.position.y = height * Math.sin(k * Math.PI);
      b.scale.set(lerp(1.12, 0.92, k), lerp(0.85, 1.1, k), lerp(1.12, 0.92, k));
    }, ease.linear);
    await this.tw(0.14, (k) => b.scale.set(lerp(1.1, 1, k), lerp(0.88, 1, k), lerp(1.1, 1, k)), ease.outBack);
    b.position.y = 0;
  }

  /** Wind-up: camera pushes in on the attacker, toy loads up. */
  async anticipate(side: Side, m: MoveDef) {
    const d = DIR[side];
    this.stage.rig.shot(this.closeShot(side, 3.6, 0.12, 0.3), false, 6);
    const b = this.rigs[side].body;
    const lean = m.anim === 'stomp' ? 0 : -d * 0.18;
    await this.tw(0.32, (k) => {
      b.rotation.z = lean * k;
      b.scale.set(1 + 0.12 * k, 1 - 0.14 * k, 1 + 0.12 * k);
      if (m.anim === 'stomp') b.position.y = 0;
    }, ease.outQuad);
  }

  /** Short trembling hold while the defender's Keep Cool ring closes. */
  async tremble(side: Side, seconds: number) {
    const b = this.rigs[side].body;
    await this.tw(seconds, (k) => {
      b.position.x = Math.sin(k * 90) * 0.03;
    }, ease.linear);
    b.position.x = 0;
  }

  /** How long `release` takes to reach its impact frame. */
  releaseTime(kind: AnimKind): number {
    return kind === 'lunge' ? 0.14 : kind === 'stomp' ? 0.22 : kind === 'spin' ? 0.3 : kind === 'hop' ? 0.22 : 0.16;
  }

  /** Two-shot that keeps both toys on screen while the defender's Keep Cool ring closes. */
  shotDefense(attacker: Side) {
    const d = DIR[attacker];
    this.stage.rig.shot({ pos: [d * 0.6, 2.2, 8.2], look: [d * 0.6, 1.4, 0], fov: 34, roll: -d * 0.05 }, true);
  }

  /** The action, ending exactly on the impact frame. */
  async release(side: Side, m: MoveDef) {
    const r = this.rigs[side];
    const b = r.body;
    const d = DIR[side];
    const T = this.releaseTime(m.anim);
    const from = this.set.mounts[side].x;
    this.stage.rig.shot({ pos: [0 + d * 0.6, 2.2, 8.2], look: [d * 0.6, 1.4, 0], fov: 34, roll: -d * 0.05 }, false, 9);
    switch (m.anim) {
      case 'lunge':
        await this.tw(T, (k) => {
          r.root.position.x = from + d * 2.0 * k;
          b.rotation.z = lerp(-d * 0.18, d * 0.25, k);
          b.scale.set(lerp(1.12, 0.85, k), lerp(0.86, 1.18, k), lerp(1.12, 0.85, k));
        }, ease.inQuad);
        break;
      case 'stomp':
        await this.tw(T * 0.6, (k) => {
          b.position.y = 0.9 * k;
          b.scale.set(lerp(1.12, 0.85, k), lerp(0.86, 1.2, k), lerp(1.12, 0.85, k));
        }, ease.outQuad);
        await this.tw(T * 0.4, (k) => {
          b.position.y = 0.9 * (1 - k);
          b.scale.set(lerp(0.85, 1.3, k), lerp(1.2, 0.68, k), lerp(0.85, 1.3, k));
        }, ease.inCubic);
        break;
      case 'spin':
        await this.tw(T, (k) => {
          b.rotation.y = k * Math.PI * 2;
          b.position.y = Math.sin(k * Math.PI) * 0.7;
          r.root.position.x = from + d * 0.8 * k;
        }, ease.inOutCubic);
        break;
      case 'hop':
        await this.tw(T, (k) => {
          b.position.y = Math.sin(k * Math.PI) * 0.9;
          r.root.position.x = from + d * 1.1 * k;
          b.scale.set(lerp(1.12, 1, k), lerp(0.86, 1.05, k), lerp(1.12, 1, k));
        }, ease.linear);
        break;
      case 'shake':
        await this.tw(T, (k) => {
          b.position.x = Math.sin(k * 60) * 0.12;
          b.scale.set(1 + 0.1 * Math.sin(k * 30), 1 - 0.1 * Math.sin(k * 30), 1);
        }, ease.linear);
        break;
      case 'pose':
      case 'sing':
        await this.tw(T, (k) => {
          b.scale.setScalar(lerp(1, 1.22, k));
          b.rotation.z = d * 0.12 * k;
        }, ease.outBack);
        break;
    }
  }

  /** Back to the mark, smoothly. */
  async recover(side: Side) {
    const r = this.rigs[side];
    const b = r.body;
    const fromX = r.root.position.x;
    const s0 = b.scale.clone();
    const rz = b.rotation.z;
    const y0 = b.position.y;
    await this.tw(0.3, (k) => {
      r.root.position.x = lerp(fromX, this.set.mounts[side].x, k);
      b.scale.set(lerp(s0.x, 1, k), lerp(s0.y, 1, k), lerp(s0.z, 1, k));
      b.rotation.z = lerp(rz, 0, k);
      b.rotation.y = 0;
      b.position.y = lerp(y0, 0, k);
    }, ease.outBack);
    this.resetPose(side);
  }

  // ── impacts ────────────────────────────────────────────

  /** The comic money shot. `big` = perfect performance or super effective. */
  impact(target: Side, type: MoveType, big: boolean) {
    const s = this.stage;
    const h = this.head(target);
    s.hitstop(big ? 140 : 90);
    if (big) void s.impact(PAPER, INK, 80);
    else void s.flash(0xffffff, 0.45, 120);
    s.misregister(big ? 9 : 5, 380);
    s.shake(big ? 0.35 : 0.2);
    void s.speedLines(h, big ? 1 : 0.6, big ? 520 : 320);
    this.fx.burst(h.clone().add(new THREE.Vector3(0, -0.2, 0.3)), impactBurst(type, big));
    const r = this.rigs[target];
    setFlash(r.root, 0.85, new THREE.Color(0xffffff));
    void s.rt.wait(0.09).then(() => setFlash(r.root, 0));
    if (big) this.split(target);
  }

  /** Diagonal panel split: main camera on the attacker, alt camera close on the target's face. */
  private async split(target: Side) {
    const s = this.stage;
    const h = this.head(target);
    const d = DIR[target];
    s.altRig.shot({ pos: [h.x - d * 1.4, h.y + 0.1, h.z + 2.5], look: [h.x, h.y, h.z], fov: 26, roll: d * 0.12 }, true);
    s.altRig.shot({ pos: [h.x - d * 1.1, h.y + 0.05, h.z + 2.1], look: [h.x, h.y, h.z], fov: 26, roll: d * 0.12 }, false, 1.5);
    s.splitTo(0.55);
    await s.rt.wait(0.75);
    s.splitTo(0);
  }

  async flinch(target: Side, amount: number) {
    const r = this.rigs[target];
    const b = r.body;
    const d = DIR[target];
    await this.tw(0.1, (k) => {
      b.rotation.z = d * 0.35 * k * amount;
      r.root.position.x = this.set.mounts[target].x - d * 0.35 * k * amount;
      b.scale.set(1 - 0.1 * k, 1 + 0.08 * k, 1);
    }, ease.outQuad);
    await this.tw(0.35, (k) => {
      b.rotation.z = d * 0.35 * amount * (1 - k);
      r.root.position.x = this.set.mounts[target].x - d * 0.35 * amount * (1 - k);
      b.scale.set(lerp(0.9, 1, k), lerp(1.08, 1, k), 1);
    }, ease.outBack);
    this.resetPose(target);
  }

  async dodge(target: Side) {
    const r = this.rigs[target];
    const d = DIR[target];
    this.fx.burst(this.head(target), { kind: 'puff', colors: [0xffffff], count: 6, size: [0.2, 0.4], speed: [0.5, 1], life: 0.6, gravity: -0.5 });
    await this.tw(0.12, (k) => {
      r.root.position.z = this.set.mounts[target].z + 1.4 * k;
      r.root.position.x = this.set.mounts[target].x + d * 0.4 * k;
    });
    await this.stage.tweens.wait(0.25);
    await this.tw(0.25, (k) => {
      r.root.position.z = this.set.mounts[target].z + 1.4 * (1 - k);
      r.root.position.x = this.set.mounts[target].x + d * 0.4 * (1 - k);
    }, ease.outBack);
    this.resetPose(target);
  }

  // ── tricks, statuses ───────────────────────────────────

  async trick(side: Side, m: MoveDef) {
    const b = this.rigs[side].body;
    const d = DIR[side];
    this.stage.rig.shot(this.closeShot(side, 4.4, 0.08), false, 5);
    await this.tw(0.25, (k) => {
      b.scale.setScalar(1 + 0.18 * Math.sin(k * Math.PI));
      b.rotation.z = d * 0.12 * Math.sin(k * Math.PI);
    }, ease.linear);
    this.fx.burst(this.head(side), { kind: 'star', colors: [TYPE_COLOR[m.type], GOLD, 0xffffff], count: 14, size: [0.06, 0.14], speed: [2, 4], life: 0.7, gravity: 2 });
    this.stage.misregister(4, 300);
    this.resetPose(side);
  }

  statFx(side: Side, up: boolean) {
    const at = this.rigs[side].root.localToWorld(new THREE.Vector3(0, 0.4, 0));
    this.fx.burst(at, { kind: up ? 'arrowUp' : 'arrowDown', colors: [up ? 0x7cf27c : CANDY], count: 6, size: [0.14, 0.2], speed: up ? [1.5, 2.2] : [-0.2, 0.2], life: 0.9, gravity: up ? 0 : -1.5, rise: true });
  }

  healFx(side: Side) {
    const at = this.rigs[side].root.localToWorld(new THREE.Vector3(0, 0.3, 0));
    this.fx.burst(at, { kind: 'spark', colors: [0x7cf27c, GOLD, 0xffffff], count: 16, size: [0.08, 0.16], speed: [1.2, 2.2], life: 1.0, gravity: 0, rise: true });
  }

  tangle(side: Side, on: boolean) {
    const cur = this.tangles[side];
    if (cur) {
      this.set.root.remove(cur);
      this.tangles[side] = null;
    }
    if (!on) return;
    const k = new Kit(PLAYER_RIM[side]);
    const g = new THREE.Group();
    const r = this.rigs[side];
    g.position.copy(r.root.position);
    for (let i = 0; i < 3; i++) {
      const ring = k.torus(0.75 - i * 0.08, 0.05, k.mat(i % 2 ? GOLD : CANDY, { gloss: 0.6 }), g, { rot: [Math.PI / 2 + (i - 1) * 0.35, 0, (i - 1) * 0.3] });
      ring.position.y = r.height * (0.3 + i * 0.22);
    }
    this.set.root.add(g);
    this.tangles[side] = g;
  }

  async coal(side: Side, healed: boolean) {
    const k = new Kit(PLAYER_RIM[side]);
    const lump = new THREE.Group();
    k.part(new THREE.IcosahedronGeometry(0.45, 0), k.mat(0x2a2233, { gloss: 0.8 }), lump, {});
    const top = this.top(side);
    lump.position.set(top.x, top.y + 5, top.z);
    this.set.root.add(lump);
    this.stage.rig.shot(this.closeShot(side, 5.5, 0.05), false, 6);
    await this.tw(0.35, (kk) => {
      lump.position.y = top.y + 5 * (1 - kk);
      lump.rotation.set(kk * 4, kk * 3, 0);
    }, ease.inQuad);
    this.stage.shake(0.3);
    this.fx.burst(top, { kind: 'chip', colors: [0x2a2233, 0x4a4258], count: 14, size: [0.06, 0.12], speed: [2, 4], life: 0.6, gravity: 8 });
    const b = this.rigs[side].body;
    if (healed) this.healFx(side);
    await this.tw(0.12, (kk) => b.scale.set(1 + 0.25 * kk, 1 - 0.3 * kk, 1 + 0.25 * kk));
    this.set.root.remove(lump);
    await this.tw(0.3, (kk) => b.scale.set(lerp(1.25, 1, kk), lerp(0.7, 1, kk), lerp(1.25, 1, kk)), ease.outElastic);
    this.resetPose(side);
  }

  // ── endings ────────────────────────────────────────────

  async ko(side: Side) {
    const s = this.stage;
    const r = this.rigs[side];
    const d = DIR[side];
    const h = this.head(side);
    s.rig.shot({ pos: [h.x - d * 2.5, h.y - 0.6, h.z + 3.2], look: [h.x, h.y - 0.4, h.z], fov: 30, roll: d * 0.18 }, false, 4);
    void s.slowmo(0.3, 1300);
    this.tangle(side, false);
    await this.tw(0.9, (k) => {
      r.body.rotation.y = k * Math.PI * 3;
      r.body.position.y = Math.sin(k * Math.PI) * 1.4;
      r.root.position.x = this.set.mounts[side].x - d * 1.2 * k;
    }, ease.outQuad);
    await this.tw(0.3, (k) => {
      r.body.rotation.x = -Math.PI / 2 * k * 0.9;
      r.body.position.y = 0.3 * (1 - k);
    }, ease.outBack);
    s.shake(0.25);
    this.fx.burst(this.head(side), { kind: 'puff', colors: [0xffffff, 0xd9c8b4], count: 10, size: [0.25, 0.5], speed: [0.5, 1.2], life: 0.9, gravity: -0.3 });
  }

  async victory(side: Side) {
    const h = this.head(side);
    const d = DIR[side];
    this.stage.rig.shot({ pos: [h.x + d * 1.6, h.y - 0.9, h.z + 3.6], look: [h.x, h.y - 0.1, h.z], fov: 32, roll: -d * 0.08 }, false, 3);
    this.fx.burst(this.top(side), { kind: 'star', colors: [GOLD, CANDY, 0x2ad4e0, 0xffffff], count: 40, size: [0.08, 0.16], speed: [3, 6], life: 1.4, gravity: 4, dir: new THREE.Vector3(0, 1, 0), spread: 0.5 });
    await this.hop(side, 0.7);
    await this.hop(side, 0.4);
  }

  /** Campaign: a box drops over the loser, ribbon and all. */
  async boxUp(side: Side) {
    const k = new Kit(PLAYER_RIM[side]);
    const r = this.rigs[side];
    const g = new THREE.Group();
    const H = r.height * 0.75 + 0.4;
    const w = 2.0;
    k.box(w, H, w, k.mat(CANDY), g, { pos: [0, H / 2, 0], r: 0.08 });
    k.box(w * 0.18, H + 0.02, w + 0.02, k.mat(GOLD, { gloss: 0.6 }), g, { pos: [0, H / 2, 0], outline: 'thin', r: 0.01 });
    k.box(w + 0.02, H + 0.02, w * 0.18, k.mat(GOLD, { gloss: 0.6 }), g, { pos: [0, H / 2, 0], outline: 'thin', r: 0.01 });
    const bow = new THREE.Group();
    bow.position.y = H + 0.1;
    g.add(bow);
    for (const s of [-1, 1]) k.torus(0.35, 0.1, k.mat(GOLD, { gloss: 0.6 }), bow, { pos: [s * 0.3, 0.1, 0], rot: [0, 0, s * 0.6], scale: [1, 0.7, 0.6] });
    bow.scale.setScalar(0.001);
    const base = this.set.mounts[side];
    g.position.set(base.x, 9, base.z);
    g.rotation.y = FACE[side] * 0.3;
    this.set.root.add(g);
    r.body.rotation.set(0, 0, 0);
    this.stage.rig.shot({ pos: [base.x * 0.6, 3.2, 8], look: [base.x, 1.4, base.z], fov: 32 }, false, 3);
    await this.stage.tweens.wait(0.3);
    await this.tw(0.35, (kk) => (g.position.y = 9 * (1 - kk)), ease.inQuad);
    r.root.visible = false;
    this.hidden[side] = true;
    this.stage.shake(0.3);
    void this.stage.flash(0xffffff, 0.5, 120);
    this.fx.burst(new THREE.Vector3(base.x, 0.3, base.z), { kind: 'puff', colors: [0xffffff], count: 12, size: [0.3, 0.6], speed: [1.5, 3], life: 0.7, gravity: 0 });
    await this.tw(0.25, (kk) => g.scale.set(1 + 0.15 * Math.sin(kk * Math.PI), 1 - 0.18 * Math.sin(kk * Math.PI), 1 + 0.15 * Math.sin(kk * Math.PI)), ease.linear);
    await this.tw(0.4, (kk) => bow.scale.setScalar(Math.max(0.001, kk)), ease.outElastic);
    this.fx.burst(bow.getWorldPosition(new THREE.Vector3()), { kind: 'star', colors: [GOLD, 0xffffff], count: 18, size: [0.08, 0.14], speed: [2, 4], life: 1, gravity: 3 });
  }

  dispose() {
    this.fx.clear();
  }
}

export const SIDE_COLOR = [PLAYER_RIM[0], PLAYER_RIM[1]] as const;
export { CANDY };
