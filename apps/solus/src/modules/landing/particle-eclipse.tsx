'use client';

import { useEffect, useRef } from 'react';

/**
 * The SOLUS eclipse drawn as a cloud of light: thousands of points form the
 * corona round a dark disc, coloured by the light spectrum around the ring,
 * with a few faint threads between neighbours. On load the points gather
 * from a scattered cloud (the one orchestrated moment); then the corona
 * turns very slowly. Static for reduced motion; paused off screen and in
 * hidden tabs. Decorative (aria-hidden on the wrapper).
 */

interface Point {
  angle: number;
  radius: number; // in units of the disc radius
  size: number;
  alpha: number;
  bucket: number;
  // scattered start, as a fraction of the canvas
  sx: number;
  sy: number;
  delay: number;
}

const BUCKETS = 48;
const GATHER_MS = 2200;

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
    const angle = Math.random() * Math.PI * 2;
    // Three layers: a bright, tight inner corona; a wider glow; a faint
    // halo with streamers reaching out (the volume of the cloud).
    const layer = Math.random();
    const radius =
      layer < 0.55
        ? 1.02 + Math.abs(gaussian()) * 0.06
        : layer < 0.85
          ? 1.04 + Math.abs(gaussian()) * 0.2
          : 1.08 + Math.abs(gaussian()) * 0.55;
    const fade = Math.max(0, 1 - (radius - 1) / 1.1);
    points.push({
      angle,
      radius,
      size: Math.random() < 0.05 ? 2.4 : Math.random() < 0.4 ? 1.6 : 1.2,
      alpha: layer < 0.55 ? 0.55 + fade * 0.45 : 0.18 + fade * 0.6,
      bucket: Math.floor(((angle / (Math.PI * 2)) * BUCKETS) % BUCKETS),
      sx: Math.random(),
      sy: Math.random(),
      delay: Math.random() * 0.45,
    });
  }
  // Sorted by colour, so a frame changes fillStyle once per bucket.
  return points.sort((a, b) => a.bucket - b.bucket);
}

/** Spectrum hue for a position round the ring: red → violet → magenta. */
function bucketColor(bucket: number) {
  const hue = (bucket / BUCKETS) * 320;
  return `hsl(${hue} 92% 66%)`;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

export function ParticleEclipse({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia('(max-width: 767px)').matches;
    const points = makePoints(small ? 2200 : 5200);
    const colors = Array.from({ length: BUCKETS }, (_, bucket) => bucketColor(bucket));
    // Threads: pairs of points close on the ring.
    const threads: [number, number][] = [];
    for (let i = 0; i < (small ? 40 : 90); i++) {
      const a = Math.floor(Math.random() * points.length);
      let best = -1;
      let bestDistance = Infinity;
      for (let tries = 0; tries < 40; tries++) {
        const b = Math.floor(Math.random() * points.length);
        if (b === a) continue;
        const pa = points[a]!;
        const pb = points[b]!;
        const d = Math.abs(pa.angle - pb.angle) + Math.abs(pa.radius - pb.radius);
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
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const box = canvas.getBoundingClientRect();
      width = box.width;
      height = box.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();

    const start = performance.now();
    let frame = 0;
    let running = true;
    let visible = true;

    const draw = (now: number) => {
      const elapsed = reduced ? GATHER_MS * 2 : now - start;
      const turn = reduced ? 0 : elapsed * 0.000018;
      const cx = width * 0.5;
      const cy = height * 0.5;
      const disc = Math.min(width, height) * 0.3;

      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = 'lighter';

      const xs = new Float32Array(points.length);
      const ys = new Float32Array(points.length);
      for (let i = 0; i < points.length; i++) {
        const point = points[i]!;
        const t = easeOut(Math.min(1, Math.max(0, (elapsed / GATHER_MS - point.delay) / (1 - point.delay))));
        const angle = point.angle + turn * (1.4 - point.radius * 0.4);
        const tx = cx + Math.cos(angle) * point.radius * disc;
        const ty = cy + Math.sin(angle) * point.radius * disc * 0.96;
        xs[i] = point.sx * width + (tx - point.sx * width) * t;
        ys[i] = point.sy * height + (ty - point.sy * height) * t;
      }

      // Threads first, under the points.
      const threadAlpha = Math.min(1, elapsed / GATHER_MS) * 0.16;
      if (threadAlpha > 0) {
        context.lineWidth = 0.6;
        for (const [a, b] of threads) {
          context.strokeStyle = colors[points[a]!.bucket]!;
          context.globalAlpha = threadAlpha;
          context.beginPath();
          context.moveTo(xs[a]!, ys[a]!);
          context.lineTo(xs[b]!, ys[b]!);
          context.stroke();
        }
      }

      let current = -1;
      for (let i = 0; i < points.length; i++) {
        const point = points[i]!;
        if (point.bucket !== current) {
          current = point.bucket;
          context.fillStyle = colors[current]!;
        }
        context.globalAlpha = point.alpha;
        context.fillRect(xs[i]! - point.size / 2, ys[i]! - point.size / 2, point.size, point.size);
      }

      // The moon: a black disc over the centre, slightly off so one rim burns brighter.
      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 1;
      context.fillStyle = '#000';
      context.beginPath();
      context.arc(cx - disc * 0.035, cy + disc * 0.035, disc * 0.985, 0, Math.PI * 2);
      context.fill();

      if (!reduced && running && visible) frame = requestAnimationFrame(draw);
    };

    const resume = () => {
      cancelAnimationFrame(frame);
      if (running && visible) frame = requestAnimationFrame(draw);
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (!reduced) resume();
    });
    observer.observe(canvas);
    const onVisibility = () => {
      running = document.visibilityState === 'visible';
      if (!reduced) resume();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onResize = () => {
      resize();
      if (reduced) draw(performance.now());
    };
    window.addEventListener('resize', onResize);

    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
