'use client';

import { useEffect } from 'react';

/**
 * Tells the surface under a mouse pointer where the pointer is (--mx, --my),
 * so its soft light can follow it (the `surface` utility). One listener for
 * the whole app, at most one style write per frame; touch is ignored.
 */
export function usePointerLight() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    const apply = () => {
      frame = 0;
      const event = last;
      if (!event || !(event.target instanceof Element)) return;
      const surface = event.target.closest<HTMLElement>('.surface');
      if (!surface) return;
      const box = surface.getBoundingClientRect();
      surface.style.setProperty('--mx', `${Math.round(event.clientX - box.left)}px`);
      surface.style.setProperty('--my', `${Math.round(event.clientY - box.top)}px`);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      last = event;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
}
