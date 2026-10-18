import { useRef } from 'react';
import { business } from '../config/site';
import { useGsap } from '../hooks/useGsap';
import { EASE, SplitText, gsap, introGate } from '../lib/motion';
import { Picture } from './Picture';
import { AnchorLink, OpenStatus, WhatsAppButton } from './ui';

const LETTERS = ['G', 'E', 'R', 'I'];

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGsap(() => {
    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', (ctx) => {
      let cancelled = false;

      // A sequência só começa quando a cortina abre e as fontes chegaram.
      Promise.all([introGate, document.fonts?.ready]).then(() => {
        if (cancelled) return;
        ctx.add(() => {
          const tagline = SplitText.create('[data-hero-tagline]', { type: 'lines', mask: 'lines', aria: 'none' });
          const header = document.querySelector('header');
          const tl = gsap
            .timeline({ defaults: { ease: EASE.out } })
            .set('[data-hero-item]', { visibility: 'visible' })
            .fromTo('[data-hero-mask]', { yPercent: 0 }, { yPercent: -101, duration: 1.5, ease: EASE.inOut }, 0)
            .fromTo('[data-hero-photo] img', { scale: 1.22 }, { scale: 1, duration: 2.4 }, 0)
            .from('[data-hero-char]', { yPercent: 108, duration: 1.4, stagger: 0.07 }, 0.3)
            .from('[data-hero-rule]', { scaleX: 0, duration: 1.4, ease: EASE.inOut }, 0.55)
            .from('[data-hero-sign]', { autoAlpha: 0, letterSpacing: '0.9em', duration: 1.6 }, 0.6)
            .from(tagline.lines, { yPercent: 105, duration: 1.2, stagger: 0.1 }, 0.75)
            .from('[data-hero-fade]', { autoAlpha: 0, y: 18, duration: 1, stagger: 0.09 }, 1.05)
            .from('[data-hero-cue]', { autoAlpha: 0, scaleY: 0, transformOrigin: 'top', duration: 1 }, 1.5);
          // O header fica fora da seção: entra pela referência ao elemento.
          if (header?.firstElementChild) {
            tl.set(header, { visibility: 'visible' }, 0).from(
              header.firstElementChild,
              { autoAlpha: 0, y: -24, duration: 1 },
              0.9,
            );
          }
        });
      });

      // Parallax sutil: a foto desce mais devagar que a página.
      gsap.to('[data-hero-photo] img', {
        yPercent: 9,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('[data-hero-word]', {
        yPercent: -18,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });

      return () => {
        cancelled = true;
      };
    });

    return () => mm.revert();
  }, root);

  return (
    <section
      ref={root}
      id="topo"
      aria-label="Apresentação"
      className="relative isolate flex min-h-[640px] h-[100svh] flex-col justify-end overflow-hidden lg:min-h-[720px]"
    >
      {/* Fotografia: tela cheia no celular, painel à direita no desktop */}
      <div
        data-hero-photo
        className="absolute inset-x-0 top-0 -z-10 h-[64%] overflow-hidden sm:h-[70%] lg:inset-y-0 lg:left-auto lg:h-auto lg:w-[58%] xl:w-[56%]"
      >
        <Picture
          image="freestyle-ring-light"
          alt="Cliente da Geri Barbearia de perfil, com degradê e desenho freestyle, sob a luz de um ring light"
          sizes="(min-width: 1280px) 56vw, (min-width: 1024px) 58vw, 100vw"
          priority
          className="block h-full w-full"
          imgClassName="h-full w-full object-cover will-change-transform"
          position="58% 28%"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgb(16_16_15/0.6)_0%,rgb(16_16_15/0)_28%,rgb(16_16_15/0.35)_60%,#10100f_100%)] lg:bg-[linear-gradient(90deg,#10100f_0%,rgb(16_16_15/0.55)_22%,rgb(16_16_15/0)_55%),linear-gradient(0deg,rgb(16_16_15/0.85)_0%,rgb(16_16_15/0)_35%)]"
        />
        <div data-hero-mask aria-hidden="true" className="absolute inset-0 hidden bg-ink [.js-motion_&]:block" />
        <p
          data-hero-item
          data-hero-fade
          className="absolute right-[var(--gutter)] bottom-10 hidden max-w-56 border-t border-gold/60 pt-3 text-right text-xs leading-relaxed text-parchment/80 lg:block"
        >
          Desenho freestyle sobre degradê.
          <br />
          Trabalho da casa.
        </p>
      </div>

      <div className="container-x relative pb-[max(2.5rem,env(safe-area-inset-bottom))] lg:pb-20">
        <div className="max-w-[44rem]">
          <h1 data-hero-item data-hero-word className="relative" translate="no">
            <span className="sr-only">{business.name}</span>
            <span aria-hidden="true" className="block">
              <span className="-ml-[0.04em] flex font-serif text-[clamp(6.25rem,27vw,10rem)] leading-[0.9] tracking-[-0.02em] lg:text-[clamp(10rem,17vw,18rem)]">
                {LETTERS.map((l) => (
                  <span key={l} className="inline-block overflow-hidden pt-[0.06em] pb-[0.02em]">
                    <span data-hero-char className="inline-block">
                      {l}
                    </span>
                  </span>
                ))}
              </span>
              <span className="mt-2 flex items-center gap-4 lg:mt-3">
                <span data-hero-rule className="rule-double w-10 origin-right lg:w-16" />
                <span data-hero-sign className="signage text-[0.7rem] text-parchment lg:text-xs">
                  Barbearia
                </span>
                <span data-hero-rule className="rule-double max-w-40 flex-1 origin-left" />
              </span>
            </span>
          </h1>

          <p
            data-hero-item
            data-hero-tagline
            className="mt-8 font-serif text-[clamp(1.9rem,1.2rem+2.6vw,3.25rem)] leading-[1.06] lg:mt-10"
          >
            Mais que um corte.
            <br />
            Uma tradição.
          </p>

          <p data-hero-item data-hero-fade className="mt-5 max-w-md text-[0.98rem] text-bone/75 lg:mt-6 lg:text-lead">
            Barbearia no centro de {business.address.city}, {business.address.state}. Atendimento por ordem de chegada,
            de terça a sábado.
          </p>

          <div data-hero-item data-hero-fade className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5">
            <WhatsAppButton source="hero" className="max-sm:w-full" />
            <AnchorLink href="#visite" className="link-line text-[0.9375rem] text-bone/90">
              Ver horários e endereço
            </AnchorLink>
          </div>

          <OpenStatus className="mt-7 text-parchment/90" />
        </div>
      </div>

      <div
        data-hero-item
        data-hero-cue
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 hidden h-16 w-px overflow-hidden bg-[var(--line)] lg:block"
      >
        <span className="absolute inset-x-0 top-0 h-1/2 animate-[cue_2.2s_cubic-bezier(0.76,0,0.24,1)_infinite] bg-gold" />
      </div>
    </section>
  );
}
