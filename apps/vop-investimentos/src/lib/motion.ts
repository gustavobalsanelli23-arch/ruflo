// Linguagem de movimento do site, num lugar só. A entrada padrão é a do
// briefing: desfoque de 10px, opacidade 0 e 20px abaixo → nítido, 0.8s easeOut.
import type { Transition, Variants } from 'framer-motion';

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_CINEMA = [0.65, 0, 0.35, 1] as const;

/**
 * Ao terminar, o filtro sai de vez (`none`): um `filter` residual, mesmo
 * blur(0px), isola o backdrop-filter dos elementos de vidro dentro dele.
 */
export const SETTLE = { transitionEnd: { filter: 'none' } } as const;

export const enter = {
  hidden: { filter: 'blur(10px)', opacity: 0, y: 20 },
  visible: { filter: 'blur(0px)', opacity: 1, y: 0, ...SETTLE },
} satisfies Variants;

export const enterTransition: Transition = { duration: 0.8, ease: 'easeOut' };

/** Grupo com filhos em cascata (cards, listas). */
export const stagger = (step = 0.09, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: step, delayChildren } },
});

/** Quanto do elemento precisa aparecer para a entrada começar. */
export const VIEWPORT = { once: true, amount: 0.15 } as const;
