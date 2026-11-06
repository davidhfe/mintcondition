/**
 * The single full-screen pass that turns renders into a comic page:
 * inner ink lines (ID-buffer edges), CMY misregistration, halftone backdrop,
 * diagonal panel split, radial speed lines, two-tone impact frames, grain.
 */
import * as THREE from 'three';

export function createPost() {
  const uniforms = {
    tScene: { value: null as THREE.Texture | null },
    tId: { value: null as THREE.Texture | null },
    tAlt: { value: null as THREE.Texture | null },
    tAltId: { value: null as THREE.Texture | null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uMis: { value: 1.2 },
    uInkW: { value: 1.5 },
    uInk: { value: new THREE.Color(0x1a1026) },
    uPaper: { value: new THREE.Color(0xfff4e0) },
    uBgA: { value: new THREE.Color(0xfff1d6) },
    uBgB: { value: new THREE.Color(0xf6c58a) },
    uBgDot: { value: new THREE.Color(0xe8344e) },
    uBgDotAmt: { value: 0.75 },
    uBurst: { value: 0.5 },
    uDot: { value: 7 },
    uSplit: { value: 0 },
    uSplitAngle: { value: 0.32 },
    uSpeed: { value: 0 },
    uFocus: { value: new THREE.Vector2(0.5, 0.5) },
    uImpact: { value: 0 },
    uImpactA: { value: new THREE.Color(0xfff4e0) },
    uImpactB: { value: new THREE.Color(0x1a1026) },
    uFlash: { value: 0 },
    uFlashColor: { value: new THREE.Color(0xffffff) },
    uVignette: { value: 0.35 },
    uGrain: { value: 0.06 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tScene; uniform sampler2D tId; uniform sampler2D tAlt; uniform sampler2D tAltId;
      uniform vec2 uRes; uniform float uTime; uniform float uMis; uniform float uInkW;
      uniform vec3 uInk; uniform vec3 uPaper; uniform vec3 uBgA; uniform vec3 uBgB; uniform vec3 uBgDot;
      uniform float uBgDotAmt; uniform float uBurst; uniform float uDot;
      uniform float uSplit; uniform float uSplitAngle; uniform float uSpeed; uniform vec2 uFocus;
      uniform float uImpact; uniform vec3 uImpactA; uniform vec3 uImpactB;
      uniform float uFlash; uniform vec3 uFlashColor; uniform float uVignette; uniform float uGrain;
      varying vec2 vUv;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
      float dotsAt(vec2 fc, float scale, float v, float ang){
        mat2 r = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
        vec2 p = r * fc / scale; float d = length(fract(p) - 0.5);
        float rad = sqrt(clamp(v, 0.0, 1.0)) * 0.72; float aa = fwidth(d);
        return 1.0 - smoothstep(rad - aa, rad + aa, d);
      }
      vec3 background(vec2 uv){
        vec2 c = uv - vec2(0.5, 0.45);
        c.x *= uRes.x / uRes.y;
        float ang = atan(c.y, c.x);
        float rays = step(0.5, fract(ang * 3.18309 * 5.0 + uTime * 0.015));
        vec3 bg = mix(uBgB, uBgA, smoothstep(-0.1, 0.9, uv.y));
        bg = mix(bg, mix(bg, uBgA, 0.55), rays * uBurst);
        float dark = smoothstep(0.2, 1.0, length(c));
        bg = mix(bg, uBgDot, dotsAt(gl_FragCoord.xy, uDot, dark * 0.55, 0.785) * uBgDotAmt);
        return bg;
      }
      vec4 sampleSide(sampler2D tex, sampler2D idTex, vec2 uv, vec2 off){
        vec4 s = texture2D(tex, uv);
        float r = texture2D(tex, uv + off).r; float b = texture2D(tex, uv - off).b;
        float a = max(s.a, max(texture2D(tex, uv + off).a, texture2D(tex, uv - off).a));
        vec3 col = vec3(mix(s.r, r, step(0.01, texture2D(tex, uv + off).a)), s.g, mix(s.b, b, step(0.01, texture2D(tex, uv - off).a)));
        // inner ink from ID edges
        vec2 px = uInkW / uRes;
        vec3 i0 = texture2D(idTex, uv).rgb;
        float e = step(0.002, distance(i0, texture2D(idTex, uv + vec2(px.x, 0.0)).rgb))
                + step(0.002, distance(i0, texture2D(idTex, uv - vec2(px.x, 0.0)).rgb))
                + step(0.002, distance(i0, texture2D(idTex, uv + vec2(0.0, px.y)).rgb))
                + step(0.002, distance(i0, texture2D(idTex, uv - vec2(0.0, px.y)).rgb));
        col = mix(col, uInk, clamp(e, 0.0, 1.0) * step(0.01, s.a + 0.0));
        return vec4(col, a);
      }
      void main(){
        vec2 px = 1.0 / uRes;
        vec2 off = ((vUv - 0.5) * 2.0 + vec2(0.6, -0.4)) * uMis * px;

        // panel split: B (alt camera) on the right of a slanted gutter
        vec2 sp = vUv - 0.5; sp.x *= uRes.x / uRes.y;
        float side = sp.x + sp.y * uSplitAngle - (1.0 - uSplit) * 1.4;
        bool B = uSplit > 0.001 && side > 0.0;

        vec4 s = B ? sampleSide(tAlt, tAltId, vUv, off) : sampleSide(tScene, tId, vUv, off);
        // render targets hold premultiplied colour (MSAA edges, glass): composite accordingly
        vec3 col = background(vUv) * (1.0 - s.a) + s.rgb;

        if (uSplit > 0.001) {
          float g = abs(side) * uRes.y;
          col = mix(col, uPaper, step(g, 7.0));
          col = mix(col, uInk, step(abs(g - 7.0), 2.0));
        }

        // radial speed lines
        if (uSpeed > 0.001) {
          vec2 d = vUv - uFocus; d.x *= uRes.x / uRes.y;
          float a = atan(d.y, d.x);
          float r = length(d);
          float lane = floor(a * 70.0);
          float n = hash(vec2(lane, floor(uTime * 12.0)));
          float w = fract(a * 70.0);
          float line = step(0.72, n) * step(abs(w - 0.5), 0.18 + 0.2 * n);
          float reach = smoothstep(0.18 + 0.25 * n, 0.55 + 0.2 * n, r);
          col = mix(col, uPaper, line * reach * uSpeed * 0.9);
        }

        // two-tone impact frame
        if (uImpact > 0.001) {
          float l = dot(col, vec3(0.3, 0.59, 0.11));
          vec3 two = l > 0.55 ? uImpactA : uImpactB;
          col = mix(col, two, uImpact);
        }

        col = mix(col, uFlashColor, uFlash);
        vec2 v = vUv - 0.5;
        col *= 1.0 - uVignette * dot(v, v) * 1.6;
        col *= 1.0 - uGrain + uGrain * hash(floor(gl_FragCoord.xy / 2.0) + floor(uTime * 12.0));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const quad = new THREE.Mesh(geo, material);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  return { uniforms, scene, camera: new THREE.OrthographicCamera() };
}

export type Post = ReturnType<typeof createPost>;
