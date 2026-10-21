import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { business, heroImages, whatsappLink } from '../data/site';
import { ArrowIcon } from './ui/Icons';
import { Picture } from './ui/Picture';

/** Alinha o texto à borda esquerda do .container-x mesmo com a foto sangrando à direita. */
const textCol =
  'px-5 sm:px-8 lg:pl-[max(2rem,calc((100vw-90rem)/2+2rem))] lg:pr-12 xl:pl-[max(4rem,calc((100vw-90rem)/2+4rem))] xl:pr-20';

/**
 * Primeira dobra editorial: nome em destaque, fotografia real em altura total
 * à direita (no celular, logo abaixo do nome). Uma única imagem prioritária
 * serve os dois layouts. As entradas usam CSS puro para animar já na primeira
 * pintura, antes da hidratação.
 */
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  // Parallax sutil (desligado com movimento reduzido); 5% cabe na folga de 6% da imagem.
  const reduced = useReducedMotion();
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '5%']);
  const detailY = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '-30%']);

  return (
    <section
      ref={ref}
      id="inicio"
      aria-labelledby="hero-titulo"
      className="grain relative grid overflow-hidden bg-cream lg:min-h-[100svh] lg:grid-cols-[minmax(0,1fr)_44vw] lg:grid-rows-[1fr_auto_auto_1fr]"
    >
      <div className={`${textCol} pt-28 lg:col-start-1 lg:row-start-2 lg:pt-28`}>
        <p className="eyebrow eyebrow-rule hero-fade text-bronze" style={{ animationDelay: '0.15s' }}>
          Hair studio · {business.city}, {business.state}
        </p>

        <h1
          id="hero-titulo"
          className="display mt-6 text-[clamp(3.75rem,17vw,7.5rem)] text-espresso lg:mt-8 lg:text-[clamp(5.5rem,8.4vw,10.5rem)]"
        >
          <span className="block overflow-hidden pb-[0.06em]">
            <span className="hero-line block" style={{ animationDelay: '0.2s' }}>
              Studio Sene
            </span>
          </span>
          <span className="block overflow-hidden pb-[0.12em]">
            <span className="hero-line block pl-[0.9em] italic text-cafe" style={{ animationDelay: '0.32s' }}>
              Hair
            </span>
          </span>
        </h1>
      </div>

      {/* Fotografia: abaixo do nome no celular; coluna direita em altura total no desktop */}
      <div className="relative mx-5 mt-6 sm:mx-8 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:m-0">
        <div
          className="hero-unveil relative aspect-[4/5] overflow-hidden sm:aspect-square md:aspect-[5/4] lg:absolute lg:inset-x-0 lg:bottom-0 lg:top-24 lg:aspect-auto"
          style={{ animationDelay: '0.1s' }}
        >
          <m.div style={{ y: imageY }} className="absolute inset-x-0 -top-[6%] h-[112%]">
            <Picture
              image={heroImages.main}
              sizes="(min-width: 1024px) 44vw, 100vw"
              priority
              pictureClassName="block size-full"
              className="hero-zoom size-full object-cover object-[50%_32%]"
            />
          </m.div>
          <div
            className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/35 to-transparent"
            aria-hidden="true"
          />
          <p className="absolute bottom-5 right-5 text-[0.5625rem] font-medium uppercase tracking-[0.32em] text-ivory/95 lg:bottom-10 lg:right-8 lg:rotate-180 lg:text-[0.625rem] lg:[writing-mode:vertical-rl]">
            Resultado real · Botox capilar
          </p>
        </div>

        <m.figure
          style={{ y: detailY }}
          className="absolute bottom-[14%] left-0 z-10 hidden w-[min(12vw,12.5rem)] -translate-x-1/2 border-[6px] border-cream shadow-[0_30px_60px_-30px_rgb(22_16_12/0.55)] lg:block"
        >
          <Picture image={heroImages.detail} sizes="12.5rem" className="aspect-[3/4] w-full object-cover" />
        </m.figure>
      </div>

      <div className={`${textCol} pb-20 pt-12 lg:col-start-1 lg:row-start-3 lg:pb-16 lg:pt-10`}>
        <p
          className="hero-fade max-w-xl font-display text-[clamp(1.875rem,4.4vw,2.75rem)] leading-[1.08] text-espresso"
          style={{ animationDelay: '0.55s' }}
        >
          O brilho que <em className="italic text-bronze">reflete</em> você.
        </p>
        <p
          className="hero-fade mt-5 max-w-md text-[0.9375rem] leading-relaxed text-cafe text-pretty md:text-base"
          style={{ animationDelay: '0.68s' }}
        >
          Botox capilar, progressiva sem formol, selagem e cuidados que devolvem saúde, alinhamento e brilho aos fios —
          com resultado personalizado para o seu cabelo.
        </p>

        <div
          className="hero-fade mt-9 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-9"
          style={{ animationDelay: '0.8s' }}
        >
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-dark">
            Agende sua experiência
            <ArrowIcon className="btn-arrow h-3 w-7" />
          </a>
          <a
            href="#resultados"
            className="link-line self-start whitespace-nowrap text-[0.71875rem] font-medium uppercase tracking-[0.24em] text-espresso sm:self-auto"
          >
            Conheça nosso trabalho
          </a>
        </div>

        <div
          className="hero-fade mt-14 hidden items-center gap-6 whitespace-nowrap text-[0.625rem] font-medium uppercase tracking-[0.32em] text-taupe xl:flex"
          style={{ animationDelay: '1s' }}
        >
          <span>{business.tagline}</span>
          <span className="h-px w-16 bg-taupe/50" aria-hidden="true" />
          <span>Role para descobrir</span>
        </div>
      </div>
    </section>
  );
}
