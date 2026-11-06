/**
 * SPIKE 1 — Comic 3D pipeline.
 * Question: can Three.js give us cel bands + screen-space halftone + ink outlines +
 * CMY misregistration + "on twos" animation at a solid frame rate?
 * Throwaway code. Findings recorded in docs/adr/0001-tech-stack.md.
 */
import * as THREE from 'three';

const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(W, H);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
camera.position.set(0, 1.6, 9);
camera.lookAt(0, 1.1, 0);

const lightDir = new THREE.Vector3(-0.6, 0.8, 0.5).normalize();
const res = new THREE.Vector2(W * renderer.getPixelRatio(), H * renderer.getPixelRatio());

const comicVert = /* glsl */ `
  varying vec3 vN; varying vec3 vViewPos;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position,1.0);
    vViewPos = mv.xyz;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }`;
const comicFrag = /* glsl */ `
  uniform vec3 uColor; uniform vec3 uShade; uniform vec3 uRim; uniform vec3 uLight;
  uniform float uDot; varying vec3 vN; varying vec3 vViewPos;
  float dots(vec2 fc, float scale, float v){
    float a = 0.785398; mat2 r = mat2(cos(a),-sin(a),sin(a),cos(a));
    vec2 p = r * fc / scale; vec2 c = fract(p) - 0.5;
    float d = length(c); float rad = sqrt(clamp(v,0.,1.)) * 0.72;
    float aa = fwidth(d) * 1.2;
    return 1.0 - smoothstep(rad - aa, rad + aa, d);
  }
  void main(){
    vec3 n = normalize(vN);
    vec3 l = normalize((viewMatrix * vec4(uLight,0.)).xyz);
    float ndl = dot(n,l);
    vec3 v = normalize(-vViewPos);
    float fres = 1.0 - max(dot(n,v),0.);
    vec3 col = uColor;
    // three bands: lit / dotted mid / solid shade
    float shadeAmt = smoothstep(0.35, -0.2, ndl);
    float d = dots(gl_FragCoord.xy, uDot, shadeAmt);
    col = mix(col, uShade, d);
    if (ndl < -0.35) col = uShade;
    // hard spec pop
    vec3 h = normalize(l + v);
    if (pow(max(dot(n,h),0.), 60.) > 0.5) col = mix(col, vec3(1.0,0.98,0.92), 0.9);
    // colored rim on the shadow side (spider-verse kicker)
    if (fres > 0.62 && ndl < 0.2) col = uRim;
    gl_FragColor = vec4(col,1.0);
  }`;
const outlineVert = /* glsl */ `
  uniform vec2 uRes; uniform float uWidth;
  void main(){
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    vec3 nv = normalize(normalMatrix * normal);
    vec2 nc = normalize((projectionMatrix * vec4(nv,0.0)).xy);
    clip.xy += nc * uWidth * clip.w * 2.0 / uRes;
    gl_Position = clip;
  }`;
const outlineFrag = `uniform vec3 uInk; void main(){ gl_FragColor = vec4(uInk,1.0); }`;

function comic(color: number, shade: number, rim = 0xff3d8b) {
  return new THREE.ShaderMaterial({
    vertexShader: comicVert, fragmentShader: comicFrag,
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uShade: { value: new THREE.Color(shade) },
      uRim: { value: new THREE.Color(rim) }, uLight: { value: lightDir }, uDot: { value: 5.0 },
    },
  });
}
const outlineMat = new THREE.ShaderMaterial({
  vertexShader: outlineVert, fragmentShader: outlineFrag, side: THREE.BackSide,
  uniforms: { uRes: { value: res }, uWidth: { value: 5.0 }, uInk: { value: new THREE.Color(0x1a1026) } },
});

const idMeshes: { mesh: THREE.Mesh; id: THREE.MeshBasicMaterial; mat: THREE.Material }[] = [];
let nextId = 1;
function part(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, mat); const o = new THREE.Mesh(geo, outlineMat);
  const id = nextId++;
  idMeshes.push({ mesh: m, id: new THREE.MeshBasicMaterial({ color: new THREE.Color((id * 37 % 255) / 255, (id * 91 % 255) / 255, (id * 151 % 255) / 255) }), mat });
  o.userData.outline = true;
  g.add(m, o); g.position.set(x, y, z); g.scale.set(sx, sy, sz); parent.add(g); return g;
}

