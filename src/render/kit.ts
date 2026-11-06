/**
 * Modelling kit: every toy is built from these. Each part is a mesh plus an
 * inverted-hull ink outline, and carries an "ink id" so the post pass can draw
 * inner contour lines wherever two parts meet.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { comic, LAYER_OUTLINE, OUTLINE, OUTLINE_THIN, type ComicMaterial, type ComicOpts } from './materials';

let nextInk = 1;
export const newInkId = () => nextInk++;

const geoCache = new Map<string, THREE.BufferGeometry>();
function cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) geoCache.set(key, (g = make()));
  return g;
}

export const GEO = {
  sphere: () => cached('sphere', () => new THREE.SphereGeometry(1, 32, 24)),
  box: (w: number, h: number, d: number, r: number) =>
    cached(`box${w},${h},${d},${r}`, () => (r > 0 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d))),
  cyl: (top: number, bot: number, h: number, seg = 28) =>
    cached(`cyl${top},${bot},${h},${seg}`, () => new THREE.CylinderGeometry(top, bot, h, seg, 1)),
  cone: (r: number, h: number, seg = 28) => cached(`cone${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg, 1)),
  torus: (R: number, r: number, arc = Math.PI * 2) =>
    cached(`torus${R},${r},${arc}`, () => new THREE.TorusGeometry(R, r, 14, 40, arc)),
  capsule: (r: number, len: number) => cached(`cap${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 8, 20)),
};

export interface PartOpts {
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: number | [number, number, number];
  /** Outline weight; false for none (tiny details, glowing bulbs). */
  outline?: 'normal' | 'thin' | false;
  /** Share an ink id with another part so no contour line is drawn between them. */
  ink?: number;
  name?: string;
}

export class Kit {
  readonly materials: ComicMaterial[] = [];
  private matCache = new Map<string, ComicMaterial>();

  constructor(readonly rim: number) {}

  mat(color: number, o: ComicOpts = {}): ComicMaterial {
    const key = `${color}|${o.shade ?? ''}|${o.gloss ?? 0}|${o.glow ? 1 : 0}|${o.rimAmt ?? 1}|${o.opacity ?? 1}|${o.pattern ? `${o.pattern.kind}${o.pattern.color2}${o.pattern.scale}` : ''}`;
    let m = this.matCache.get(key);
    if (!m) {
      m = comic(color, { rim: this.rim, ...o });
      this.matCache.set(key, m);
      this.materials.push(m);
    }
    return m;
  }

  part(geo: THREE.BufferGeometry, material: ComicMaterial | number, parent: THREE.Object3D, o: PartOpts = {}): THREE.Group {
    const g = new THREE.Group();
    const mat = typeof material === 'number' ? this.mat(material) : material;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.inkId = o.ink ?? newInkId();
    g.add(mesh);
    if (o.outline !== false) {
      const hull = new THREE.Mesh(geo, o.outline === 'thin' ? OUTLINE_THIN : OUTLINE);
      hull.layers.set(LAYER_OUTLINE);
      g.add(hull);
    }
    if (o.pos) g.position.set(...o.pos);
    if (o.rot) g.rotation.set(...o.rot);
    if (o.scale !== undefined) typeof o.scale === 'number' ? g.scale.setScalar(o.scale) : g.scale.set(...o.scale);
    if (o.name) g.name = o.name;
    parent.add(g);
    return g;
  }

  sphere(r: number | [number, number, number], m: ComicMaterial | number, parent: THREE.Object3D, o: PartOpts = {}) {
    return this.part(GEO.sphere(), m, parent, { ...o, scale: typeof r === 'number' ? r : r });
  }
  box(w: number, h: number, d: number, m: ComicMaterial | number, parent: THREE.Object3D, o: PartOpts & { r?: number } = {}) {
    return this.part(GEO.box(w, h, d, o.r ?? Math.min(w, h, d) * 0.12), m, parent, o);
  }
  cyl(top: number, bot: number, h: number, m: ComicMaterial | number, parent: THREE.Object3D, o: PartOpts = {}) {
    return this.part(GEO.cyl(top, bot, h), m, parent, o);
  }
  cone(r: number, h: number, m: ComicMaterial | number, parent: THREE.Object3D, o: PartOpts = {}) {
    return this.part(GEO.cone(r, h), m, parent, o);
  }
  torus(R: number, r: number, m: ComicMaterial | number, parent: THREE.Object3D, o: PartOpts & { arc?: number } = {}) {
    return this.part(GEO.torus(R, r, o.arc), m, parent, o);
  }
  capsule(r: number, len: number, m: ComicMaterial | number, parent: THREE.Object3D, o: PartOpts = {}) {
    return this.part(GEO.capsule(r, len), m, parent, o);
  }
  /** Extruded flat shape — cardboard cut-outs, stars, gingerbread. */
  extrude(shape: THREE.Shape, depth: number, m: ComicMaterial | number, parent: THREE.Object3D, o: PartOpts & { bevel?: number } = {}) {
    const bevel = o.bevel ?? depth * 0.35;
    const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 24 });
    geo.translate(0, 0, -depth / 2);
    geo.computeVertexNormals();
    return this.part(geo, m, parent, o);
  }
  lathe(points: [number, number][], m: ComicMaterial | number, parent: THREE.Object3D, o: PartOpts = {}) {
    const geo = new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), 36);
    return this.part(geo, m, parent, o);
  }
}

export function starShape(points: number, outer: number, inner: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

/** Recursively set the hit-flash amount on every comic material under a node. */
export function setFlash(root: THREE.Object3D, amount: number, color?: THREE.Color) {
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as ComicMaterial | undefined;
    if (m && m.uniforms?.uFlash) {
      m.uniforms.uFlash.value = amount;
      if (color) m.uniforms.uFlashColor.value.copy(color);
    }
  });
}
