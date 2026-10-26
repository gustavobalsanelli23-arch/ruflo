import { m, useReducedMotion } from 'framer-motion';
import { useRef, type ElementType } from 'react';
import { useInViewOnce } from '../hooks/useInViewOnce';
import { EASE_MASK } from '../lib/motion';

interface BlurTextProps {
  /** Uma linha por item: as quebras são planejadas, não deixadas ao acaso. */
  lines: readonly string[];
  as?: ElementType;
  className?: string;
  /** Classe extra por linha (recuos editoriais, por exemplo). */
  lineClassName?: (index: number) => string | undefined;
  /** Atraso antes da primeira linha, em segundos. */
  delay?: number;
  /** Intervalo entre linhas, em segundos (padrão: 100ms, como no hero). */
  stagger?: number;
  /** Mantém as quebras também no celular (padrão: true). */
  breakOnMobile?: boolean;
  id?: string;
}

/**
 * Título que sobe de uma máscara, como o do hero: cada palavra tem a sua
 * janela (assim a quebra de linha do celular não corta nada) e as palavras
 * de uma linha sobem juntas, 0.9s, com 100ms entre linhas, quando 10% do
 * bloco entra na tela. O texto completo fica para leitores de tela numa
 * cópia invisível; as palavras animadas ficam ocultas para eles.
 */
export function BlurText({ lines, as: Tag = 'p', className, lineClassName, delay = 0, stagger = 0.1, breakOnMobile = true, id }: BlurTextProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInViewOnce(ref, { threshold: 0.1 });
  const reduce = useReducedMotion();

  return (
    <Tag ref={ref} className={className} id={id}>
      <span className="sr-only">{lines.join(' ')}</span>
      <span aria-hidden="true">
        {lines.map((line, li) => (
          <span key={li} className={[breakOnMobile ? 'block' : 'inline md:block', lineClassName?.(li)].filter(Boolean).join(' ')}>
            {line.split(/\s+/).map((word, wi) => (
              // A janela tem folga em cima para os acentos das maiúsculas (Í, Ô).
              <span key={wi} className="-mt-[0.18em] inline-block overflow-hidden pt-[0.18em] align-bottom" style={{ marginRight: '0.28em' }}>
                <m.span
                  data-reveal
                  className="inline-block"
                  initial={{ y: '112%' }}
                  animate={inView ? { y: 0 } : undefined}
                  transition={reduce ? { duration: 0 } : { duration: 0.9, ease: EASE_MASK, delay: delay + li * stagger }}
                >
                  {word}
                </m.span>
              </span>
            ))}
            {!breakOnMobile && li < lines.length - 1 ? ' ' : null}
          </span>
        ))}
      </span>
    </Tag>
  );
}
