import type { PointerEvent } from 'react';

/**
 * Inclinação em camadas (classe .tilt, em depth.css): o ponteiro vira o
 * elemento em até `max` graus e posiciona o brilho (--mx/--my). Só com mouse;
 * no toque e com "reduzir movimento" o card fica plano.
 */
export function tiltHandlers(max = 8) {
  return {
    onPointerMove(e: PointerEvent<HTMLElement>) {
      if (e.pointerType !== 'mouse') return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.dataset.tilting = '';
      el.style.setProperty('--ry', `${((px - 0.5) * max).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - py) * max * 0.8).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${Math.round(e.clientX - r.left)}px`);
      el.style.setProperty('--my', `${Math.round(e.clientY - r.top)}px`);
    },
    onPointerLeave(e: PointerEvent<HTMLElement>) {
      const el = e.currentTarget;
      delete el.dataset.tilting;
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    },
  };
}
