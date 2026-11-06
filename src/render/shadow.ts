/**
 * Printed contact shadows: a halftone-dot ellipse under each toy that tracks
 * its root and shrinks as the body leaves the ground. Skipped by the ID pass
 * so it never gets an ink outline.
 */
import * as THREE from 'three';
import { shared } from './materials';
import type { ToyRig } from './toys/rig';

const mat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: { uDot: shared.uDot, uInk: { value: new THREE.Color(0x1a1026) }, uStrength: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform float uDot; uniform vec3 uInk; uniform float uStrength; varying vec2 vUv;
    void main(){
      float d = length(vUv - 0.5) * 2.0;
      float v = (1.0 - smoothstep(0.15, 1.0, d)) * 0.85 * uStrength;
      const float a = 0.785398; mat2 r = mat2(cos(a), -sin(a), sin(a), cos(a));
      vec2 p = r * gl_FragCoord.xy / (uDot * 0.9); float dd = length(fract(p) - 0.5);
      float rad = sqrt(clamp(v, 0.0, 1.0)) * 0.72; float aa = fwidth(dd);
      float dotA = 1.0 - smoothstep(rad - aa, rad + aa, dd);
      if (dotA < 0.01) discard;
      gl_FragColor = vec4(uInk, dotA * 0.85);
    }`,
});
const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

export interface Shadow {
  mesh: THREE.Mesh;
  update(): void;
}

export function blobShadow(rig: ToyRig, parent: THREE.Object3D, floorY = 0.012): Shadow {
  const box = new THREE.Box3().setFromObject(rig.root);
  const size = box.getSize(new THREE.Vector3());
  const w = Math.max(0.9, Math.min(2.6, Math.max(size.x, size.z) * 1.05));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.skipId = true;
  mesh.renderOrder = -1;
  parent.add(mesh);
  const v = new THREE.Vector3();
  const update = () => {
    mesh.visible = rig.root.visible;
    rig.root.getWorldPosition(v);
    const lift = Math.max(0, rig.body.position.y);
    const k = Math.max(0.35, 1 - lift * 0.35);
    mesh.position.set(v.x, v.y + floorY, v.z);
    mesh.scale.set(w * k, 1, w * 0.62 * k);
  };
  update();
  return { mesh, update };
}
