'use client';

import { useEffect, useRef } from 'react';
import styles from './landing-hero.module.css';

/**
 * A total solar eclipse drawn once on canvas: helmet streamers along a tilted
 * equator, short plumes at the poles, a fibrous texture, the inner corona, a
 * few prominences on the limb and the Moon in front. The drawing is seeded,
 * so it looks the same on every visit; all motion is CSS (rotation, opacity),
 * composited by the GPU. Decorative only.
 */

/** Moon radius as a share of the box side (keep in sync with .moon in the CSS). */
const MOON = 0.12;
const TILT = -0.32;

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand: () => number) {
  return (rand() + rand() + rand() - 1.5) / 1.5;
}

/** One tapered, slightly curved filament from the limb outwards. */
function strand(
  ctx: CanvasRenderingContext2D,
  c: number,
  r: number,
  angle: number,
  length: number,
  width: number,
  bend: number,
  alpha: number,
) {
  const tip = angle + bend;
  const base = width / r;
  const out = r + length;
  const p = (a: number, d: number) => [c + Math.cos(a) * d, c + Math.sin(a) * d] as const;
  const [b1x, b1y] = p(angle - base, r * 0.97);
  const [b2x, b2y] = p(angle + base, r * 0.97);
  const [tx, ty] = p(tip, out);
  const [m1x, m1y] = p(angle + bend * 0.35 - base * 0.5, r + length * 0.45);
  const [m2x, m2y] = p(angle + bend * 0.35 + base * 0.5, r + length * 0.45);
  const g = ctx.createRadialGradient(c, c, r * 0.95, c, c, out);
  g.addColorStop(0, `rgb(236 244 255 / ${alpha})`);
  g.addColorStop(0.35, `rgb(206 226 252 / ${alpha * 0.55})`);
  g.addColorStop(1, 'rgb(170 200 245 / 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(b1x, b1y);
  ctx.quadraticCurveTo(m1x, m1y, tx, ty);
  ctx.quadraticCurveTo(m2x, m2y, b2x, b2y);
  ctx.closePath();
  ctx.fill();
}

function drawStreamers(ctx: CanvasRenderingContext2D, size: number) {
  const rand = seeded(20261120);
  const c = size / 2;
  const r = size * MOON;
  ctx.clearRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';

  // Helmet streamers: long, wide, concentrated around the tilted equator.
  for (let i = 0; i < 300; i += 1) {
    const side = rand() < 0.5 ? 0 : Math.PI;
    const angle = rand() < 0.72 ? TILT + side + gauss(rand) * 0.55 : rand() * Math.PI * 2;
    const eq = Math.abs(Math.cos(angle - TILT));
    const length = r * (0.25 + rand() ** 2 * (0.7 + 2.4 * eq ** 3));
    const width = r * (0.012 + rand() * 0.05) * (0.35 + eq);
    strand(ctx, c, r, angle, length, width, (rand() - 0.5) * 0.09, 0.025 + rand() * 0.07);
  }

  // Polar plumes: short, thin, fanning away from each pole like field lines.
  for (const pole of [TILT - Math.PI / 2, TILT + Math.PI / 2]) {
    for (let i = 0; i < 70; i += 1) {
      const offset = (rand() - 0.5) * 1.3;
      const length = r * (0.18 + rand() * 0.5) * (1 - Math.abs(offset) * 0.4);
      strand(ctx, c, r, pole + offset, length, r * (0.004 + rand() * 0.01), offset * 0.32, 0.04 + rand() * 0.07);
    }
  }

  // Fibrous texture over everything.
  const g = ctx.createRadialGradient(c, c, r, c, c, r * 3);
  g.addColorStop(0, 'rgb(230 240 255 / 0.55)');
  g.addColorStop(0.3, 'rgb(200 222 250 / 0.12)');
  g.addColorStop(1, 'rgb(200 222 250 / 0)');
  ctx.strokeStyle = g;
  ctx.lineCap = 'round';
  for (let i = 0; i < 900; i += 1) {
    const angle = rand() * Math.PI * 2;
    const eq = Math.abs(Math.cos(angle - TILT));
    const out = r * (1.1 + rand() ** 2 * (0.6 + 1.6 * eq ** 2));
    ctx.globalAlpha = 0.05 + rand() * 0.12;
    ctx.lineWidth = Math.max(0.6, size / 1400) * (0.6 + rand());
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(angle) * r, c + Math.sin(angle) * r);
    ctx.lineTo(c + Math.cos(angle + (rand() - 0.5) * 0.04) * out, c + Math.sin(angle + (rand() - 0.5) * 0.04) * out);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawGlow(ctx: CanvasRenderingContext2D, size: number) {
  const rand = seeded(7);
  const c = size / 2;
  const r = size * MOON;
  ctx.clearRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';

  // Broad outer glow, slightly flattened along the equator.
  ctx.save();
  ctx.translate(c, c);
  ctx.rotate(TILT);
  ctx.scale(1.18, 0.92);
  const outer = ctx.createRadialGradient(0, 0, r * 0.95, 0, 0, r * 3.1);
  outer.addColorStop(0, 'rgb(232 242 255 / 0.5)');
  outer.addColorStop(0.07, 'rgb(205 225 252 / 0.3)');
  outer.addColorStop(0.25, 'rgb(150 188 238 / 0.1)');
  outer.addColorStop(0.6, 'rgb(70 120 190 / 0.035)');
  outer.addColorStop(1, 'rgb(70 120 190 / 0)');
  ctx.fillStyle = outer;
  ctx.fillRect(-c * 2, -c * 2, size * 2, size * 2);
  ctx.restore();

  // Inner corona hugging the limb.
  const inner = ctx.createRadialGradient(c, c, r * 0.98, c, c, r * 1.4);
  inner.addColorStop(0, 'rgb(255 255 255 / 0.95)');
  inner.addColorStop(0.07, 'rgb(242 248 255 / 0.62)');
  inner.addColorStop(0.35, 'rgb(205 226 252 / 0.16)');
  inner.addColorStop(1, 'rgb(205 226 252 / 0)');
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.arc(c, c, r * 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Prominences: small magenta flames standing on the limb.
  const flames = [0.55, 1.9, 3.4, 4.6, 5.55];
  for (const base of flames) {
    const blobs = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < blobs; i += 1) {
      const a = base + (rand() - 0.5) * 0.07;
      const d = r * (1.0 + rand() * 0.035);
      const s = r * (0.012 + rand() * 0.03);
      const x = c + Math.cos(a) * d;
      const y = c + Math.sin(a) * d;
      const g = ctx.createRadialGradient(x, y, 0, x, y, s);
      g.addColorStop(0, 'rgb(255 120 150 / 0.85)');
      g.addColorStop(0.5, 'rgb(240 70 110 / 0.35)');
      g.addColorStop(1, 'rgb(240 70 110 / 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // One loop prominence arching off the limb.
  ctx.strokeStyle = 'rgb(255 110 140 / 0.55)';
  ctx.lineWidth = Math.max(1, r * 0.012);
  ctx.lineCap = 'round';
  const a0 = 2.55;
  const a1 = 2.68;
  ctx.beginPath();
  ctx.moveTo(c + Math.cos(a0) * r, c + Math.sin(a0) * r);
  ctx.bezierCurveTo(
    c + Math.cos(a0) * r * 1.12,
    c + Math.sin(a0) * r * 1.12,
    c + Math.cos(a1) * r * 1.12,
    c + Math.sin(a1) * r * 1.12,
    c + Math.cos(a1) * r,
    c + Math.sin(a1) * r,
  );
  ctx.stroke();

  // Chromosphere: a thin rosy rim, brightest beside the diamond ring.
  const rim = ctx.createConicGradient(0, c, c);
  rim.addColorStop(0, 'rgb(255 150 175 / 0.55)');
  rim.addColorStop(0.12, 'rgb(255 150 175 / 0.9)');
  rim.addColorStop(0.3, 'rgb(255 150 175 / 0.18)');
  rim.addColorStop(0.75, 'rgb(255 150 175 / 0.12)');
  rim.addColorStop(1, 'rgb(255 150 175 / 0.55)');
  ctx.strokeStyle = rim;
  ctx.lineWidth = Math.max(1, size / 700);
  ctx.beginPath();
  ctx.arc(c, c, r + ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();
}

export function EclipseCorona() {
  const streamers = useRef<HTMLCanvasElement>(null);
  const echo = useRef<HTMLCanvasElement>(null);
  const glow = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const a = streamers.current;
    const b = echo.current;
    const g = glow.current;
    if (!a || !b || !g) return;
    const draw = () => {
      const size = Math.round(Math.min(1800, Math.max(640, a.clientWidth * Math.min(2, window.devicePixelRatio || 1))));
      if (!size || a.width === size) return;
      const ctxA = a.getContext('2d');
      const ctxB = b.getContext('2d');
      const ctxG = g.getContext('2d');
      if (!ctxA || !ctxB || !ctxG) return;
      for (const canvas of [a, b, g]) {
        canvas.width = size;
        canvas.height = size;
      }
      drawStreamers(ctxA, size);
      // The echo is the same corona mirrored; it turns the other way, so the
      // two drift through each other and the streamers seem to shimmer.
      ctxB.setTransform(-1, 0, 0, 1, size, 0);
      ctxB.drawImage(a, 0, 0);
      drawGlow(ctxG, size);
      a.dataset.ready = '';
    };
    const frame = requestAnimationFrame(draw);
    let timer = 0;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(draw, 250);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <>
      <div className={styles.coronaSpin}>
        <canvas ref={streamers} className={styles.coronaCanvas} />
      </div>
      <div className={`${styles.coronaSpin} ${styles.coronaEcho}`}>
        <canvas ref={echo} className={styles.coronaCanvas} />
      </div>
      <canvas ref={glow} className={`${styles.coronaCanvas} ${styles.coronaGlow}`} />
      <div className={styles.moon} />
      <div className={styles.limb} />
      <div className={styles.diamond} />
    </>
  );
}
