import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { bookingChannel, bookingHref, business, heroImage, location, marqueeItems } from '../data/site';
import { ArrowUpRight, InstagramIcon, WhatsAppIcon } from './ui/Icons';
import { Logo } from './ui/Logo';
import { Marquee } from './ui/Marquee';
import { Picture } from './ui/Picture';
import { Spray } from './ui/Spray';

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const photoY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-12%']);
  const markY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '18%']);
  const BookIcon = bookingChannel === 'whatsapp' ? WhatsAppIcon : InstagramIcon;

  return (
    <section ref={ref} id="inicio" aria-labelledby="hero-title" className="concrete relative isolate overflow-hidden pt-16 lg:pt-[4.5rem]">
      {/* Logo gigante ao fundo, cortada pela borda: a assinatura grafitada da marca. */}
      <m.div
        aria-hidden="true"
        style={{ y: markY }}
        className="hero-spray pointer-events-none absolute -right-[22%] top-[6%] -z-10 w-[120%] opacity-[0.06] sm:-right-[10%] sm:w-[90%] lg:-right-[6%] lg:top-[2%] lg:w-[62%]"
      >
        <Logo decorative priority className="h-auto w-full -rotate-6" />
      </m.div>

      <div className="container-x grid items-center gap-12 pb-14 pt-8 lg:min-h-[calc(100svh-4.5rem)] lg:grid-cols-12 lg:gap-6 lg:pb-32 lg:pt-6">
        <div className="relative z-10 lg:col-span-7">
          <p className="tag hero-fade flex flex-wrap items-center gap-x-3 gap-y-1 text-smoke" style={{ animationDelay: '0.1s' }}>
            <span className="text-chalk">[ Por {business.barber} ]</span>
            <span aria-hidden="true" className="hidden h-[3px] w-10 bg-chalk xs:block" />
            {location.locality}
          </p>

          <h1 id="hero-title" className="mt-6">
            <span className="sr-only">
              {business.name}. Seu estilo, sua identidade.
            </span>
            <span aria-hidden="true" className="poster block text-[clamp(3.5rem,20vw,11.25rem)] text-chalk lg:text-[clamp(6rem,12vw,10.75rem)]">
              <span className="-my-[0.14em] block overflow-hidden py-[0.14em]">
                <span className="hero-line block" style={{ animationDelay: '0.15s' }}>
                  Barbearia
                </span>
              </span>
              <span className="relative -my-[0.14em] block overflow-hidden py-[0.14em]">
                <span className="hero-line block" style={{ animationDelay: '0.25s' }}>
                  Black.
                </span>
              </span>
            </span>
            <span aria-hidden="true" className="poster relative mt-4 block text-[clamp(2.1rem,8.4vw,4.75rem)] text-paper lg:text-[clamp(2.4rem,4.6vw,4.75rem)]">
              <span className="-my-[0.14em] block overflow-hidden py-[0.14em]">
                <span className="hero-line poster-outline block" style={{ animationDelay: '0.38s' }}>
                  Seu estilo,
                </span>
              </span>
              <span className="relative -my-[0.14em] block w-fit overflow-hidden py-[0.14em]">
                <span className="hero-line block" style={{ animationDelay: '0.46s' }}>
                  sua identidade.
                </span>
              </span>
              <Spray variant="underline" className="hero-spray absolute -bottom-5 left-0 h-5 w-[min(30rem,88%)] text-chalk md:-bottom-6 md:h-7" seed={12} />
            </span>
          </h1>

          <p className="hero-fade mt-12 max-w-md text-pretty text-lg text-smoke md:text-xl" style={{ animationDelay: '0.6s' }}>
            Mais que um corte. Personalidade, técnica e atitude em cada detalhe.
          </p>

          <div className="hero-fade mt-9 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ animationDelay: '0.7s' }}>
            <a href={bookingHref()} target="_blank" rel="noopener" className="btn btn-chalk">
              <BookIcon className="size-5" />
              Agendar horário
              <ArrowUpRight className="btn-arrow size-4" />
            </a>
            <a href="#sobre" className="btn btn-line">
              Conhecer a barbearia
            </a>
          </div>
        </div>

        {/* Fotografia colada como lambe-lambe */}
        <div className="relative z-0 lg:col-span-5">
          <m.div style={{ y: photoY }} className="relative mx-auto w-[82%] max-w-[26rem] sm:w-[60%] lg:ml-auto lg:mr-0 lg:w-full">
            <div className="hero-photo relative rotate-[2.5deg]" style={{ animationDelay: '0.3s' }}>
              <span className="tape -top-3 left-6 -rotate-[8deg]" aria-hidden="true" />
              <span className="tape -bottom-3 right-4 rotate-[6deg]" aria-hidden="true" />
              <figure className="border-[7px] border-chalk bg-chalk shadow-[14px_14px_0_0_rgb(255_255_255/0.08)]">
                {heroImage ? (
                  <div className="grain overflow-hidden">
                    <Picture
                      image={heroImage}
                      avif
                      priority
                      sizes="(min-width: 1024px) 34vw, (min-width: 640px) 60vw, 82vw"
                      className="aspect-[4/5] h-auto w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="concrete grid aspect-[4/5] place-items-center p-8">
                    <Logo decorative priority className="h-auto w-4/5" />
                  </div>
                )}
                <figcaption className="flex items-center justify-between gap-3 px-1 pb-0.5 pt-2.5 text-ink">
                  <span className="tag">@{business.instagramHandle}</span>
                  <span className="tag text-ash">Trabalho real</span>
                </figcaption>
              </figure>
            </div>
            <Spray variant="cross" className="hero-spray absolute -left-8 -top-10 size-20 text-chalk md:-left-12 md:size-24" seed={21} strokeWidth={11} />
          </m.div>
        </div>
      </div>

      {/* Faixa corrida inclinada, como fita colada sobre o muro */}
      <div className="relative -mx-4 mb-12 -rotate-[1.6deg] bg-chalk py-3 text-ink md:py-4 lg:absolute lg:inset-x-0 lg:bottom-8 lg:mb-0">
        <Marquee items={marqueeItems} />
      </div>
    </section>
  );
}