// A teddy, built from spheres.
const sph = new THREE.SphereGeometry(1, 32, 24);
const fur = comic(0xc98a4b, 0x7a3f2a), muzzle = comic(0xf3d9b1, 0xc98a4b), ink = comic(0x241628, 0x0d0610, 0x6af0ff), bow = comic(0xe8344e, 0x8a1030, 0xffd23f);
function teddy() {
  const root = new THREE.Group();
  const body = part(sph, fur, root, 0, 0.9, 0, 0.85, 0.95, 0.75);
  part(sph, muzzle, body, 0, -0.05, 0.62, 0.55, 0.6, 0.4);
  const head = part(sph, fur, root, 0, 2.05, 0, 0.62, 0.58, 0.58);
  part(sph, fur, head, -0.78, 0.72, 0, 0.35, 0.35, 0.22);
  part(sph, fur, head, 0.78, 0.72, 0, 0.35, 0.35, 0.22);
  part(sph, muzzle, head, 0, -0.25, 0.8, 0.45, 0.35, 0.32);
  part(sph, ink, head, 0, -0.12, 1.08, 0.13, 0.1, 0.08);
  part(sph, ink, head, -0.36, 0.2, 0.85, 0.09, 0.12, 0.06);
  part(sph, ink, head, 0.36, 0.2, 0.85, 0.09, 0.12, 0.06);
  part(sph, bow, root, -0.25, 1.62, 0.45, 0.22, 0.16, 0.12);
  part(sph, bow, root, 0.25, 1.62, 0.45, 0.22, 0.16, 0.12);
  const aL = part(sph, fur, root, -0.85, 1.15, 0.1, 0.28, 0.5, 0.28);
  const aR = part(sph, fur, root, 0.85, 1.15, 0.1, 0.28, 0.5, 0.28);
  part(sph, fur, root, -0.45, 0.2, 0.25, 0.32, 0.25, 0.42);
  part(sph, fur, root, 0.45, 0.2, 0.25, 0.32, 0.25, 0.42);
  return { root, head, aL, aR };
}
const N = Number(new URLSearchParams(location.search).get('n') ?? 2);
const bears = Array.from({ length: N }, (_, i) => {
  const b = teddy();
  b.root.position.x = (i - (N - 1) / 2) * 3.2;
  b.root.rotation.y = i % 2 ? -0.5 : 0.5;
  scene.add(b.root);
  return b;
});

