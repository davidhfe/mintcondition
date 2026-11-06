/**
 * Comic materials. Three cel bands; the middle band is a rotated screen-space
 * dot pattern (Ben-Day / halftone). Hard specular "pop" for glossy toys,
 * a coloured rim on the shadow side (player colour), and a hit flash.
 */
import * as THREE from 'three';

/** Uniforms shared by every comic material (light, dot size, outline width). */
export const shared = {
  uLight: { value: new THREE.Vector3(-0.55, 0.75, 0.6).normalize() },
  uDot: { value: 5.0 },
  uRes: { value: new THREE.Vector2(1280, 720) },
  uOutline: { value: 4.0 },
  uInk: { value: new THREE.Color(0x1a1026) },
};

const vert = /* glsl */ `
  varying vec3 vN; varying vec3 vView; varying vec3 vWorld;
  void main(){
    vec4 local = vec4(position, 1.0);
    vec3 nrm = normal;
    #ifdef USE_INSTANCING
      local = instanceMatrix * local;
      nrm = mat3(instanceMatrix) * nrm;
    #endif
    vec4 w = modelMatrix * local;
    vWorld = w.xyz;
    vec4 mv = viewMatrix * w;
    vView = mv.xyz;
    vN = normalize(normalMatrix * nrm);
    gl_Position = projectionMatrix * mv;
  }`;

const frag = /* glsl */ `
  uniform vec3 uColor; uniform vec3 uShade; uniform vec3 uRim; uniform vec3 uLight;
  uniform float uDot; uniform float uGloss; uniform float uFlash; uniform float uGlow; uniform float uRimAmt; uniform float uOpacity;
  uniform vec3 uFlashColor; uniform vec3 uColor2; uniform float uPattern; uniform float uPatScale;
  varying vec3 vN; varying vec3 vView; varying vec3 vWorld;
  float dots(vec2 fc, float scale, float v){
    const float a = 0.785398; mat2 r = mat2(cos(a), -sin(a), sin(a), cos(a));
    vec2 p = r * fc / scale; vec2 c = fract(p) - 0.5;
    float d = length(c); float rad = sqrt(clamp(v, 0.0, 1.0)) * 0.72;
    float aa = fwidth(d) * 1.1;
    return 1.0 - smoothstep(rad - aa, rad + aa, d);
  }
  void main(){
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 l = normalize((viewMatrix * vec4(uLight, 0.0)).xyz);
    float ndl = dot(n, l);
    vec3 v = normalize(-vView);
    vec3 col = uColor;
    if (uPattern > 0.5) {
      float p = uPattern < 1.5
        ? mod(floor(vWorld.x * uPatScale) + floor(vWorld.z * uPatScale), 2.0)
        : step(0.5, fract((vWorld.x + vWorld.y + vWorld.z * 0.5) * uPatScale));
      col = mix(uColor, uColor2, p);
    }
    if (uGlow < 0.5) {
      float shadeAmt = smoothstep(0.42, -0.15, ndl);
      vec3 sh = uPattern > 0.5 ? col * 0.55 * vec3(0.85, 0.8, 1.05) : uShade;
      col = mix(col, sh, dots(gl_FragCoord.xy, uDot, shadeAmt));
      if (ndl < -0.3) col = sh;
      vec3 h = normalize(l + v);
      float spec = pow(max(dot(n, h), 0.0), 70.0);
      if (uGloss > 0.0 && spec > 0.55) col = mix(col, vec3(1.0, 0.98, 0.93), uGloss);
      float fres = 1.0 - max(dot(n, v), 0.0);
      if (uRimAmt > 0.0 && fres > 0.6 && ndl < 0.25) col = mix(col, uRim, uRimAmt);
    }
    col = mix(col, uFlashColor, uFlash);
    gl_FragColor = vec4(col, uOpacity);
  }`;

const outlineVert = /* glsl */ `
  uniform vec2 uRes; uniform float uOutline; uniform float uWidthScale;
  void main(){
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec3 nv = normalize(normalMatrix * normal);
    vec2 nc = (projectionMatrix * vec4(nv, 0.0)).xy;
    float len = length(nc);
    if (len > 1e-5) clip.xy += (nc / len) * uOutline * uWidthScale * clip.w * 2.0 / uRes;
    gl_Position = clip;
  }`;
const outlineFrag = /* glsl */ `uniform vec3 uInk; void main(){ gl_FragColor = vec4(uInk, 1.0); }`;

/** Cooler, darker, slightly more saturated — how a comic colourist picks a shadow. */
export function shadeOf(c: number): THREE.Color {
  const col = new THREE.Color(c);
  const hsl = { h: 0, s: 0, l: 0 };
  col.getHSL(hsl);
  const target = 0.78; // violet
  let dh = target - hsl.h;
  if (dh > 0.5) dh -= 1;
  if (dh < -0.5) dh += 1;
  return new THREE.Color().setHSL((hsl.h + dh * 0.12 + 1) % 1, Math.min(1, hsl.s * 1.05 + 0.05), hsl.l * 0.52);
}

export interface ComicOpts {
  shade?: number;
  gloss?: number;
  glow?: boolean;
  rim?: number;
  rimAmt?: number;
  opacity?: number;
  /** 'checker' (world XZ) or 'stripe' (diagonal) with a second colour. */
  pattern?: { kind: 'checker' | 'stripe'; color2: number; scale: number };
}

export type ComicMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uColor: { value: THREE.Color };
    uShade: { value: THREE.Color };
    uRim: { value: THREE.Color };
    uFlash: { value: number };
    uFlashColor: { value: THREE.Color };
    uGloss: { value: number };
    uGlow: { value: number };
    uRimAmt: { value: number };
  };
};

export function comic(color: number, o: ComicOpts = {}): ComicMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uShade: { value: o.shade !== undefined ? new THREE.Color(o.shade) : shadeOf(color) },
      uRim: { value: new THREE.Color(o.rim ?? 0xffe9a8) },
      uRimAmt: { value: o.rimAmt ?? 1 },
      uGloss: { value: o.gloss ?? 0 },
      uGlow: { value: o.glow ? 1 : 0 },
      uFlash: { value: 0 },
      uFlashColor: { value: new THREE.Color(0xffffff) },
      uOpacity: { value: o.opacity ?? 1 },
      uPattern: { value: o.pattern ? (o.pattern.kind === 'checker' ? 1 : 2) : 0 },
      uColor2: { value: new THREE.Color(o.pattern?.color2 ?? 0) },
      uPatScale: { value: o.pattern?.scale ?? 1 },
      uLight: shared.uLight,
      uDot: shared.uDot,
    },
    transparent: (o.opacity ?? 1) < 1,
    depthWrite: (o.opacity ?? 1) >= 1,
  }) as ComicMaterial;
}

export function outlineMaterial(widthScale = 1): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: outlineVert,
    fragmentShader: outlineFrag,
    side: THREE.BackSide,
    uniforms: { uRes: shared.uRes, uOutline: shared.uOutline, uInk: shared.uInk, uWidthScale: { value: widthScale } },
  });
}

export const OUTLINE = outlineMaterial(1);
export const OUTLINE_THIN = outlineMaterial(0.55);

/** Layer used for outline hulls so the ID pass can skip them via camera layers. */
export const LAYER_OUTLINE = 1;
