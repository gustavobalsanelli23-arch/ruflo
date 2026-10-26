// Cena 3D do hero (three.js): a casa da VOP — o símbolo da marca, telhado e
// cinco traços — como uma instalação de luz suspensa sobre um lago à noite,
// entre montanhas. Cada capítulo leva a câmera a um ângulo diferente; parada,
// ela respira devagar e segue o ponteiro. Carregada só depois do load (o
// quadro parado em public/images/hero, gerado desta cena por `npm run poster`,
// é a primeira pintura).
import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  FogExp2,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  NeutralToneMapping,
} from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { MARK_BARS, MARK_ROOF, markToWorld } from './mark';
import { noiseGLSL, waterFragment, waterVertex, skyFragment, skyVertex } from './shaders';

/** Onde a câmera fica em cada capítulo (posição, alvo). Mesma ordem de data/content → chapters. */
const SHOTS: readonly { pos: [number, number, number]; look: [number, number, number] }[] = [
  { pos: [0, 2.2, 50], look: [0, 1.6, 0] }, // Visão: de frente, rente à água, como quem chega pelo lago
  { pos: [-31, 2.6, 41], look: [0, 1.8, 0] }, // Assessoria: pela esquerda
  { pos: [33, 8.5, 40], look: [0, 1.6, 0] }, // Investimentos: pela direita, mais alto
  { pos: [8, 1.2, 40], look: [0, 2.8, 0] }, // Oportunidades: mais perto, de baixo para cima
  { pos: [-12, 15, 45], look: [0, 0.6, 0] }, // Crédito: do alto, o lago inteiro
  { pos: [19, 3.4, 63], look: [0, 2.2, 0] }, // Segurança: aberto, com as montanhas
];

export interface VopScene {
  setChapter(index: number, instant?: boolean): void;
  setPaused(paused: boolean): void;
  setActive(active: boolean): void;
  resize(): void;
  dispose(): void;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Gradiente radial para o brilho da luz sobre a água (sem textura externa). */
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Ruído de valor determinístico (montanhas iguais a cada carga). */
function makeNoise(seed: number) {
  const hash = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = smooth(x - xi);
    const yf = smooth(y - yi);
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (x: number, y: number, octaves = 5) => {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    for (let o = 0; o < octaves; o++) {
      sum += amp * value(x * f, y * f);
      f *= 2.03;
      amp *= 0.5;
    }
    return sum;
  };
}

/**
 * Cordilheira facetada: sobe para fora (side = −1 esquerda, +1 direita) e
 * desce em direção ao centro, como as encostas que emolduram o lago.
 */
function ridge(side: -1 | 1, seed: number) {
  const noise = makeNoise(seed);
  const w = 170;
  const d = 70;
  const geo = new PlaneGeometry(w, d, 220, 80);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position') as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const u = (x / w + 0.5) * side + (side < 0 ? 1 : 0); // 0 perto do centro → 1 para fora
    const v = z / d + 0.5; // 0 fundo → 1 frente
    const rise = Math.pow(MathUtils.smoothstep(u, 0, 0.7), 1.25);
    const front = MathUtils.smoothstep(v, 0, 0.3) * (1 - MathUtils.smoothstep(v, 0.62, 1));
    // picos ao longo da crista (silhueta) e rocha miúda nas encostas
    const peaks = noise(x * 0.028 + seed, seed * 0.37, 4);
    const n = noise(x * 0.05 + 3, z * 0.06);
    const h = (1.2 + 36 * rise * (0.45 + 1.1 * peaks)) * front * (0.65 + 0.6 * n) + noise(x * 0.35, z * 0.35, 4) * 2.2 * front * (0.3 + rise) - 1.5;
    pos.setY(i, h);
  }
  geo.computeVertexNormals();
  const mesh = new Mesh(
    geo,
    new MeshStandardMaterial({ color: '#1f2839', roughness: 0.92, metalness: 0 }),
  );
  mesh.position.set(side * (w / 2 + 12), 0, -36);
  return mesh;
}

