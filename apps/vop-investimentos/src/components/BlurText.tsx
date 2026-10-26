import { m, useReducedMotion } from 'framer-motion';
import { useRef, type CSSProperties, type ElementType } from 'react';
import { useInViewOnce } from '../hooks/useInViewOnce';
import { SETTLE } from '../lib/motion';

interface BlurTextProps {
  /** Uma linha por item: as quebras são planejadas, não deixadas ao acaso. */
  lines: readonly string[];
  as?: ElementType;
  className?: string;
  /** Classe extra por linha (recuos editoriais, por exemplo). */
  lineClassName?: (index: number) => string | undefined;
  /** Atraso antes da primeira palavra, em segundos. */
  delay?: number;
  /** Intervalo entre palavras, em segundos (padrão: 100ms). */
  stagger?: number;
  /** Mantém as quebras também no celular (padrão: true). */
  breakOnMobile?: boolean;
  /**
   * Primeira dobra: a mesma entrada, em CSS, a partir da primeira pintura —
   * sem esperar o JavaScript nem o IntersectionObserver (o título do hero é
   * o maior elemento da tela e decide o LCP).
   */
  immediate?: boolean;
  id?: string;
}

/**
 * Título revelado palavra a palavra: cada palavra sai do desfoque (10px → 0),
 * da opacidade 0 e de 50px abaixo, em 0.7s, com 100ms entre uma e outra,
 * quando 10% do bloco entra na tela. O texto completo fica disponível para
 * leitores de tela numa cópia invisível; as palavras animadas ficam ocultas
 * para eles.
 */
export function BlurText({
  lines,
  as: Tag = 'p',
  className,
  lineClassName,
  delay = 0,
  stagger = 0.1,
  breakOnMobile = true,
  immediate = false,
  id,
}: BlurTextProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInViewOnce(ref, { threshold: 0.1 });
  const reduce = useReducedMotion();
  let index = 0;

  return (
    <Tag ref={ref} className={className} id={id}>
      <span className="sr-only">{lines.join(' ')}</span>
      <span aria-hidden="true">
        {lines.map((line, li) => (
          <span key={li} className={[breakOnMobile ? 'block' : 'inline md:block', lineClassName?.(li)].filter(Boolean).join(' ')}>
            {line.split(/\s+/).map((word, wi) => {
              const order = index++;
              if (immediate) {
                const vars = { '--rise': '50px', '--dur': '0.7s', '--delay': `${delay + order * stagger}s` } as CSSProperties;
                return (
                  <span key={wi} className="intro-anim inline-block" style={{ marginRight: '0.28em', ...vars }}>
                    {word}
                  </span>
                );
              }
              return (
                <m.span
                  key={wi}
                  data-reveal
                  className="inline-block"
                  style={{ marginRight: '0.28em' }}
                  initial={{ filter: 'blur(10px)', opacity: 0, y: 50 }}
                  animate={inView ? { filter: 'blur(0px)', opacity: 1, y: 0, ...SETTLE } : undefined}
                  transition={reduce ? { duration: 0 } : { duration: 0.7, ease: 'easeOut', delay: delay + order * stagger }}
                >
                  {word}
                </m.span>
              );
            })}
            {!breakOnMobile && li < lines.length - 1 ? ' ' : null}
          </span>
        ))}
      </span>
    </Tag>
  );
}
