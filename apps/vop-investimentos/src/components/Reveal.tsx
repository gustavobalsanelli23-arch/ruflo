import { m, useReducedMotion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';
import { enter, enterTransition, stagger as staggerVariants, VIEWPORT } from '../lib/motion';

type Tag = 'div' | 'section' | 'li' | 'ul' | 'ol' | 'p' | 'span' | 'article' | 'header' | 'figure' | 'dl';

interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  as?: Tag;
  delay?: number;
  children?: ReactNode;
}

/**
 * Entrada padrão do site (desfoque 10px, opacidade 0, 20px abaixo → nítido,
 * 0.8s easeOut) quando o bloco entra na tela. Só uma vez.
 */
export function Reveal({ as = 'div', delay = 0, children, ...rest }: RevealProps) {
  const reduce = useReducedMotion();
  const Component = m[as] as typeof m.div;
  return (
    <Component
      data-reveal
      variants={enter}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      transition={reduce ? { duration: 0 } : { ...enterTransition, delay }}
      {...rest}
    >
      {children}
    </Component>
  );
}

interface GroupProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  as?: Tag;
  step?: number;
  delay?: number;
  children?: ReactNode;
}

/** Grupo cujos filhos (RevealItem) entram em cascata. */
export function RevealGroup({ as = 'div', step = 0.09, delay = 0, children, ...rest }: GroupProps) {
  const Component = m[as] as typeof m.div;
  return (
    <Component variants={staggerVariants(step, delay)} initial="hidden" whileInView="visible" viewport={VIEWPORT} {...rest}>
      {children}
    </Component>
  );
}

export function RevealItem({ as = 'div', children, ...rest }: Omit<RevealProps, 'delay'>) {
  const reduce = useReducedMotion();
  const Component = m[as] as typeof m.div;
  return (
    <Component data-reveal variants={enter} transition={reduce ? { duration: 0 } : enterTransition} {...rest}>
      {children}
    </Component>
  );
}