// --- post: misregistration + paper + halftone background ---
const rt = new THREE.WebGLRenderTarget(res.x, res.y, { samples: 4 });
const idRt = new THREE.WebGLRenderTarget(res.x, res.y);
const rt2 = new THREE.WebGLRenderTarget(res.x, res.y, { samples: 4 });
const split = new URLSearchParams(location.search).has('split');
const post = new THREE.ShaderMaterial({
  uniforms: { tScene: { value: rt.texture }, tScene2: { value: rt2.texture }, tId: { value: idRt.texture }, uSplit: { value: split ? 1 : 0 }, uRes: { value: res }, uTime: { value: 0 }, uMis: { value: 1.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.,1.); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tScene; uniform sampler2D tScene2; uniform sampler2D tId; uniform float uSplit; uniform vec2 uRes; uniform float uTime; uniform float uMis; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
    void main(){
      vec2 px = 1.0 / uRes;
      vec2 off = (vUv - 0.5) * uMis * 2.0 * px * 3.0 + vec2(uMis) * px;
      // diagonal panel split: left panel = cam A, right = cam B
      float side = (vUv.x - 0.5) + (vUv.y - 0.5) * 0.35;
      bool B = uSplit > 0.5 && side > 0.0;
      vec4 s = B ? texture2D(tScene2, vUv) : texture2D(tScene, vUv);
      float r = B ? texture2D(tScene2, vUv + off).r : texture2D(tScene, vUv + off).r;
      float b = B ? texture2D(tScene2, vUv - off).b : texture2D(tScene, vUv - off).b;
      vec3 col = vec3(r, s.g, b);
      // inner ink: ID buffer edges (only meaningful for cam A here)
      if (!B) {
        vec3 i0 = texture2D(tId, vUv).rgb;
        float e = 0.0;
        for (int k = 0; k < 4; k++) {
          vec2 o = vec2(k == 0 ? 1.5 : k == 1 ? -1.5 : 0.0, k == 2 ? 1.5 : k == 3 ? -1.5 : 0.0) * px;
          e += step(0.01, distance(i0, texture2D(tId, vUv + o).rgb));
        }
        col = mix(col, vec3(0.10, 0.06, 0.15), clamp(e, 0.0, 1.0) * s.a);
      }
      // background: warm paper + radial burst + halftone
      vec2 c = vUv - vec2(0.5, 0.42);
      float ang = atan(c.y, c.x);
      float rays = step(0.5, fract(ang * 3.183 * 4.0 + uTime * 0.02));
      vec3 paperA = vec3(0.99, 0.93, 0.80), paperB = vec3(0.98, 0.82, 0.62);
      vec3 bg = mix(paperA, paperB, rays * 0.6);
      float a = 0.785398; mat2 rot = mat2(cos(a),-sin(a),sin(a),cos(a));
      vec2 p = rot * gl_FragCoord.xy / 7.0; float d = length(fract(p) - 0.5);
      float dark = smoothstep(0.15, 0.75, length(c));
      bg = mix(bg, vec3(0.91, 0.20, 0.31), (1.0 - smoothstep(sqrt(dark)*0.6 - 0.04, sqrt(dark)*0.6 + 0.04, d)) * 0.85);
      float alpha = max(s.a, max(texture2D(tScene, vUv + off).a, texture2D(tScene, vUv - off).a));
      if (B) alpha = max(s.a, max(texture2D(tScene2, vUv + off).a, texture2D(tScene2, vUv - off).a));
      col = mix(bg, col, alpha);
      if (uSplit > 0.5 && abs(side) < 0.006) col = vec3(0.98, 0.95, 0.88);
      if (uSplit > 0.5 && abs(side) < 0.0025) col = vec3(0.10, 0.06, 0.15);
      col *= 0.94 + 0.06 * hash(floor(gl_FragCoord.xy / 2.0)); // paper grain
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const quad = new THREE.Mesh(new THREE.BufferGeometry(), post);
quad.geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
quad.geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
quad.frustumCulled = false;
const postScene = new THREE.Scene(); postScene.add(quad);
const postCam = new THREE.OrthographicCamera();

// --- loop with "on twos" character animation, smooth camera ---
const frameTimes: number[] = [];
const cpuTimes: number[] = [];
let sceneCalls = 0;
const closeCam = new THREE.PerspectiveCamera(22, W / H, 0.1, 100);
let last = performance.now();
const t0 = last;
function tick(now: number) {
  frameTimes.push(now - last); last = now;
  const t = (now - t0) / 1000;
  const stepped = Math.floor(t * 12) / 12; // animation on twos @24fps base
  bears.forEach((b, i) => {
    const ph = stepped * 2.2 + i;
    b.root.scale.set(1 + Math.sin(ph * 2) * 0.04, 1 - Math.sin(ph * 2) * 0.04, 1);
    b.head.rotation.z = Math.sin(ph) * 0.12;
    b.aL.rotation.z = Math.sin(ph * 2) * 0.4; b.aR.rotation.z = -Math.sin(ph * 2 + 1) * 0.4;
  });
  camera.position.x = Math.sin(t * 0.4) * 1.2; camera.lookAt(0, 1.1, 0);
  post.uniforms.uTime!.value = t;
  const c0 = performance.now();
  renderer.setRenderTarget(rt); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(scene, camera);
  sceneCalls = renderer.info.render.calls;
  // ID pass: swap materials, hide outline hulls
  for (const e of idMeshes) e.mesh.material = e.id;
  scene.traverse(o => { if (o.userData.outline) o.visible = false; });
  renderer.setRenderTarget(idRt); renderer.setClearColor(0, 1); renderer.clear(); renderer.render(scene, camera);
  for (const e of idMeshes) e.mesh.material = e.mat;
  scene.traverse(o => { if (o.userData.outline) o.visible = true; });
  if (split) { closeCam.position.set(2.5 + Math.sin(t) * 0.3, 2.4, 4.2); closeCam.lookAt(1.6, 1.8, 0); renderer.setRenderTarget(rt2); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(scene, closeCam); }
  cpuTimes.push(performance.now() - c0);
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

(window as unknown as { __spike: () => object }).__spike = () => {
  const ft = frameTimes.slice(30).sort((a, b) => a - b);
  const avg = ft.reduce((a, b) => a + b, 0) / ft.length;
  return { frames: ft.length, avgMs: +avg.toFixed(2), p95Ms: +(ft[Math.floor(ft.length * 0.95)] ?? 0).toFixed(2), sceneCalls, cpuAvgMs: +(cpuTimes.slice(30).reduce((a, b) => a + b, 0) / Math.max(1, cpuTimes.length - 30)).toFixed(2), gl: renderer.getContext().getParameter(renderer.getContext().VERSION) };
};