export function createVopScene(canvas: HTMLCanvasElement, opts: { reduce: boolean; onReady?: () => void }): VopScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  // Celular: menos pixels internos e um espelho menor (a água já é ondulada).
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.35 : 1.6));
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const fogColor = new Color('#0d1528');
  scene.fog = new FogExp2(fogColor, 0.0115);
  const camera = new PerspectiveCamera(34, 1, 0.1, 900);

  // Céu: gradiente azul-noite com uma faixa morna no horizonte, atrás da casa.
  const sky = new Mesh(
    new SphereGeometry(600, 32, 16),
    new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { time: { value: 0 } },
      vertexShader: skyVertex,
      fragmentShader: noiseGLSL + skyFragment,
    }),
  );
  scene.add(sky);

  // Estrelas.
  const starCount = 900;
  const starPos = new Float32Array(starCount * 3);
  const rand = makeNoise(9);
  for (let i = 0; i < starCount; i++) {
    const theta = rand(i * 1.7, 2.3, 1) * Math.PI * 2 * 7.3;
    const phi = 0.05 + Math.pow(rand(i * 0.9, 7.1, 1), 1.4) * 1.25;
    const r = 520;
    starPos.set([r * Math.cos(theta) * Math.cos(phi), r * Math.sin(phi), r * Math.sin(theta) * Math.cos(phi)], i * 3);
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new BufferAttribute(starPos, 3));
  scene.add(new Points(starGeo, new PointsMaterial({ color: '#cfd8ee', size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0.6, fog: false })));

  // Luzes: lua fria por trás à esquerda (contorno das montanhas) e céu.
  scene.add(new HemisphereLight('#2a3a63', '#04060b', 0.8));
  // Lua alta à direita, um pouco à frente: acende as faces rochosas viradas para ela.
  const moon = new DirectionalLight('#b4c6ee', 2.6);
  moon.position.set(70, 60, 10);
  scene.add(moon);
  const rim = new DirectionalLight('#7f93c4', 0.9);
  rim.position.set(-60, 40, -90);
  scene.add(rim);

  scene.add(ridge(-1, 3), ridge(1, 11));
  // Cordilheira do fundo, apagada pela névoa.
  const back = ridge(1, 21);
  back.scale.set(2.2, 0.8, 1);
  back.position.set(-40, -1, -150);
  scene.add(back);

  // Água: espelho com ondulação, fresnel e névoa (shader próprio sobre o Reflector).
  const water = new Reflector(new PlaneGeometry(900, 900), {
    textureWidth: small ? 512 : 1024,
    textureHeight: small ? 512 : 1024,
    color: '#0a1222',
    multisample: 2,
    shader: {
      name: 'VopWater',
      uniforms: {
        color: { value: null },
        tDiffuse: { value: null },
        textureMatrix: { value: null },
        time: { value: 0 },
        fogColor: { value: fogColor },
        fogDensity: { value: 0.0115 },
      },
      vertexShader: waterVertex,
      fragmentShader: noiseGLSL + waterFragment,
    },
  });
  water.rotation.x = -Math.PI / 2;
  scene.add(water);
  const waterUniforms = (water.material as ShaderMaterial).uniforms;

  // A casa da VOP: telhado e traços como feixes de luz morna.
  const mark = new Group();
  const beam = new MeshStandardMaterial({ color: '#1a1412', emissive: '#ffe2d6', emissiveIntensity: 1.7, roughness: 0.5 });
  const T = 0.2;
  for (const [x, top, bottom] of MARK_BARS) {
    const a = markToWorld(x, top);
    const b = markToWorld(x, bottom);
    const m = new Mesh(new BoxGeometry(T, a.y - b.y, T), beam);
    m.position.set(a.x, (a.y + b.y) / 2, 0);
    mark.add(m);
  }
  const [l, apex, r] = MARK_ROOF.map(([x, y]) => markToWorld(x, y));
  for (const [p, q] of [
    [l, apex],
    [apex, r],
  ] as const) {
    const len = Math.hypot(q.x - p.x, q.y - p.y) + T * 0.6;
    const m = new Mesh(new BoxGeometry(len, T, T), beam);
    m.position.set((p.x + q.x) / 2, (p.y + q.y) / 2, 0);
    m.rotation.z = Math.atan2(q.y - p.y, q.x - p.x);
    mark.add(m);
  }
  scene.add(mark);

  // Luz derramada na água sob a casa (um brilho aditivo rente à superfície).
  const spill = new Mesh(
    new PlaneGeometry(30, 18),
    new MeshBasicMaterial({ map: glowTexture(), color: '#e8c1b2', transparent: true, opacity: 0.1, blending: AdditiveBlending, depthWrite: false }),
  );
  spill.rotation.x = -Math.PI / 2;
  spill.position.set(0, 0.03, 0.5);
  scene.add(spill);

  // Pós: brilho (bloom) nos feixes e nos reflexos.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new Vector2(512, 512), 0.62, 0.32, 0.72);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Câmera: viagem entre capítulos, respiração lenta e olhar com o ponteiro.
  const from = { pos: new Vector3(), look: new Vector3() };
  const to = { pos: new Vector3(...SHOTS[0].pos), look: new Vector3(...SHOTS[0].look) };
  const cur = { pos: to.pos.clone(), look: to.look.clone() };
  let travelStart = -1;
  const TRAVEL = 2.6;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let paused = opts.reduce;
  let active = true;
  let raf = 0;
  let readySent = false;
  let clock = 0;
  let last = performance.now();

  const fit = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const aspect = w / h;
    camera.aspect = aspect;
    // O campo horizontal nunca fica menor que ~44°: no celular em pé a casa cabe inteira.
    const hfovMin = MathUtils.degToRad(44);
    const vfov = Math.max(MathUtils.degToRad(34), 2 * Math.atan(Math.tan(hfovMin / 2) / aspect));
    camera.fov = MathUtils.radToDeg(vfov);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
  };

  const place = () => {
    // Em pé (celular), a câmera chega mais perto e o alvo desce: a casa
    // cresce e sobe para a metade de cima, longe do título.
    const portrait = camera.aspect < 1;
    const near = portrait ? 0.6 : 1;
    const lift = portrait ? -5.2 : 0;
    // A respiração cresce nos primeiros segundos: o 1º quadro é igual ao quadro parado.
    const bob = paused ? 0 : Math.min(1, clock / 4);
    camera.position.set(
      cur.look.x + (cur.pos.x - cur.look.x) * near + Math.sin(clock * 0.11) * 0.6 * bob + pointer.x * 1.1,
      cur.pos.y + Math.sin(clock * 0.17 + 1) * 0.18 * bob - pointer.y * 0.45,
      cur.look.z + (cur.pos.z - cur.look.z) * near,
    );
    camera.lookAt(cur.look.x, cur.look.y + lift, cur.look.z);
  };

  const frame = (now: number) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused) clock += dt;
    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;
    if (travelStart >= 0) {
      const t = Math.min(1, (now - travelStart) / 1000 / TRAVEL);
      const k = ease(t);
      cur.pos.lerpVectors(from.pos, to.pos, k);
      cur.look.lerpVectors(from.look, to.look, k);
      if (t >= 1) travelStart = -1;
    }
    waterUniforms.time.value = clock;
    (sky.material as ShaderMaterial).uniforms.time.value = clock;
    beam.emissiveIntensity = 1.7 + Math.sin(clock * 0.9) * 0.12;
    place();
    composer.render();
    if (!readySent) {
      readySent = true;
      canvas.dataset.ready = '';
      opts.onReady?.();
    }
    const moving = travelStart >= 0 || Math.abs(pointer.tx - pointer.x) > 0.001 || Math.abs(pointer.ty - pointer.y) > 0.001;
    if (active && (!paused || moving)) raf = requestAnimationFrame(frame);
  };
  const kick = () => {
    if (!raf && active) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || opts.reduce) return;
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    kick();
  };
  const onResize = () => {
    fit();
    kick();
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('resize', onResize);
  fit();
  kick();

  return {
    setChapter(index, instant = false) {
      const shot = SHOTS[Math.max(0, Math.min(SHOTS.length - 1, index))];
      canvas.dataset.chapter = String(index);
      to.pos.set(...shot.pos);
      to.look.set(...shot.look);
      if (instant || opts.reduce) {
        cur.pos.copy(to.pos);
        cur.look.copy(to.look);
        travelStart = -1;
      } else {
        from.pos.copy(cur.pos);
        from.look.copy(cur.look);
        travelStart = performance.now();
      }
      kick();
    },
    setPaused(p) {
      paused = p;
      kick();
    },
    setActive(a) {
      active = a;
      if (a) kick();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    resize: onResize,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
      composer.dispose();
      renderer.dispose();
    },
  };
}
