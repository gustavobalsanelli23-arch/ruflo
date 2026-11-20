'use client';

import { useEffect, useRef } from 'react';

/**
 * The SOLUS eclipse drawn as a cloud of light: thousands of white and
 * silver points form the corona round a dark disc, with a few faint
 * threads between neighbours.
 *
 *   * On load the points gather from a scattered cloud.
 *   * The pointer pushes the points near it aside; they drift back.
 *   * `open` slides the moon away and lets the corona widen and brighten
 *     (the hero toggles it on click); closing brings the moon back.
 *
 * Static for reduced motion (open/close still switch, without the slide);
 * paused off screen and in hidden tabs. Adaptive: if the first frames run
 * slow (a modest phone), fewer points are drawn; if even that is slow, the
 * corona stops turning and is redrawn only while it opens or closes.
 */

interface Point {
  angle: number;
  radius: number; // in units of the disc radius
  size: number;
  alpha: number;
  tone: number; // 0..TONES-1, from cool silver to white
  level: number; // alpha level, 0..LEVELS-1 (one colour string per tone × level)
  sx: number;
  sy: number;
  delay: number;
  // pointer displacement, eased back to zero
  dx: number;
  dy: number;
}

const TONES = 6;
const LEVELS = 4;
const GATHER_MS = 2200;
const PUSH_RADIUS = 110;

function gaussian() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function makePoints(count: number): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const layer = Math.random();
    const radius =
      layer < 0.55
        ? 1.02 + Math.abs(gaussian()) * 0.06
        : layer < 0.85
          ? 1.04 + Math.abs(gaussian()) * 0.2
          : 1.08 + Math.abs(gaussian()) * 0.55;
    const fade = Math.max(0, 1 - (radius - 1) / 1.1);
    points.push({
      angle: Math.random() * Math.PI * 2,
      radius,
      size: Math.random() < 0.05 ? 2.4 : Math.random() < 0.4 ? 1.6 : 1.2,
      alpha: layer < 0.55 ? 0.55 + fade * 0.45 : 0.16 + fade * 0.55,
      // The inner corona is the whitest.
      tone: Math.min(TONES - 1, Math.floor((layer < 0.55 ? 0.55 + Math.random() * 0.45 : Math.random() * 0.8) * TONES)),
      sx: Math.random(),
      sy: Math.random(),
      delay: Math.random() * 0.45,
      dx: 0,
      dy: 0,
      level: 0,
    });
  }
  for (const point of points) point.level = Math.min(LEVELS - 1, Math.floor(point.alpha * LEVELS));
  // Sorted by colour, so a frame changes fillStyle once per tone × level
  // (no per-point globalAlpha, the costly state change on phones).
  return points.sort((a, b) => a.tone * LEVELS + a.level - (b.tone * LEVELS + b.level));
}

/** Cool silver (tone 0) to pure white, at one of the alpha levels. */
function toneColor(tone: number, alpha: number) {
  const t = tone / (TONES - 1);
  return `hsl(212 ${Math.round(28 - t * 28)}% ${Math.round(68 + t * 32)}% / ${alpha.toFixed(3)})`;
}

