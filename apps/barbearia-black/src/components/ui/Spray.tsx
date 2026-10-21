import { useId } from 'react';

type Variant = 'underline' | 'circle' | 'cross';

const PATHS: Record<Variant, { d: string; viewBox: string }> = {
  underline: { viewBox: '0 0 400 40', d: 'M6 26c60-10 128-15 196-13 62 2 120 7 190 2' },
  circle: { viewBox: '0 0 400 160', d: 'M318 26C250 4 120 6 52 40 2 66 16 118 92 138c84 22 222 14 278-24 40-28 22-70-34-86-40-12-92-14-136-10' },
  cross: { viewBox: '0 0 120 120', d: 'M16 18 104 102M100 14 20 106' },
};

/** Respingos fixos (pseudoaleatórios, iguais no servidor e no cliente) ao redor do traço. */
function speckles(seed: number, count: number, w: number, h: number) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: count }, () => ({ cx: rnd() * w, cy: rnd() * h, r: 0.6 + rnd() * 1.8, o: 0.25 + rnd() * 0.6 }));
}

type Props = { variant?: Variant; className?: string; strokeWidth?: number; seed?: number };

/** Traço de spray (borda irregular + respingos), usado com moderação sobre títulos e fotos. */
export function Spray({ variant = 'underline', className, strokeWidth = 9, seed = 7 }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const { d, viewBox } = PATHS[variant];
  const [, , w, h] = viewBox.split(' ').map(Number);
  return (
    <svg viewBox={viewBox} fill="none" aria-hidden="true" className={className} preserveAspectRatio="none" overflow="visible">
      <defs>
        <filter id={`spray-${id}`} x="-10%" y="-40%" width="120%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feGaussianBlur in="rough" stdDeviation="0.6" />
        </filter>
      </defs>
      <g filter={`url(#spray-${id})`} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} strokeWidth={strokeWidth * 1.9} opacity="0.18" />
        <path d={d} strokeWidth={strokeWidth} />
      </g>
      <g fill="currentColor">
        {speckles(seed, variant === 'cross' ? 14 : 22, w, h).map((p, i) => (
          <circle key={i} cx={p.cx.toFixed(1)} cy={p.cy.toFixed(1)} r={p.r.toFixed(2)} opacity={p.o.toFixed(2)} />
        ))}
      </g>
    </svg>
  );
}
