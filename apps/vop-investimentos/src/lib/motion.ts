// Linguagem de movimento do site, num lugar só, na estética de referência:
// títulos sobem de uma máscara (MASK), blocos assentam de 18px abaixo com
// opacidade (SETTLE da referência), fios se desenham (LINE).
import type { Transition, Variants } from 'framer-motion';

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_CINEMA = [0.65, 0, 0.35, 1] as const;
/** Curvas da referência: --e-mask (títulos) e --e-soft (assentar). */
export const EASE_MASK = [0.16, 1, 0.3, 1] as const;
export const EASE_SOFT = [0.22, 0.61, 0.36, 1] as const;

/**
 * Ao terminar, o filtro sai de vez (`none`): um `filter` residual, mesmo
 * blur(0px), isola o backdrop-filter dos elementos de vidro dentro dele.
 */
export const SETTLE = { transitionEnd: { filter: 'none' } } as const;

/** Entrada padrão de um bloco: assenta (opacidade e 18px abaixo → lugar). */
export const enter = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
} satisfies Variants;

export const enterTransition: Transition = { duration: 0.75, ease: EASE_SOFT };

/** Grupo com filhos em cascata (cards, listas). */
export const stagger = (step = 0.09, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: step, delayChildren } },
});

/** Quanto do elemento precisa aparecer para a entrada começar. */
export const VIEWPORT = { once: true, amount: 0.15 } as const;
