import { m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { EASE_CINEMA } from '../lib/motion';

interface ApertureProps {
  children: ReactNode;
  /** Classes da moldura (tamanho, proporção, cantos). */
  className?: string;
  /** De onde a imagem se abre: do centro (porta de correr) ou de baixo (cortina). */
  from?: 'center' | 'bottom';
  delay?: number;
}

/**
 * Transição entre seções: a imagem se abre como uma porta de correr — de uma
 * fresta vertical até o quadro inteiro — quando a moldura entra na tela.
 * O gatilho fica na moldura, sem recorte: o IntersectionObserver mede a área
 * visível já recortada pelo clip-path, e a fresta nunca chegaria ao limiar.
 */
export function Aperture({ children, className, from = 'center', delay = 0 }: ApertureProps) {
  const reduce = useReducedMotion();
  const closed = from === 'center' ? 'inset(0% 46% 0% 46%)' : 'inset(100% 0% 0% 0%)';
  return (
    <m.div className={['relative', className].filter(Boolean).join(' ')} initial="closed" whileInView="open" viewport={{ once: true, amount: 0.25 }}>
      <m.div
        data-reveal
        className="absolute inset-0"
        variants={{ closed: { clipPath: closed }, open: { clipPath: 'inset(0% 0% 0% 0%)' } }}
        transition={reduce ? { duration: 0 } : { duration: 1.5, ease: EASE_CINEMA, delay }}
      >
        {children}
      </m.div>
    </m.div>
  );
}
