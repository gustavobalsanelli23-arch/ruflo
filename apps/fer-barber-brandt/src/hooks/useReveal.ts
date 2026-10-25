import type { DependencyList, RefObject } from 'react';
import { EASE, PLAY_ONCE, SplitText, gsap, whenIdle } from '../lib/motion';
import { useGsap } from './useGsap';

/**
 * Revelações de rolagem de uma seção, declaradas no markup:
 *  - data-reveal="lines"  → o texto sobe linha a linha, por trás de uma máscara
 *  - data-reveal="image"  → a foto é revelada de baixo para cima e assenta
 *                           (só transform: moldura que sobe + miolo que desce)
 *  - data-reveal="fade"   → leve subida com opacidade
 *  - data-reveal="rule"   → filete que se desenha da esquerda
 *  - data-speed="0.1"     → parallax discreto (fração da altura do elemento)
 * Fotos marcadas como data-reveal="tile" ficam de fora: quem as anima é o
 * próprio componente (a galeria, que troca de colunas conforme a largura).
 * Com prefers-reduced-motion nada disso roda e tudo aparece no lugar.
 */
export function useReveal(scope: RefObject<HTMLElement | null>, deps: DependencyList = []) {
  // Montado com a thread ociosa: as seções abaixo da dobra não disputam
  // a primeira pintura com a hidratação.
  useGsap((ctx) => whenIdle(() => ctx.add(() => reveal(scope))), scope, deps);
}

const isCompact = () => !window.matchMedia('(min-width: 1024px)').matches;

/** Revelação de foto (moldura sobe, miolo desce, a imagem assenta). */
export function revealFrame(el: HTMLElement, compact = isCompact()) {
  const mover = el.querySelector('[data-reveal-mover]');
  const counter = el.querySelector('[data-reveal-counter]');
  const media = el.querySelector('img, .plate');
  const tl = gsap.timeline({
    delay: Number(el.dataset.delay ?? 0),
    scrollTrigger: { trigger: el, start: 'top 90%', ...PLAY_ONCE },
  });
  const duration = compact ? 1.1 : 1.5;
  if (mover && counter) {
    tl.fromTo(mover, { yPercent: 100 }, { yPercent: 0, duration, ease: EASE.inOut }, 0).fromTo(
      counter,
      { yPercent: -100 },
      { yPercent: 0, duration, ease: EASE.inOut },
      0,
    );
  }
  if (media) tl.fromTo(media, { scale: compact ? 1.12 : 1.24 }, { scale: 1, duration: duration + 0.8, ease: EASE.out }, 0);
  // Terminada a revelação, nada de transform inline esquecido nos elementos.
  tl.eventCallback('onComplete', () => gsap.set([mover, counter, media].filter(Boolean), { clearProps: 'transform' }));
  return tl;
}

/** Parallax discreto: só a partir do tablet, e pela metade antes do desktop. */
export function parallax(el: HTMLElement) {
  if (!window.matchMedia('(min-width: 768px)').matches) return;
  const speed = Number(el.dataset.speed) * (isCompact() ? 0.5 : 1);
  gsap.fromTo(
    el,
    { yPercent: speed * 50 },
    { yPercent: speed * -50, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } },
  );
}

function reveal(scope: RefObject<HTMLElement | null>) {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const q = gsap.utils.selector(scope.current);
    const start = 'top 86%';
    const compact = isCompact();

    q('[data-reveal="lines"]').forEach((el: HTMLElement) => {
      // Só linhas: as palavras continuam inteiras para o leitor de tela. Depois
      // de revelado, o texto volta ao original (sem divisões presas ao layout
      // daquela largura de tela).
      const split = SplitText.create(el, { type: 'lines', mask: 'lines', aria: 'none' });
      gsap.from(split.lines, {
        yPercent: 108,
        duration: 1.25,
        stagger: 0.1,
        delay: Number(el.dataset.delay ?? 0),
        scrollTrigger: { trigger: el, start, ...PLAY_ONCE },
        onComplete: () => split.revert(),
      });
    });

    q('[data-reveal="image"]').forEach((el: HTMLElement) => revealFrame(el, compact));

    q('[data-reveal="fade"]').forEach((el: HTMLElement) => {
      // Só opacidade (sem visibility): o conteúdo continua no leitor de tela e no Tab.
      gsap.from(el, {
        opacity: 0,
        y: compact ? 16 : 26,
        duration: 1.1,
        delay: Number(el.dataset.delay ?? 0),
        scrollTrigger: { trigger: el, start, ...PLAY_ONCE },
      });
    });

    q('[data-reveal="rule"]').forEach((el: HTMLElement) => {
      gsap.from(el, {
        scaleX: 0,
        transformOrigin: el.dataset.origin ?? 'left center',
        duration: 1.6,
        ease: EASE.inOut,
        delay: Number(el.dataset.delay ?? 0),
        scrollTrigger: { trigger: el, start, ...PLAY_ONCE },
      });
    });

    q('[data-speed]:not([data-speed-own])').forEach((el: HTMLElement) => parallax(el));
  });
  return () => mm.revert();
}
