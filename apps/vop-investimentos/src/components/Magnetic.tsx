import { m, useMotionValue, useSpring } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { FINE_POINTER, REDUCED_MOTION, useMediaQuery } from '../hooks/useMediaQuery';

/**
 * Atração magnética discreta: o CTA segue o ponteiro em até `strength` px.
 * Só com mouse/trackpad e sem "reduzir movimento"; no toque, nada muda.
 */
export function Magnetic({ children, strength = 6, className }: { children: ReactNode; strength?: number; className?: string }) {
  const fine = useMediaQuery(FINE_POINTER);
  const reduce = useMediaQuery(REDUCED_MOTION);
  const ref = useRef<HTMLSpanElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18, mass: 0.4 });
  const active = fine && !reduce;

  return (
    <m.span
      ref={ref}
      className={['inline-flex', className].filter(Boolean).join(' ')}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (!active || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set(((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * strength);
        y.set(((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * strength * 0.6);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </m.span>
  );
}
