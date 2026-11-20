'use client';

import { useEffect, useImperativeHandle, useRef } from 'react';

/**
 * The analyst as a nervous system: neurons (points) joined by axons
 * (hairlines), with signals running along them. It grows out of the eclipse:
 * every neuron starts at `origin` (the eclipse centre, in viewport pixels)
 * and travels to its place. `fire()` sends a burst of signals from the
 * centre outward, used while the analyst "thinks". Monochrome light on
 * black. Static for reduced motion. Decorative (aria-hidden).
 */

export interface NeuralNetworkHandle {
  fire: () => void;
}

interface Neuron {
  x: number;
  y: number;
  r: number;
  links: number[];
  glow: number;
}

interface Signal {
  from: number;
  to: number;
  t: number;
  speed: number;
}

const GROW_MS = 1400;

export function NeuralNetwork({
  origin,
  className,
  ref,
}: {
  origin: { x: number; y: number };
  className?: string;
  ref?: React.Ref<NeuralNetworkHandle>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const burst = useRef(0);

  useImperativeHandle(ref, () => ({ fire: () => (burst.current += 1) }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.matchMedia('(max-width: 767px)').matches;
    let width = 0;
    let height = 0;
    let neurons: Neuron[] = [];
    const signals: Signal[] = [];

    const build = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      // Neurons scattered over the screen, denser near the origin (the core).
      const count = small ? 90 : 180;
      neurons = [];
      for (let i = 0; i < count; i++) {
        const core = Math.random() < 0.35;
        const angle = Math.random() * Math.PI * 2;
        const reach = core ? Math.random() * 0.22 : 0.15 + Math.random() * 0.85;
        const spread = Math.max(width, height) * 0.62;
        neurons.push({
          x: origin.x + Math.cos(angle) * reach * spread,
          y: origin.y + Math.sin(angle) * reach * spread * 0.8,
          r: core ? 1.6 + Math.random() * 1.6 : 0.9 + Math.random() * 1.3,
          links: [],
          glow: 0,
        });
      }
      // Axons: each neuron to its 2–3 nearest neighbours.
      neurons.forEach((neuron, index) => {
        const nearest = neurons
          .map((other, j) => ({ j, d: (other.x - neuron.x) ** 2 + (other.y - neuron.y) ** 2 }))
          .filter((entry) => entry.j !== index)
          .sort((a, b) => a.d - b.d)
          .slice(0, 2 + (index % 2));
        for (const { j } of nearest) if (!neuron.links.includes(j)) neuron.links.push(j);
      });
    };
    build();

    // The neuron closest to the origin: where bursts start.
    const coreIndex = () => {
      let best = 0;
      let bestDistance = Infinity;
      neurons.forEach((neuron, index) => {
        const d = (neuron.x - origin.x) ** 2 + (neuron.y - origin.y) ** 2;
        if (d < bestDistance) {
          bestDistance = d;
          best = index;
        }
      });
      return best;
    };

    const send = (from: number) => {
      const neuron = neurons[from];
      if (!neuron) return;
      neuron.glow = 1;
      for (const to of neuron.links) signals.push({ from, to, t: 0, speed: 0.012 + Math.random() * 0.018 });
    };

    const start = performance.now();
    let lastBurst = 0;
    let lastIdle = 0;
    let frame = 0;

    const draw = (now: number) => {
      const elapsed = reduced ? GROW_MS : now - start;
      const grow = 1 - Math.pow(1 - Math.min(1, elapsed / GROW_MS), 3);
      const at = (neuron: Neuron) => ({
        x: origin.x + (neuron.x - origin.x) * grow,
        y: origin.y + (neuron.y - origin.y) * grow,
      });

      if (!reduced) {
        if (burst.current !== lastBurst) {
          lastBurst = burst.current;
          const core = coreIndex();
          send(core);
          for (let i = 0; i < 6; i++) send(neurons[core]!.links[i % neurons[core]!.links.length] ?? core);
        }
        // Background activity: a spontaneous signal every so often.
        if (elapsed > GROW_MS && now - lastIdle > 260) {
          lastIdle = now;
          send(Math.floor(Math.random() * neurons.length));
        }
      }

      context.clearRect(0, 0, width, height);

      context.lineWidth = 0.6;
      context.strokeStyle = 'rgb(255 255 255 / 0.11)';
      context.beginPath();
      neurons.forEach((neuron) => {
        const a = at(neuron);
        for (const j of neuron.links) {
          const b = at(neurons[j]!);
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
        }
      });
      context.stroke();

      for (let i = signals.length - 1; i >= 0; i--) {
        const signal = signals[i]!;
        signal.t += signal.speed;
        const a = at(neurons[signal.from]!);
        const b = at(neurons[signal.to]!);
        const x = a.x + (b.x - a.x) * signal.t;
        const y = a.y + (b.y - a.y) * signal.t;
        context.fillStyle = 'rgb(255 255 255 / 0.95)';
        context.beginPath();
        context.arc(x, y, 1.8, 0, Math.PI * 2);
        context.fill();
        // A short trail behind the signal.
        context.strokeStyle = 'rgb(255 255 255 / 0.35)';
        context.beginPath();
        context.moveTo(a.x + (b.x - a.x) * Math.max(0, signal.t - 0.12), a.y + (b.y - a.y) * Math.max(0, signal.t - 0.12));
        context.lineTo(x, y);
        context.stroke();
        if (signal.t >= 1) {
          signals.splice(i, 1);
          const target = neurons[signal.to]!;
          target.glow = 1;
          // Chain reaction, damped so the network calms down.
          if (signals.length < 160 && Math.random() < 0.55) send(signal.to);
        }
      }

      for (const neuron of neurons) {
        const p = at(neuron);
        const glow = neuron.glow;
        if (glow > 0.02) {
          context.fillStyle = `rgb(255 255 255 / ${0.18 * glow})`;
          context.beginPath();
          context.arc(p.x, p.y, neuron.r * 5, 0, Math.PI * 2);
          context.fill();
        }
        context.fillStyle = `rgb(255 255 255 / ${0.45 + 0.55 * glow})`;
        context.beginPath();
        context.arc(p.x, p.y, neuron.r, 0, Math.PI * 2);
        context.fill();
        neuron.glow *= 0.94;
      }

      if (!reduced) frame = requestAnimationFrame(draw);
    };

    const onResize = () => {
      build();
      if (reduced) draw(performance.now());
    };
    window.addEventListener('resize', onResize);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [origin.x, origin.y]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
