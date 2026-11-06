/**
 * The stage: one WebGL canvas behind every screen. Owns the clocks
 * (real / game / on-twos), the camera rig, render targets and comic FX.
 */
import * as THREE from 'three';
import { createPost, type Post } from './post';
import { shared, LAYER_OUTLINE } from './materials';
import { Tweens, ease, lerp } from './anim';

export interface StageSet {
  root: THREE.Object3D;
  bg: { a: number; b: number; dot: number; dotAmt?: number; burst?: number };
  /** anim = on-twos time, game = smooth game time. */
  update?(anim: number, game: number, dt: number): void;
  dispose?(): void;
}

export interface Shot {
  pos: [number, number, number];
  look: [number, number, number];
  fov?: number;
  roll?: number;
}

export class CameraRig {
  pos = new THREE.Vector3(0, 2, 10);
  look = new THREE.Vector3(0, 1, 0);
  fov = 30;
  roll = 0;
  private tPos = this.pos.clone();
  private tLook = this.look.clone();
  private tFov = 30;
  private tRoll = 0;
  /** Higher = snappier. */
  stiffness = 5;
  /** Slow constant drift so static shots breathe. */
  drift = 0.15;

  shot(s: Shot, cut = false, stiffness = 5) {
    this.tPos.set(...s.pos);
    this.tLook.set(...s.look);
    this.tFov = s.fov ?? 30;
    this.tRoll = s.roll ?? 0;
    this.stiffness = stiffness;
    if (cut) {
      this.pos.copy(this.tPos);
      this.look.copy(this.tLook);
      this.fov = this.tFov;
      this.roll = this.tRoll;
    }
  }

  update(dt: number) {
    const k = 1 - Math.exp(-this.stiffness * dt);
    this.pos.lerp(this.tPos, k);
    this.look.lerp(this.tLook, k);
    this.fov = lerp(this.fov, this.tFov, k);
    this.roll = lerp(this.roll, this.tRoll, k);
  }

