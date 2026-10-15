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
export function RevealImage({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <m.div
      data-reveal
      className={className}
      initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 1.4, delay, ease }}
    >
      <m.div
        className="size-full"
        initial={{ scale: 1.15 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: '0px 0px -8% 0px' }}
        transition={{ duration: 2, delay, ease }}
      >
        {children}
      </m.div>
    </m.div>
  );
}

/**
 * Título com entrada por linhas (máscara + deslocamento). Cada item do array
 * é uma linha; o conteúdo pode conter <em> para o itálico editorial.
 */
export function RevealLines({
  lines,
  className,
  id,
  as = 'h2',
  delay = 0,
}: {
  lines: ReactNode[];
  className?: string;
  id?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  delay?: number;
}) {
  const Tag = as;
  return (
    <Tag id={id} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em]">
          <m.span
            data-reveal
            className="block"
            initial={{ y: '105%' }}
            whileInView={{ y: '0%' }}
            viewport={{ once: true, margin: '0px 0px -8% 0px' }}
            transition={{ duration: 1.1, delay: delay + i * 0.09, ease }}
          >
            {line}
          </m.span>
        </span>
      ))}
    </Tag>
  );
}
