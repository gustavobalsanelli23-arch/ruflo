import { useRef } from 'react';
import { useGsap } from '../hooks/useGsap';
import { EASE, gsap, lockScroll, openIntroGate } from '../lib/motion';
import { Emblem } from './Emblem';

export const INTRO_KEY = 'geri:intro';

/**
 * Abertura (só na primeira visita da sessão e sem reduced-motion):
 * o emblema se desenha, um filete dourado corta a tela ao meio e as duas
 * metades se afastam, revelando o site. "Chegou, cortou."
 * Quem decide se ela aparece é o script inline do <head> (classe .js-intro),
 * antes da primeira pintura — sem piscar.
 */
export function Intro() {
  const root = useRef<HTMLDivElement>(null);

  useGsap(() => {
    const html = document.documentElement;
    if (!html.classList.contains('js-intro')) {
      openIntroGate();
      return;
    }
    lockScroll(true);

    const finish = () => {
      html.classList.remove('js-intro');
      lockScroll(false);
      try {
        sessionStorage.setItem(INTRO_KEY, '1');
      } catch {
        /* navegação privada: tudo bem repetir a abertura */
      }
    };

    gsap
      .timeline({ defaults: { ease: EASE.out }, onComplete: finish })
      .fromTo(
        '[data-draw]',
        { drawSVG: '0%' },
        { drawSVG: '100%', duration: 1, stagger: 0.03, ease: 'power2.inOut' },
        0,
      )
      .from(
        '[data-emblem-text], [data-emblem-pole] g, [data-emblem-scissors] path:not([data-draw])',
        { autoAlpha: 0, duration: 0.6 },
        0.45,
      )
      .fromTo('[data-intro-line]', { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: EASE.inOut }, 0.85)
      .to('[data-intro-emblem]', { autoAlpha: 0, scale: 0.94, duration: 0.45, ease: 'power2.in' }, 1.05)
      .add(openIntroGate, 1.3)
      .to('[data-intro-top]', { yPercent: -100, duration: 1.15, ease: EASE.inOut }, 1.3)
      .to('[data-intro-bottom]', { yPercent: 100, duration: 1.15, ease: EASE.inOut }, 1.3)
      .to('[data-intro-line]', { autoAlpha: 0, duration: 0.4 }, 1.35);
  }, root);

  return (
    <div ref={root} className="intro fixed inset-0 z-[95]" aria-hidden="true">
      <div data-intro-top className="absolute inset-x-0 top-0 h-1/2 bg-ink" />
      <div data-intro-bottom className="absolute inset-x-0 bottom-0 h-1/2 bg-ink" />
      <div data-intro-line className="absolute inset-x-0 top-1/2 h-px origin-left bg-gold" />
      <div
        data-intro-emblem
        className="absolute top-1/2 left-1/2 w-40 -translate-x-1/2 -translate-y-1/2 text-gold sm:w-48"
      >
        <Emblem />
      </div>
    </div>
  );
}
