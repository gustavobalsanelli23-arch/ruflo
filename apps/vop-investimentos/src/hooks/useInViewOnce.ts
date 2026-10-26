import { useEffect, useState, type RefObject } from 'react';

/**
 * true na primeira vez que o elemento entra na tela (IntersectionObserver).
 * Sem suporte a IntersectionObserver, considera visível de imediato.
 */
export function useInViewOnce(ref: RefObject<Element | null>, { threshold = 0.1, rootMargin = '0px' } = {}): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, rootMargin, inView]);
  return inView;
}
