'use client';

import { createElement, useEffect, useRef } from 'react';
import { cn } from '@/lib/format';

/**
 * Aparição suave ao entrar na tela. Um único IntersectionObserver é
 * compartilhado por toda a página (barato mesmo com centenas de cards).
 * Respeita `prefers-reduced-motion` via CSS (globals.css).
 */
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return null;
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.visible = 'true';
          observer?.unobserve(entry.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  return observer;
}

interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  as?: keyof React.JSX.IntrinsicElements;
  /** Atraso em ms — use para efeito em cascata (stagger). */
  delay?: number;
  variant?: 'up' | 'fade' | 'scale';
}

export function Reveal({ as = 'div', delay = 0, variant = 'up', className, style, children, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    const obs = getObserver();
    if (!el) return;
    if (!obs) {
      el.dataset.visible = 'true';
      return;
    }
    obs.observe(el);
    return () => obs.unobserve(el);
  }, []);

  return createElement(
    as,
    {
      ref,
      'data-reveal': variant,
      className: cn(className),
      style: delay ? { ...style, ['--reveal-delay' as string]: `${delay}ms` } : style,
      ...rest,
    },
    children,
  );
}

/** Atraso em cascata limitado, para listas longas não demorarem a aparecer. */
export const stagger = (index: number, step = 50, max = 6) => Math.min(index, max) * step;
