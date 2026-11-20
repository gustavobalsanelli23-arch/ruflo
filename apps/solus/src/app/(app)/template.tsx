'use client';

import { motion } from 'motion/react';
import { useLayoutEffect, useRef } from 'react';

/** Blocks that arrive one after another: the page title and every surface. */
const ITEMS = 'h1, .surface, .stat-strip, [data-reveal]';
const STEP = 60;
const MAX_STEPS = 10;
const ARRIVE: Keyframe[] = [
  { opacity: 0, transform: 'translateY(12px)', filter: 'blur(6px)' },
  { opacity: 1, transform: 'none', filter: 'none' },
];

/**
 * One orchestrated moment per navigation: the page settles in, its title and
 * panels arrive in reading order, and panels further down arrive as they
 * scroll into view. Uses the Web Animations API, so the server-rendered
 * markup is never touched (hydration stays exact). Nothing else moves.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || typeof el.animate !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const waiting = new Map<Element, Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          waiting.get(entry.target)?.play();
          waiting.delete(entry.target);
        }
      },
      { rootMargin: '0px 0px -6% 0px' },
    );
    const animations: Animation[] = [];
    let step = 0;
    for (const item of el.querySelectorAll<HTMLElement>(ITEMS)) {
      // Nested surfaces move with their parent.
      if (item.parentElement?.closest(ITEMS)) continue;
      const above = item.getBoundingClientRect().top < window.innerHeight;
      const animation = item.animate(ARRIVE, {
        duration: 700,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        delay: above ? Math.min(step, MAX_STEPS) * STEP : 0,
        fill: 'backwards',
      });
      animations.push(animation);
      if (above) {
        step += 1;
      } else {
        // Held on its first frame (hidden) until it scrolls into view.
        animation.pause();
        waiting.set(item, animation);
        observer.observe(item);
      }
    }
    return () => {
      observer.disconnect();
      for (const animation of animations) animation.cancel();
    };
  }, []);

  return (
    <motion.div
      ref={root}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
