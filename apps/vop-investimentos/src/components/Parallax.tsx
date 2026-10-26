import { m, useScroll, useTransform } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { REDUCED_MOTION, useMediaQuery } from '../hooks/useMediaQuery';

/**
 * Parallax sutil: o conteúdo (uma foto um pouco maior que a moldura) desliza
 * `range`% enquanto a moldura atravessa a tela. Ocupa toda a moldura em que
 * está (que precisa ser posicionada). Desligado com "reduzir movimento".
 */
export function Parallax({ children, className, range = 8 }: { children: ReactNode; className?: string; range?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useMediaQuery(REDUCED_MOTION);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`${-range}%`, `${range}%`]);
  return (
    <div ref={ref} className={['absolute inset-0 overflow-hidden', className].filter(Boolean).join(' ')}>
      <m.div className="absolute inset-x-0" style={{ y: reduce ? 0 : y, top: `${-range * 1.2}%`, bottom: `${-range * 1.2}%` }}>
        {children}
      </m.div>
    </div>
  );
}
