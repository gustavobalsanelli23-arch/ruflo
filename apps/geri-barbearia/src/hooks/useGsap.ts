import { useLayoutEffect, type DependencyList, type RefObject } from 'react';
import { gsap, setupGsap } from '../lib/motion';

/**
 * Cria animações GSAP num contexto ligado ao componente: tudo o que for
 * criado dentro de `setup` é desfeito (revert) ao desmontar.
 */
export function useGsap(
  setup: (context: gsap.Context) => void | (() => void),
  scope: RefObject<Element | null>,
  deps: DependencyList = [],
) {
  useLayoutEffect(() => {
    setupGsap();
    const ctx = gsap.context(setup, scope.current ?? undefined);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
