// Shaders da cena do hero: ruído simplex 2D (Ashima Arts, MIT), céu e água.

export const noiseGLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;

export const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Azul-noite em degradê, faixa morna baixa atrás da casa e véus de nuvem. */
export const skyFragment = /* glsl */ `
uniform float time;
varying vec3 vDir;
void main() {
  float h = vDir.y;
  vec3 zenith = vec3(0.002, 0.005, 0.018);
  vec3 mid = vec3(0.006, 0.016, 0.05);
  vec3 horizon = vec3(0.03, 0.05, 0.105);
  vec3 col = mix(horizon, mid, smoothstep(0.0, 0.16, h));
  col = mix(col, zenith, smoothstep(0.16, 0.75, h));
  float back = pow(max(0.0, dot(normalize(vec3(vDir.x, 0.0, vDir.z) + 1e-5), vec3(0.0, 0.0, -1.0))), 5.0);
  col += vec3(0.42, 0.25, 0.2) * back * exp(-max(h, 0.0) * 9.0) * 0.45;
  float n = snoise(vec2(vDir.x * 2.6 + time * 0.004, vDir.y * 11.0 + vDir.z)) * 0.5 + 0.5;
  col += vec3(0.01, 0.013, 0.022) * smoothstep(0.6, 0.95, n) * smoothstep(0.03, 0.18, h) * (1.0 - smoothstep(0.28, 0.6, h));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const waterVertex = /* glsl */ `
uniform mat4 textureMatrix;
varying vec4 vUv;
varying vec3 vWorld;
void main() {
  vUv = textureMatrix * vec4(position, 1.0);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

/**
 * Lago: o reflexo (Reflector) deslocado por ondulações alongadas na
 * horizontal, mais fortes perto da câmera; fresnel e névoa como no resto.
 */
export const waterFragment = /* glsl */ `
uniform vec3 color;
uniform sampler2D tDiffuse;
uniform float time;
uniform vec3 fogColor;
uniform float fogDensity;
varying vec4 vUv;
varying vec3 vWorld;
void main() {
  vec2 p = vWorld.xz;
  float d = length(vWorld - cameraPosition);
  // Reflexo de lago calmo: pouco deslocamento lateral (variação lenta) e um
  // arrasto vertical maior, que estica as luzes em faixas que tremulam.
  float nx = snoise(p * vec2(0.18, 0.28) + vec2(time * 0.05, time * 0.07));
  float ny = snoise(p * vec2(0.05, 0.9) + vec2(17.0, time * 0.16)) + 0.4 * snoise(p * vec2(0.12, 2.6) - time * 0.3);
  float k = 0.0045 * (1.0 - smoothstep(18.0, 150.0, d)) + 0.0008;
  vec4 uv = vUv;
  uv.x += nx * k * 0.16 * uv.w;
  uv.y += ny * k * uv.w;
  vec3 refl = texture2DProj(tDiffuse, uv).rgb;
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = 0.02 + 0.98 * pow(1.0 - clamp(V.y, 0.0, 1.0), 5.0);
  // Olhando para baixo (perto, sob o título) o lago é escuro e o reflexo
  // fraco; rente ao horizonte, espelho.
  vec3 col = mix(color, refl * mix(0.3, 0.95, fres), clamp(0.45 + fres, 0.0, 1.0));
  float f = 1.0 - exp(-fogDensity * fogDensity * d * d);
  col = mix(col, fogColor, f);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
