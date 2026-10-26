import { useSyncExternalStore } from 'react';

/**
 * Estado de uma media query. No servidor (pré-renderização) devolve
 * `serverValue`, então a primeira pintura nunca depende dela.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
/** Mouse ou trackpad: hover real e ponteiro preciso. */
export const FINE_POINTER = '(hover: hover) and (pointer: fine)';
