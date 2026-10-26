import { m, useReducedMotion, useScroll, useSpring } from 'framer-motion';

/** Fio champanhe no topo da janela: quanto da página já foi percorrido. */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <m.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-px origin-left bg-champagne/80"
      style={{ scaleX: reduce ? scrollYProgress : smooth }}
    />
  );
}
