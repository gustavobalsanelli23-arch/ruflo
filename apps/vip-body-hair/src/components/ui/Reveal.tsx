import { m } from 'framer-motion';
import type { ReactNode } from 'react';

export const ease = [0.22, 1, 0.36, 1] as const;

type Props = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'li' | 'article' | 'header' | 'p' | 'figure';
};

/** Revelação discreta durante a rolagem (respeita prefers-reduced-motion via MotionConfig). */
export function Reveal({ children, delay = 0, y = 24, className, as = 'div' }: Props) {
  const Tag = m[as];
  return (
    <Tag
      data-reveal
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 1, delay, ease }}
    >
      {children}
    </Tag>
  );
}

/** Revelação de imagem com cortina vertical (clip-path), estilo editorial. */
export function RevealImage({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <m.div
      data-reveal
      className={className}
      initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 1.4, delay, ease }}
    >
      {children}
    </m.div>
  );
}

const lineVariants = {
  hidden: { y: '105%' },
  show: { y: '0%', transition: { duration: 1.2, ease } },
};

/**
 * Título que sobe linha a linha por trás de uma máscara. Cada item de `lines` é uma linha.
 * A visibilidade é observada no contêiner (as linhas ficam recortadas pela máscara e
 * não seriam detectadas sozinhas pelo IntersectionObserver).
 */
export function MaskedLines({
  lines,
  className = '',
  delay = 0,
}: {
  lines: ReactNode[];
  className?: string;
  delay?: number;
}) {
  return (
    <m.span
      className={`block ${className}`}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: delay } } }}
    >
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.1em] -mb-[0.1em]">
          <m.span data-reveal className="block" variants={lineVariants}>
            {line}
          </m.span>
        </span>
      ))}
    </m.span>
  );
}
