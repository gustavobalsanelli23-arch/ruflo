import { useRef } from 'react';
import { business } from '../config/site';
import { copy, photos } from '../data/content';
import { useGsap } from '../hooks/useGsap';
import { gsap } from '../lib/motion';
import { hasPhoto, Picture } from './Picture';
import { BookingLink, InstagramLink, Scale, SectionLink } from './ui';

/**
 * Primeira dobra: a fotografia à direita (no celular, no alto), o nome em
 * caixa-alta ultracondensada atravessando a foto, a frase em itálico e o
 * agendamento. Camadas da foto, de fora para dentro:
 *   data-hero-media (deslocamento na rolagem, GSAP)
 *   └ mask / unmask (revelação de baixo para cima, só transform, WAAPI)
 *     └ zoom (assenta de 1.24 para 1, WAAPI)
 *       └ drift (respiro contínuo e lento, CSS)
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const realPhoto = hasPhoto(photos.hero);

  // Rolagem: a foto desce devagar e cresce um pouco; o texto sobe e esmaece.
  useGsap(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const q = gsap.utils.selector(root.current);
      const scrub = { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true };
      const wide = window.matchMedia('(min-width: 1024px)').matches;
      gsap.to(q('[data-hero-media]'), { yPercent: wide ? 10 : 6, scale: 1.04, ease: 'none', scrollTrigger: scrub });
      gsap.to(q('[data-hero-content]'), { y: wide ? -90 : -40, opacity: 0.25, ease: 'none', scrollTrigger: { ...scrub } });
    });
    return () => mm.revert();
  }, root);

  return (
    <section ref={root} id="topo" aria-labelledby="hero-titulo" className="relative isolate overflow-clip">
      {/* Fotografia */}
      <div
        data-hero-media
        className="absolute inset-x-0 top-0 h-[60svh] origin-top md:h-[62svh] lg:top-[calc(var(--header-h)+0.5rem)] lg:right-[var(--gutter)] lg:left-[53%] lg:h-[calc(100svh-var(--header-h)-3.5rem)] xl:left-[49%] 2xl:right-[calc(max(0px,(100vw-96rem)/2)+var(--gutter))] 2xl:left-[calc(max(0px,(100vw-96rem)/2)+min(100vw,96rem)*0.46)]"
      >
        <div data-intro="mask" className="relative h-full w-full overflow-hidden">
          <div data-intro="unmask" className="h-full w-full">
            <div data-intro="zoom" className="h-full w-full">
              <div data-hero-photo className="drift h-full w-full">
                <Picture
                  slot={photos.hero}
                  priority
                  sizes="(min-width: 1024px) 52vw, 100vw"
                  className="block h-full w-full"
                  imgClassName="h-full w-full object-cover"
                  position="50% 30%"
                  index="01"
                  plateTop
                />
              </div>
            </div>
          </div>
          {/* Véu de leitura: o nome atravessa a foto sem perder contraste. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(12_12_11/0.55)_0%,transparent_22%,transparent_52%,var(--color-carvao)_100%)] lg:bg-[linear-gradient(90deg,rgb(12_12_11/0.62)_0%,transparent_42%),linear-gradient(0deg,rgb(12_12_11/0.4)_0%,transparent_30%)]"
          />
        </div>
        <span data-intro="extra" aria-hidden="true" className="crop-marks hidden lg:block" />
        <p data-intro="extra" className="label absolute top-full right-0 mt-4 hidden items-center gap-3 text-fumo lg:flex">
          <span>Fig. 01</span>
          <span aria-hidden="true" className="h-px w-6 bg-current opacity-50" />
          {realPhoto ? (
            <InstagramLink className="link-line link-quiet">@{business.instagram.handle}</InstagramLink>
          ) : (
            <span>Fotografia em breve</span>
          )}
        </p>
      </div>

      {/* Texto */}
      <div
        data-hero-content
        className="container-x relative z-10 flex min-h-[100svh] flex-col justify-end pt-[calc(var(--header-h)+38svh)] pb-[max(2rem,env(safe-area-inset-bottom))] md:pt-[calc(var(--header-h)+40svh)] lg:pt-[calc(var(--header-h)+2rem)] lg:pb-12"
      >
        <p data-intro="eyebrow" className="label flex items-center gap-3 text-osso/80">
          <span aria-hidden="true" className="h-1.5 w-1.5 bg-osso" />
          {copy.eyebrow}
          <span aria-hidden="true" className="h-px w-8 bg-current opacity-40" />
          <InstagramLink className="link-line link-quiet">@{business.instagram.handle}</InstagramLink>
        </p>

        <h1 id="hero-titulo" className="text-mega mt-4 text-[min(clamp(4.5rem,0.9rem+25vw,16.5rem),31svh)] lg:mt-6 lg:text-[min(16.5rem,14.5vw,25svh)] xl:text-[min(16.5rem,15.5vw,25svh)]">
          <span className="-mb-[0.06em] block overflow-hidden pb-[0.06em]">
            <span data-intro="line" className="block">
              Fer <span className="serif text-[0.6em] tracking-[-0.02em]">barber</span>
            </span>
          </span>
          <span className="-mb-[0.06em] block overflow-hidden pb-[0.06em]">
            <span data-intro="line" className="block">
              Brandt
            </span>
          </span>
        </h1>

        <div className="mt-6 max-w-[38rem] lg:mt-8">
          <p data-intro="text" className="serif text-[clamp(1.75rem,1.3rem+1.5vw,2.6rem)] leading-[1.05]">
            {copy.phrase}
          </p>
          <p data-intro="text" className="text-lead mt-3 max-w-[36ch] text-osso/72 lg:max-w-[42ch]">
            {copy.intro}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4 lg:mt-8">
            <BookingLink data-intro="cta" className="btn btn-light max-sm:w-full" />
            <SectionLink data-intro="cta" href="#galeria" className="link-line label text-[0.7rem] max-sm:hidden">
              Ver trabalhos
            </SectionLink>
          </div>
        </div>

        <div className="mt-10 hidden items-center gap-6 text-osso xl:flex [@media(max-height:760px)]:hidden">
          <Scale intro ticks={36} className="w-[19rem] text-osso/60" />
          <p data-intro="extra" className="label flex items-center gap-3 text-fumo">
            <span className="relative block h-7 w-px overflow-hidden bg-current/25" aria-hidden="true">
              <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_2.4s_var(--ease-in-out-quart)_infinite] bg-osso" />
            </span>
            Role para conhecer
          </p>
        </div>
      </div>
    </section>
  );
}
