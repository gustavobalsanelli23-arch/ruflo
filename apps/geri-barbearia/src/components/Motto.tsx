import { useRef } from 'react';
import { pillars } from '../data/content';
import { useGsap } from '../hooks/useGsap';
import { useReveal } from '../hooks/useReveal';
import { EASE, gsap } from '../lib/motion';

/** Altura do corte, em % da caixa da palavra (meio da altura-x do Bodoni). */
const CUT = 61;

/** Palavra desenhada em duas metades sobrepostas, para poder ser "cortada". */
function Sliced({ word, className = '' }: { word: string; className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="invisible block">{word}</span>
      <span data-half="top" className="absolute inset-0 block" style={{ clipPath: `inset(0 0 ${100 - CUT}% 0)` }}>
        {word}
      </span>
      <span data-half="bottom" className="absolute inset-0 block" style={{ clipPath: `inset(${CUT}% 0 0 0)` }}>
        {word}
      </span>
      <span
        data-cut
        className="absolute right-[-4vw] left-[-30vw] block h-px origin-left bg-gold"
        style={{ top: `${CUT}%` }}
      />
    </span>
  );
}

/**
 * O lema do emblema vira o grande momento do site: "Chegou," entra pela
 * esquerda, "cortou." pela direita, e um filete dourado corta a palavra ao
 * meio. No desktop a cena acompanha a rolagem (pin + scrub).
 */
export function Motto() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  useGsap(() => {
    const mm = gsap.matchMedia();
    const words = (tl: gsap.core.Timeline) =>
      tl
        .from('[data-word="chegou"]', { xPercent: -28, autoAlpha: 0, duration: 1 }, 0)
        .from('[data-word="cortou"]', { xPercent: 28, autoAlpha: 0, duration: 1 }, 0.2);
    const cut = (tl: gsap.core.Timeline, at = 0) =>
      tl
        .fromTo('[data-cut]', { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: EASE.inOut }, at)
        .to(
          '[data-half="top"]',
          { x: '-0.06em', y: '-0.02em', rotate: -0.6, duration: 0.6, ease: EASE.soft },
          at + 0.65,
        )
        .to(
          '[data-half="bottom"]',
          { x: '0.06em', y: '0.02em', rotate: 0.6, duration: 0.6, ease: EASE.soft },
          at + 0.65,
        )
        .to('[data-cut]', { autoAlpha: 0, duration: 0.4 }, at + 0.95)
        .from('[data-motto-note]', { autoAlpha: 0, y: 20, duration: 0.6 }, at + 0.9);

    // Desktop: as palavras entram enquanto a cena sobe; com a cena fixada, o corte.
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
      words(
        gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: '[data-motto-stage]', start: 'top 92%', end: 'top 12%', scrub: 0.6 },
        }),
      );
      cut(
        gsap.timeline({
          defaults: { ease: EASE.soft },
          scrollTrigger: { trigger: '[data-motto-stage]', start: 'top top', end: '+=90%', pin: true, scrub: 0.8 },
        }),
      );
    });

    // Celular: a mesma cena, tocada uma vez quando entra na tela.
    mm.add('(prefers-reduced-motion: no-preference) and (max-width: 767px)', () => {
      const tl = gsap.timeline({
        defaults: { ease: EASE.soft, duration: 1 },
        scrollTrigger: { trigger: '[data-motto-stage]', start: 'top 70%', once: true },
      });
      words(tl);
      cut(tl, 1.1);
    });

    return () => mm.revert();
  }, root);

  return (
    <section ref={root} id="experiencia" aria-labelledby="lema" className="relative overflow-hidden">
      <div data-motto-stage className="relative flex min-h-[100svh] flex-col justify-center py-24">
        <div className="container-x">
          <h2 id="lema" className="font-serif leading-[0.98] tracking-[-0.03em] md:leading-[0.86]">
            <span className="sr-only">Chegou, cortou.</span>
            <span aria-hidden="true" className="block text-[clamp(4.4rem,1rem+15vw,15.5rem)]">
              <span data-word="chegou" className="block">
                Chegou,
              </span>
              <span data-word="cortou" className="block text-right">
                <Sliced word="cortou." />
              </span>
            </span>
          </h2>

          <p data-motto-note className="mt-12 max-w-md text-lead text-bone/80 lg:mt-16 lg:ml-[8%]">
            Sem agendamento. A Geri atende por ordem de chegada: você chega, aguarda a sua vez e senta na cadeira.
          </p>
        </div>
      </div>

      {/* O que a casa entrega */}
      <div className="container-x pb-[var(--section)]">
        <ul className="grid border-[var(--line)] md:grid-cols-3 md:border-l">
          {pillars.map((p, i) => (
            <li
              key={p.title}
              className="relative border-t border-[var(--line)] py-10 md:border-t-0 md:border-r md:px-8 md:py-4 lg:px-12"
            >
              <h3 data-reveal="fade" data-delay={String(i * 0.12)} className="text-[1.9rem] leading-tight">
                {p.title}
              </h3>
              <p data-reveal="fade" data-delay={String(0.1 + i * 0.12)} className="mt-4 max-w-xs text-bone/70">
                {p.text}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