  apply(cam: THREE.PerspectiveCamera, t: number, shake: THREE.Vector2) {
    cam.position.copy(this.pos);
    cam.position.x += Math.sin(t * 0.35) * this.drift;
    cam.position.y += Math.sin(t * 0.27) * this.drift * 0.4;
    cam.lookAt(this.look);
    cam.rotateZ(this.roll);
    cam.position.x += shake.x;
    cam.position.y += shake.y;
    // Shots are composed for ~16:9. On tall screens keep the horizontal coverage
    // of a 1.3 aspect so the toys don't fall off the sides.
    const minAspect = 1.3;
    let fov = this.fov;
    if (cam.aspect < minAspect) {
      const h = 2 * Math.atan(Math.tan((fov * Math.PI) / 360) * minAspect);
      fov = (2 * Math.atan(Math.tan(h / 2) / cam.aspect) * 180) / Math.PI;
    }
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }
}

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 200);
  readonly alt = new THREE.PerspectiveCamera(24, 16 / 9, 0.1, 200);
  readonly rig = new CameraRig();
  readonly altRig = new CameraRig();
  /** Game-time tweens: affected by slow-mo and hit-stop. */
  readonly tweens = new Tweens();
  /** Real-time tweens: FX that must keep running during hit-stop. */
  readonly rt = new Tweens();
  readonly post: Post;
  set: StageSet | null = null;
  reduceFx = false;

  game = 0;
  real = 0;
  timeScale = 1;
  private hitstopUntil = 0;
  private shakeAmt = 0;
  private shakeVec = new THREE.Vector2();
  private split = 0;
  private splitTarget = 0;
  private rtMain!: THREE.WebGLRenderTarget;
  private rtId!: THREE.WebGLRenderTarget;
  private rtAlt!: THREE.WebGLRenderTarget;
  private rtAltId!: THREE.WebGLRenderTarget;
  private idMats = new Map<number, THREE.MeshBasicMaterial>();
  private last = performance.now();
  private raf = 0;
  private listeners = new Set<(dt: number) => void>();
  readonly scene = new THREE.Scene();

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.setClearColor(0x000000, 0);
    this.camera.layers.enable(LAYER_OUTLINE);
    this.alt.layers.enable(LAYER_OUTLINE);
    this.post = createPost();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  get size() {
    return { w: this.canvas.clientWidth || innerWidth, h: this.canvas.clientHeight || innerHeight };
  }

  resize() {
    const { w, h } = this.size;
    const dpr = Math.min(devicePixelRatio || 1, this.reduceFx ? 1 : 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    const W = Math.round(w * dpr);
    const H = Math.round(h * dpr);
    const mk = (samples: number) => {
      const rt = new THREE.WebGLRenderTarget(W, H, { samples, depthBuffer: true });
      return rt;
    };
    const mkId = () => new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    for (const rt of [this.rtMain, this.rtId, this.rtAlt, this.rtAltId]) rt?.dispose();
    this.rtMain = mk(4);
    this.rtAlt = mk(4);
    this.rtId = mkId();
    this.rtAltId = mkId();
    this.camera.aspect = this.alt.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.alt.updateProjectionMatrix();
    const scale = H / 1080;
    shared.uRes.value.set(W, H);
    shared.uOutline.value = Math.max(2, 4.2 * scale);
    shared.uDot.value = Math.max(3, 5.5 * scale);
    const u = this.post.uniforms;
    u.uRes.value.set(W, H);
    u.uInkW.value = Math.max(1, 1.6 * scale);
    u.uDot.value = Math.max(4, 9 * scale);
    u.uMis.value = this.reduceFx ? 0 : Math.max(0.8, 1.6 * scale);
    u.tScene.value = this.rtMain.texture;
    u.tId.value = this.rtId.texture;
    u.tAlt.value = this.rtAlt.texture;
    u.tAltId.value = this.rtAltId.texture;
  }

  setReduceFx(on: boolean) {
    this.reduceFx = on;
    this.resize();
  }

  setSet(set: StageSet | null) {
    if (this.set) {
      this.scene.remove(this.set.root);
      this.set.dispose?.();
    }
    this.tweens.flush();
    this.set = set;
    if (set) {
      this.scene.add(set.root);
      const u = this.post.uniforms;
      u.uBgA.value.set(set.bg.a);
      u.uBgB.value.set(set.bg.b);
      u.uBgDot.value.set(set.bg.dot);
      u.uBgDotAmt.value = set.bg.dotAmt ?? 0.7;
      u.uBurst.value = set.bg.burst ?? 0.4;
    }
    this.splitTo(0, true);
  }

  start() {
    if (this.raf) return;
    const loop = (now: number) => {
      this.frame(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  onFrame(fn: (dt: number) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── FX ─────────────────────────────────────────────────

  /** Freeze game time (real-time FX keep running). */
  hitstop(ms: number) {
    this.hitstopUntil = Math.max(this.hitstopUntil, this.real + ms / 1000);
  }

  async slowmo(scale: number, ms: number) {
    this.timeScale = scale;
    await this.rt.wait(ms / 1000);
    this.timeScale = 1;
  }

  shake(amount: number) {
    if (this.reduceFx) amount *= 0.25;
    this.shakeAmt = Math.max(this.shakeAmt, amount);
  }

  flash(color: number, amount = 0.8, ms = 140) {
    const u = this.post.uniforms;
    u.uFlashColor.value.set(color);
    const a = this.reduceFx ? amount * 0.3 : amount;
    return this.rt.to(ms / 1000, (k) => (u.uFlash.value = a * (1 - k)), ease.outQuad);
  }

  /** Two-tone "impact frame" held for a few frames. */
  impact(a: number, b: number, ms = 90) {
    if (this.reduceFx) return Promise.resolve();
    const u = this.post.uniforms;
    u.uImpactA.value.set(a);
    u.uImpactB.value.set(b);
    u.uImpact.value = 1;
    return this.rt.wait(ms / 1000).then(() => (u.uImpact.value = 0));
  }

  speedLines(focus: THREE.Vector3 | null, amount: number, ms: number) {
    const u = this.post.uniforms;
    if (focus) {
      const p = focus.clone().project(this.camera);
      u.uFocus.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5);
    }
    return this.rt.to(ms / 1000, (k) => (u.uSpeed.value = amount * (1 - ease.inCubic(k))), ease.linear);
  }

  misregister(px: number, ms: number) {
    if (this.reduceFx) return;
    const u = this.post.uniforms;
    const base = u.uMis.value;
    void this.rt.to(ms / 1000, (k) => (u.uMis.value = base + px * (1 - k)), ease.outCubic);
  }

  splitTo(v: number, instant = false) {
    this.splitTarget = v;
    if (instant) this.split = v;
  }

  /** World → CSS pixel coordinates (for DOM lettering). */
  project(v: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const p = v.clone().project(this.camera);
    const { w, h } = this.size;
    return { x: (p.x * 0.5 + 0.5) * w, y: (1 - (p.y * 0.5 + 0.5)) * h, visible: p.z < 1 };
  }

  // ── frame ──────────────────────────────────────────────

  private idMat(id: number) {
    let m = this.idMats.get(id);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color: new THREE.Color(((id * 37) & 255) / 255, ((id * 91 + 64) & 255) / 255, ((id * 151 + 17) & 255) / 255) });
      this.idMats.set(id, m);
    }
    return m;
  }

  private renderId(cam: THREE.PerspectiveCamera, target: THREE.WebGLRenderTarget) {
    const swapped: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [];
    const hidden: THREE.Object3D[] = [];
    this.scene.traverseVisible((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.userData.skipId) {
        hidden.push(mesh);
        mesh.visible = false;
        return;
      }
      if (mesh.isMesh && mesh.userData.inkId !== undefined) {
        swapped.push([mesh, mesh.material]);
        mesh.material = this.idMat(mesh.userData.inkId as number);
      }
    });
    const mask = cam.layers.mask;
    cam.layers.set(0);
    this.renderer.setRenderTarget(target);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.clear();
    this.renderer.render(this.scene, cam);
    cam.layers.mask = mask;
    for (const [m, mat] of swapped) m.material = mat;
    for (const h of hidden) h.visible = true;
  }

  private renderScene(cam: THREE.PerspectiveCamera, target: THREE.WebGLRenderTarget) {
    this.renderer.setRenderTarget(target);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this.renderer.render(this.scene, cam);
  }

  /** Render one frame of a set from a shot into a PNG (map thumbnails). */
  snapshot(set: StageSet, shot: Shot, w: number, h: number): string {
    const prev = this.set;
    const prevSplit = this.split;
    if (prev) this.scene.remove(prev.root);
    this.scene.add(set.root);
    set.update?.(0, 0, 0);
    const cam = new THREE.PerspectiveCamera(shot.fov ?? 30, w / h, 0.1, 200);
    cam.layers.enable(LAYER_OUTLINE);
    cam.position.set(...shot.pos);
    cam.lookAt(new THREE.Vector3(...shot.look));
    const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4 });
    const idRt = new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    const u = this.post.uniforms;
    const save = { res: u.uRes.value.clone(), scene: u.tScene.value, id: u.tId.value, a: u.uBgA.value.clone(), b: u.uBgB.value.clone(), d: u.uBgDot.value.clone(), amt: u.uBgDotAmt.value, burst: u.uBurst.value, sres: shared.uRes.value.clone() };
    shared.uRes.value.set(w, h);
    this.renderScene(cam, rt);
    this.renderId(cam, idRt);
    u.uRes.value.set(w, h);
    u.tScene.value = rt.texture;
    u.tId.value = idRt.texture;
    u.uBgA.value.set(set.bg.a);
    u.uBgB.value.set(set.bg.b);
    u.uBgDot.value.set(set.bg.dot);
    u.uBgDotAmt.value = set.bg.dotAmt ?? 0.7;
    u.uBurst.value = set.bg.burst ?? 0.4;
    u.uSplit.value = 0;
    const out = new THREE.WebGLRenderTarget(w, h);
    this.renderer.setRenderTarget(out);
    this.renderer.render(this.post.scene, this.post.camera);
    const px = new Uint8Array(w * h * 4);
    this.renderer.readRenderTargetPixels(out, 0, 0, w, h, px);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    ctx.putImageData(img, 0, 0);
    // restore
    this.scene.remove(set.root);
    if (prev) this.scene.add(prev.root);
    u.uRes.value.copy(save.res);
    u.tScene.value = save.scene;
    u.tId.value = save.id;
    u.uBgA.value.copy(save.a);
    u.uBgB.value.copy(save.b);
    u.uBgDot.value.copy(save.d);
    u.uBgDotAmt.value = save.amt;
    u.uBurst.value = save.burst;
    shared.uRes.value.copy(save.sres);
    this.split = prevSplit;
    rt.dispose();
    idRt.dispose();
    out.dispose();
    return c.toDataURL('image/png');
  }

  private frame(now: number) {
    // Clamp only real stalls (tab switch); slow devices must still keep wall-clock pacing.
    const dtReal = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    this.real += dtReal;
    const frozen = this.real < this.hitstopUntil;
    const dt = frozen ? 0 : dtReal * this.timeScale;
    this.game += dt;
    this.rt.tick(this.real);
    this.tweens.tick(this.game);
    const anim = Math.floor(this.game * 12) / 12;
    this.set?.update?.(anim, this.game, dt);
    for (const l of this.listeners) l(dt);

    // shake decays in real time so hit-stop frames still rattle
    this.shakeAmt *= Math.exp(-9 * dtReal);
    if (this.shakeAmt < 0.002) this.shakeAmt = 0;
    const sh = this.shakeAmt;
    this.shakeVec.set((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    this.rig.update(dtReal);
    this.altRig.update(dtReal);
    this.rig.apply(this.camera, this.real, this.shakeVec);
    this.altRig.apply(this.alt, this.real, this.shakeVec);

    this.split = lerp(this.split, this.splitTarget, 1 - Math.exp(-14 * dtReal));
    if (Math.abs(this.split - this.splitTarget) < 0.002) this.split = this.splitTarget;
    const u = this.post.uniforms;
    u.uSplit.value = this.split;
    u.uTime.value = this.real;

    this.renderScene(this.camera, this.rtMain);
    this.renderId(this.camera, this.rtId);
    if (this.split > 0.001) {
      this.renderScene(this.alt, this.rtAlt);
      this.renderId(this.alt, this.rtAltId);
    }
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.post.scene, this.post.camera);
  }
}
