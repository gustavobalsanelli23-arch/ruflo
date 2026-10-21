import { m } from 'framer-motion';
import type { ReactNode } from 'react';

const ease = [0.22, 1, 0.36, 1] as const;

type Props = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'li' | 'article' | 'header' | 'p';
};

/** Revelação discreta durante a rolagem (respeita prefers-reduced-motion via MotionConfig). */
export function Reveal({ children, delay = 0, y = 26, className, as = 'div' }: Props) {
  const Tag = m[as];
  return (
    <Tag
      data-reveal
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.8, delay, ease }}
    >
      {children}
    </Tag>
  );
}

const lineVariants = {
  hidden: { y: '110%' },
  show: (i: number) => ({ y: '0%', transition: { duration: 0.9, delay: i * 0.08, ease } }),
};

/**
 * Título que sobe de dentro de uma máscara, linha a linha, como letreiro sendo colado.
 * O gatilho fica no contêiner: as linhas escondidas atrás da máscara não "aparecem"
 * para o IntersectionObserver. A folga vertical da máscara preserva acentos e cedilhas.
 */
export function RevealLines({ lines, className, lineClassName }: { lines: ReactNode[]; className?: string; lineClassName?: string }) {
  return (
    <m.span
      className={`block ${className ?? ''}`}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
    >
      {lines.map((line, i) => (
        <span key={i} className="-my-[0.14em] block overflow-hidden py-[0.14em]">
          <m.span data-reveal custom={i} variants={lineVariants} className={`block ${lineClassName ?? ''}`}>
            {line}
          </m.span>
        </span>
      ))}
    </m.span>
  );
}

/** Fotografia revelada por uma cortina de baixo para cima. */
export function RevealImage({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <m.div
      data-reveal
      className={className}
      initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 1.1, delay, ease: [0.7, 0, 0.2, 1] }}
    >
      {children}
    </m.div>
  );
}
