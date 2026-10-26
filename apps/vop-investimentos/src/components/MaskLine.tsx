import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import { EASE_CINEMA, EASE_MASK } from '../lib/motion';

/** Uma linha que sobe da máscara ao montar e desce ao sair (troca de ambiente, cartões). */
export function MaskLine({ children, delay = 0, reduce }: { children: ReactNode; delay?: number; reduce: boolean }) {
  return (
    <span className="-mt-[0.18em] block overflow-hidden pb-[0.08em] pt-[0.18em]">
      <m.span
        className="block"
        initial={{ y: reduce ? 0 : '112%' }}
        animate={{ y: 0 }}
        exit={{ y: reduce ? 0 : '-112%', transition: { duration: 0.35, ease: EASE_CINEMA } }}
        transition={{ duration: reduce ? 0 : 0.9, ease: EASE_MASK, delay: reduce ? 0 : delay }}
      >
        {children}
      </m.span>
    </span>
  );
}