const levelAlpha = (level: number) => (level + 0.5) / LEVELS;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function ParticleEclipse({ className, open = false }: { className?: string; open?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const openRef = useRef(open);
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    openRef.current = open;
    kick.current();
  }, [open]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia('(max-width: 767px)').matches;
    const points = makePoints(small ? 1400 : 5200);
    const palette = (boost: number) =>
      Array.from({ length: TONES * LEVELS }, (_, key) => toneColor(Math.floor(key / LEVELS), Math.min(1, levelAlpha(key % LEVELS) * boost)));
    let colors = palette(1);
    let colorsBoost = 1;
    const xs = new Float32Array(points.length);
    const ys = new Float32Array(points.length);
    const threads: [number, number][] = [];
    for (let i = 0; i < (small ? 40 : 90); i++) {
      const a = Math.floor(Math.random() * points.length);
      let best = -1;
      let bestDistance = Infinity;
      for (let tries = 0; tries < 40; tries++) {
        const b = Math.floor(Math.random() * points.length);
        if (b === a) continue;
        const d = Math.abs(points[a]!.angle - points[b]!.angle) + Math.abs(points[a]!.radius - points[b]!.radius);
        if (d < bestDistance && d > 0.05) {
          bestDistance = d;
          best = b;
        }
      }
      if (best >= 0 && bestDistance < 0.6) threads.push([a, best]);
    }

    let width = 0;
    let height = 0;
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
      const box = canvas.getBoundingClientRect();
      width = box.width;
      height = box.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();

    // Pointer, in canvas coordinates (null when away).
    let pointer: { x: number; y: number } | null = null;
    const host = canvas.parentElement ?? canvas;
    const onPointerMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
    };
    const onPointerLeave = () => {
      pointer = null;
    };
    host.addEventListener('pointermove', onPointerMove, { passive: true });
    host.addEventListener('pointerleave', onPointerLeave);

    const start = performance.now();
    let opening = openRef.current ? 1 : 0; // 0 closed .. 1 open
    let frame = 0;
    let running = true;
    let visible = true;
    let last = start;
    // Frame-time budget: measured over the first frames, then fixed.
    let stride = 1;
    let still = false; // the slowest phones: no continuous turning
    let sampled = 0;
    let sampledTime = 0;

    const draw = (now: number) => {
      frame = 0;
      const step = Math.min(64, now - last);
      last = now;
      // Between 0.6 s and 2.1 s after start, measure; slow → lighter (twice at most).
      const age = now - start;
      if (!reduced && age > 600 && stride < 3) {
        sampled++;
        sampledTime += step;
        if (age > 600 + 1500 * stride && sampled >= 6) {
          if (sampledTime / sampled > 28) {
            if (stride === 2) still = true;
            stride++;
          }
          sampled = 0;
          sampledTime = 0;
        }
      }
      const elapsed = reduced ? GATHER_MS * 2 : now - start;
      const turn = reduced ? 0 : elapsed * 0.000018;

      const target = openRef.current ? 1 : 0;
      opening = reduced ? target : opening + (target - opening) * Math.min(1, step / 260);
      const o = easeInOut(Math.min(1, Math.max(0, opening)));

      const cx = width * 0.5;
      const cy = height * 0.5;
      const disc = Math.min(width, height) * 0.3;
      const spread = 1 + o * 0.22; // the corona widens as it opens

      context.clearRect(0, 0, width, height);
      for (let i = 0; i < points.length; i += stride) {
        const point = points[i]!;
        const t = easeOut(Math.min(1, Math.max(0, (elapsed / GATHER_MS - point.delay) / (1 - point.delay))));
        const angle = point.angle + turn * (1.4 - point.radius * 0.4);
        const r = point.radius * disc * spread;
        const tx = cx + Math.cos(angle) * r;
        const ty = cy + Math.sin(angle) * r * 0.96;
        let x = point.sx * width + (tx - point.sx * width) * t;
        let y = point.sy * height + (ty - point.sy * height) * t;

        // Push away from the pointer, then ease back.
        if (pointer && !reduced) {
          const ddx = x + point.dx - pointer.x;
          const ddy = y + point.dy - pointer.y;
          const distance = Math.hypot(ddx, ddy);
          if (distance < PUSH_RADIUS && distance > 0.01) {
            const force = (1 - distance / PUSH_RADIUS) * 2.6;
            point.dx += (ddx / distance) * force;
            point.dy += (ddy / distance) * force;
          }
        }
        point.dx *= 0.93;
        point.dy *= 0.93;
        x += point.dx;
        y += point.dy;
        xs[i] = x;
        ys[i] = y;
      }

      const threadAlpha = Math.min(1, elapsed / GATHER_MS) * (0.12 + o * 0.1);
      if (threadAlpha > 0) {
        context.lineWidth = 0.6;
        context.strokeStyle = '#ffffff';
        context.globalAlpha = threadAlpha;
        context.beginPath();
        for (const [a, b] of threads) {
          // In the lighter mode only computed points have a position.
          if (a % stride || b % stride) continue;
          context.moveTo(xs[a]!, ys[a]!);
          context.lineTo(xs[b]!, ys[b]!);
        }
        context.stroke();
      }

      const boost = Math.round((1 + o * 0.35) * 20) / 20;
      if (boost !== colorsBoost) {
        colors = palette(boost);
        colorsBoost = boost;
      }
      context.globalAlpha = 1;
      let current = -1;
      for (let i = 0; i < points.length; i += stride) {
        const point = points[i]!;
        const key = point.tone * LEVELS + point.level;
        if (key !== current) {
          current = key;
          context.fillStyle = colors[current]!;
        }
        context.fillRect(xs[i]! - point.size / 2, ys[i]! - point.size / 2, point.size, point.size);
      }

      // The sun behind the moon: a soft white glow that grows as it opens.
      if (o > 0.01) {
        const glow = context.createRadialGradient(cx, cy, 0, cx, cy, disc * 1.15);
        glow.addColorStop(0, `rgb(255 255 255 / ${0.9 * o})`);
        glow.addColorStop(0.6, `rgb(235 242 255 / ${0.35 * o})`);
        glow.addColorStop(1, 'rgb(235 242 255 / 0)');
        context.globalAlpha = 1;
        context.fillStyle = glow;
        context.beginPath();
        context.arc(cx, cy, disc * 1.15, 0, Math.PI * 2);
        context.fill();
      }

      // The moon: a black disc, sliding off down and to the left as it opens.
      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 1;
      context.fillStyle = '#000';
      context.beginPath();
      context.arc(cx - disc * (0.035 + o * 2.6), cy + disc * (0.035 + o * 1.7), disc * (0.985 - o * 0.12), 0, Math.PI * 2);
      context.fill();

      // The corona keeps turning, so the loop runs while the hero is on screen
      // (on the slowest phones only while the eclipse opens or closes).
      const settling = Math.abs(target - opening) > 0.002 || now - start < GATHER_MS * 1.6;
      if (!reduced && running && visible && (!still || settling)) frame = requestAnimationFrame(draw);
    };

    const wake = () => {
      if (!frame && running && visible) frame = requestAnimationFrame(draw);
    };
    kick.current = () => {
      if (reduced) draw(performance.now());
      else wake();
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) wake();
      else stop();
    });
    observer.observe(canvas);
    const onVisibility = () => {
      running = document.visibilityState === 'visible';
      if (running) wake();
      else stop();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onResize = () => {
      resize();
      if (reduced) draw(performance.now());
    };
    window.addEventListener('resize', onResize);

    frame = requestAnimationFrame(draw);
    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
      kick.current = () => {};
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
