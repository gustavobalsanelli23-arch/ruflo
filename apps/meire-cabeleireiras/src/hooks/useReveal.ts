import type { RefObject } from 'react';
import { EASE, SplitText, gsap, whenIdle } from '../lib/motion';
import { useGsap } from './useGsap';

/**
 * Revelações de rolagem de uma seção, declaradas no markup:
 *  - data-reveal="lines"  → texto sobe linha a linha, por trás de uma máscara
 *  - data-reveal="image"  → a foto se abre de baixo para cima e assenta (zoom-out)
 *  - data-reveal="fade"   → leve subida com opacidade
 *  - data-reveal="rule"   → filete que se desenha da esquerda
 *  - data-speed="0.1"     → parallax sutil (fração da altura do elemento)
 * Com prefers-reduced-motion nada disso roda e tudo aparece no lugar.
 */
export function useReveal(scope: RefObject<HTMLElement | null>) {
  // Montado com a thread ociosa: as seções abaixo da dobra não disputam
  // a primeira pintura (LCP) com a hidratação.
  useGsap((ctx) => whenIdle(() => ctx.add(() => reveal(scope))), scope);
}

function reveal(scope: RefObject<HTMLElement | null>) {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const q = gsap.utils.selector(scope.current);
    const start = 'top 86%';

    q('[data-reveal="lines"]').forEach((el: HTMLElement) => {
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        // Só linhas: as palavras continuam inteiras, o leitor de tela lê normalmente.
        aria: 'none',
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 108,
            duration: 1.25,
            stagger: 0.09,
            scrollTrigger: { trigger: el, start, once: true },
          }),
      });
    });

    q('[data-reveal="image"]').forEach((el: HTMLElement) => {
      const img = el.querySelector('img');
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      tl.fromTo(
        el,
        { clipPath: 'inset(100% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: EASE.inOut },
      );
      if (img) tl.fromTo(img, { scale: 1.28 }, { scale: 1, duration: 2.2, ease: EASE.out }, 0);
    });

    q('[data-reveal="fade"]').forEach((el: HTMLElement) => {
      // Só opacidade (sem visibility): o conteúdo continua no leitor de tela e no Tab.
      gsap.from(el, {
        opacity: 0,
        y: 24,
        duration: 1.1,
        delay: Number(el.dataset.delay ?? 0),
        scrollTrigger: { trigger: el, start, once: true },
      });
    });

    q('[data-reveal="rule"]').forEach((el: HTMLElement) => {
      gsap.from(el, {
        scaleX: 0,
        transformOrigin: el.dataset.origin ?? 'left center',
        duration: 1.6,
        ease: EASE.inOut,
        delay: Number(el.dataset.delay ?? 0),
        scrollTrigger: { trigger: el, start, once: true },
      });
    });

    // Parallax só onde há espaço para ele (desktop).
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    q('[data-speed]').forEach((el: HTMLElement) => {
      const speed = Number(el.dataset.speed);
      gsap.fromTo(
        el,
        { yPercent: speed * 50 },
        {
          yPercent: speed * -50,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    });
  });
  return () => mm.revert();
}
