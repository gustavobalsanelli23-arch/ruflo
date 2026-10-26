// Percurso 3D pelo imóvel: cada ambiente é um painel suspenso num corredor
// em perspectiva, alternando de lado; a câmera avança de um para o outro e,
// parada, encara o painel atual. Funções puras, testáveis.

/** Perspectiva do palco (px): a distância do olho ao plano da tela. */
export const PERSPECTIVE = 1000;
/** Profundidade entre um ambiente e o seguinte (px). */
export const SPACING = 1500;
/** Quanto um painel lateral gira para encarar o eixo do corredor (graus). */
export const YAW = 16;

export interface Size {
  width: number;
  height: number;
}

/**
 * Tamanho do painel: a foto inteira, sem recorte, cabendo na área livre
 * entre a barra de cima e os controles de baixo.
 */
export function panelSize(imgW: number, imgH: number, vw: number, vh: number): Size {
  const r = imgW / imgH;
  const phone = vw < 640;
  const maxW = vw * (phone ? 0.84 : 0.6);
  const maxH = vh * (phone ? 0.46 : 0.58);
  let width = maxW;
  let height = width / r;
  if (height > maxH) {
    height = maxH;
    width = height * r;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

/** Afastamento lateral entre os lados do corredor (px). */
export const laneSpread = (vw: number) => Math.round(vw * (vw < 640 ? 0.9 : 0.56));

/** Lado do ambiente `i`: o primeiro no eixo, depois direita, esquerda… */
export const lane = (i: number) => (i <= 0 ? 0 : i % 2 ? 1 : -1);

export interface Pose {
  x: number;
  z: number;
  /** Giro em Y (graus): o painel encara o eixo do corredor. */
  yaw: number;
}

/** Onde o painel do ambiente `i` fica no corredor. */
export function roomPose(i: number, spread: number): Pose {
  const l = lane(i);
  return { x: l * spread, z: -i * SPACING, yaw: l * YAW };
}

const smooth = (f: number) => f * f * (3 - 2 * f);

/**
 * Câmera na posição `cam` (0 = diante do 1º ambiente, 1 = do 2º…; valores
 * fracionários no meio do caminho). Avança em profundidade na proporção de
 * `cam` e desliza de lado e gira com uma curva suave, para encarar cada painel.
 */
export function cameraAt(cam: number, total: number, spread: number): { x: number; yaw: number; z: number } {
  const last = Math.max(0, total - 1);
  const c = Math.min(Math.max(cam, 0), last);
  const i = Math.floor(c);
  const f = smooth(c - i);
  const a = roomPose(i, spread);
  const b = roomPose(Math.min(i + 1, last), spread);
  return { x: a.x + (b.x - a.x) * f, yaw: a.yaw + (b.yaw - a.yaw) * f, z: cam * SPACING };
}

/**
 * Aparência do painel `i` com a câmera em `cam`: os que estão à frente ganham
 * névoa com a distância; o que a câmera atravessa some antes de chegar ao olho.
 */
export function depthLook(i: number, cam: number): { fog: number; opacity: number; hidden: boolean } {
  const d = i - cam;
  if (d < -0.6 || d > 2.6) return { fog: 1, opacity: 0, hidden: true };
  return {
    fog: d > 0 ? Math.min(0.82, d * 0.5) : 0,
    opacity: d < 0 ? Math.max(0, 1 + d / 0.55) : 1,
    hidden: false,
  };
}

/** Estado do percurso. */
export interface Walk {
  index: number;
  /** +1 indo em frente, −1 voltando. */
  dir: number;
  /** Passou do último ambiente: cartão de encerramento. */
  ended: boolean;
}

export type Step = { type: 'next' | 'prev' | 'restart' } | { type: 'jump'; to: number };

export function walkReducer(total: number) {
  return (s: Walk, a: Step): Walk => {
    switch (a.type) {
      case 'next':
        if (s.ended) return s;
        return s.index < total - 1 ? { index: s.index + 1, dir: 1, ended: false } : { ...s, ended: true };
      case 'prev':
        if (s.ended) return { ...s, dir: -1, ended: false };
        return s.index > 0 ? { index: s.index - 1, dir: -1, ended: false } : s;
      case 'jump':
        return a.to === s.index && !s.ended ? s : { index: a.to, dir: a.to >= s.index ? 1 : -1, ended: false };
      case 'restart':
        return { index: 0, dir: -1, ended: false };
    }
  };
}

/** Onde a câmera para em cada estado: longe na entrada, um passo além no fim. */
export function cameraTarget(walk: Walk, entered: boolean, total: number): number {
  if (!entered) return -0.85;
  if (walk.ended) return total - 1 + 0.32;
  return walk.index;
}

/** Duração da viagem da câmera (s): saltos longos levam um pouco mais. */
export const travelTime = (from: number, to: number) => Math.min(2.4, 1.2 + Math.abs(to - from) * 0.42);

/** Câmera composta de um quadro: deslocamento (x, z) e giros (graus) já somados. */
export interface View {
  x: number;
  z: number;
  /** Giro em Y total (órbita − encarar o painel). */
  turn: number;
  /** Giro em X (órbita). */
  pitch: number;
}

/**
 * Projeta um ponto do corredor na tela, com a mesma cadeia do CSS
 * (rotateX · rotateY · translate3d, perspectiva PERSPECTIVE na origem).
 * Devolve null atrás do olho. A origem é o ponto de fuga do palco.
 */
export function project(px: number, py: number, pz: number, v: View): { x: number; y: number; depth: number } | null {
  const tx = px - v.x;
  const tz = pz + v.z;
  const ay = (v.turn * Math.PI) / 180;
  const ax = (v.pitch * Math.PI) / 180;
  // rotateY: x' = x cos + z sin; z' = −x sin + z cos
  const x1 = tx * Math.cos(ay) + tz * Math.sin(ay);
  const z1 = -tx * Math.sin(ay) + tz * Math.cos(ay);
  // rotateX: y' = y cos − z sin; z' = y sin + z cos
  const y2 = py * Math.cos(ax) - z1 * Math.sin(ax);
  const z2 = py * Math.sin(ax) + z1 * Math.cos(ax);
  const d = PERSPECTIVE - z2;
  if (d <= 1) return null;
  const k = PERSPECTIVE / d;
  return { x: x1 * k, y: y2 * k, depth: d };
}
