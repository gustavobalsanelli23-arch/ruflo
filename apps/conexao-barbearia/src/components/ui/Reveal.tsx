import { m } from 'framer-motion';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'li' | 'article' | 'header';
};

const ease = [0.22, 1, 0.36, 1] as const;

/** Revelação discreta durante a rolagem (respeita prefers-reduced-motion via MotionConfig). */
export function Reveal({ children, delay = 0, y = 28, className, as = 'div' }: Props) {
  const Tag = m[as];
  return (
    <Tag
      data-reveal
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.9, delay, ease }}
    >
      {children}
    </Tag>
  );
}

/** Revelação de imagem com cortina (clip-path), estilo editorial. */
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
      initial={{ clipPath: 'inset(12% 12% 12% 12%)', opacity: 0.4 }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 1.3, delay, ease }}
    >
      {children}
    </m.div>
  );
}
