// Piso do corredor desenhado em 2D: fios projetados com a câmera do quadro.
// Um plano 3D quadriculado em CSS custa caro para rasterizar (sobretudo sem
// GPU); aqui são traços de 1px, nítidos em qualquer tela, agrupados por
// brilho para caberem em poucas chamadas de desenho.
import { project, type View } from '../../lib/stage';

const CELL = 160;
const HALF_WIDTH = 2400;
const NEAR = 80;
const FAR = 7000;
const LEVELS = 10;
const MAX_ALPHA = 0.13;

export function drawFloor(ctx: CanvasRenderingContext2D, width: number, height: number, originY: number, floorY: number, v: View) {
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const buckets: number[][] = Array.from({ length: LEVELS }, () => []);
  const seg = (ax: number, az: number, bx: number, bz: number) => {
    const a = project(ax, floorY, az, v);
    const b = project(bx, floorY, bz, v);
    if (!a || !b || a.depth < NEAR || b.depth < NEAR) return;
    // Some na distância e para os lados (em relação à câmera).
    const k = Math.max(0, 1 - (a.depth + b.depth) / 2 / FAR) * Math.max(0, 1 - Math.abs((ax + bx) / 2 - v.x) / HALF_WIDTH);
    const level = Math.min(LEVELS - 1, Math.floor(k * LEVELS));
    if (level <= 0) return;
    buckets[level].push(cx + a.x, originY + a.y, cx + b.x, originY + b.y);
  };
  // Faixa visível (coordenadas do corredor), alinhada à grade.
  const zNear = Math.ceil((900 - v.z) / CELL) * CELL;
  const zFar = Math.floor((-FAR - v.z) / CELL) * CELL;
  const x0 = Math.floor((v.x - HALF_WIDTH) / CELL) * CELL;
  const x1 = Math.ceil((v.x + HALF_WIDTH) / CELL) * CELL;
  for (let x = x0; x <= x1; x += CELL) {
    for (let z = zNear; z > zFar; z -= CELL) seg(x, z, x, z - CELL);
  }
  for (let z = zNear; z >= zFar; z -= CELL) {
    for (let x = x0; x < x1; x += CELL) seg(x, z, x + CELL, z);
  }
  ctx.lineWidth = 1;
  for (let level = 1; level < LEVELS; level++) {
    const pts = buckets[level];
    if (!pts.length) continue;
    ctx.strokeStyle = `rgba(255,255,255,${((level / (LEVELS - 1)) * MAX_ALPHA).toFixed(3)})`;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 4) {
      ctx.moveTo(pts[i], pts[i + 1]);
      ctx.lineTo(pts[i + 2], pts[i + 3]);
    }
    ctx.stroke();
  }
}
