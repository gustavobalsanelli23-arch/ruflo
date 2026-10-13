import { m, useScroll, useTransform } from 'framer-motion';
import { useRef, type CSSProperties } from 'react';
import { googleRating, hours, images, logo } from '../data/site';
import { waLink } from '../lib/whatsapp';
import { ArrowRight, Star, WhatsApp } from './ui/Icons';
import { Picture } from './ui/Picture';
import { WhatsAppLink } from './ui/WhatsAppLink';

/** Atraso da animação de entrada (CSS) de cada elemento da primeira dobra. */
const delay = (s: number) => ({ '--d': `${s}s` }) as CSSProperties;

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-10%']);

  return (
    <section
      ref={ref}
      id="topo"
      aria-labelledby="hero-titulo"
      className="grain relative isolate flex min-h-[100svh] overflow-hidden bg-ink text-bone"
    >
      {/* Fotografia: tela cheia no celular, moldura vertical à direita no desktop. */}
      <div className="absolute inset-x-0 -top-16 bottom-0 -z-10 lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[46%] xl:w-[44%]">
        <m.div className="relative h-full w-full overflow-hidden" style={{ y: imageY }}>
          <div className="hero-settle h-full w-full">
            <Picture
              image={images.honeyBlonde}
              sizes="(min-width: 1024px) 46vw, 100vw"
              priority
              className="h-full w-full object-cover object-[50%_18%]"
            />
          </div>
        </m.div>
        {/* Véus para leitura do texto */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink from-25% via-ink/60 via-55% to-ink/0 lg:hidden" aria-hidden />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink/60 to-transparent lg:hidden" aria-hidden />
        <div className="absolute inset-y-0 left-0 hidden w-40 bg-gradient-to-r from-ink to-transparent lg:block" aria-hidden />
        <p className="eyebrow absolute bottom-8 right-6 hidden origin-bottom-right -rotate-90 translate-x-full text-[0.6rem] text-bone/70 lg:block">
          Honey blonde · @vipbodyhair
        </p>
      </div>

      <m.div
        style={{ y: contentY }}
        className="relative mx-auto flex w-full max-w-[1440px] flex-col justify-end px-5 pb-9 pt-28 md:px-10 md:pb-14 lg:justify-center lg:pb-14 lg:pt-28 short:pt-24 short:pb-10"
      >
        <div className="lg:w-[53%] lg:pr-6 xl:pr-12">
          <img
            src={logo.white.src}
            width={logo.white.width}
            height={logo.white.height}
            alt="VIP body & hair"
            className="hero-rise w-[112px] xs:w-[124px] md:w-[180px] lg:w-[196px] xl:w-[212px] short:w-[150px]"
            style={delay(0.05)}
          />

          <p
            className="hero-rise eyebrow mt-7 flex items-center gap-4 text-[0.625rem] text-bone/75 md:mt-10 short:mt-7"
            style={delay(0.3)}
          >
            <span className="h-px w-8 bg-honey" aria-hidden />
            <span>
              Salão <span className="hidden xs:inline">de beleza </span>premium · Barueri/SP
            </span>
          </p>

          <h1 id="hero-titulo" className="display mt-5 text-[2.6rem] xs:text-[2.9rem] md:text-[4rem] lg:text-[3.9rem] xl:text-[4.6rem] 2xl:text-[5rem] short:text-[3.5rem]">
            <span className="sr-only">VIP body &amp; hair — </span>
            {[
              'A arte de revelar',
              <>
                a sua <em className="text-honey">melhor</em>
              </>,
              <em key="v">versão.</em>,
            ].map((line, i) => (
              <span key={i} className="block overflow-hidden pb-[0.1em] -mb-[0.1em]">
                <span className="hero-line block" style={delay(0.2 + i * 0.12)}>
                  {line}
                </span>
              </span>
            ))}
          </h1>

          <p
            className="hero-rise mt-7 hidden max-w-lg text-pretty leading-relaxed text-bone/75 sm:block md:text-lg short:mt-5 short:text-base"
            style={delay(0.9)}
          >
            Coloração, corte e cuidado com a direção criativa de Ricky Moica, embaixador Wella Professionals. Mais de duas
            décadas de história em Barueri.
          </p>

          <p
            className="hero-rise mt-5 max-w-xs text-sm leading-relaxed text-bone/75 sm:hidden"
            style={delay(0.9)}
          >
            Direção criativa de Ricky Moica, embaixador Wella Professionals.
          </p>

          <div
            className="hero-rise mt-8 flex flex-col gap-2 xs:flex-row xs:items-center xs:gap-6 md:mt-10 short:mt-7"
            style={delay(1.05)}
          >
            <WhatsAppLink source="hero" className="btn btn-light">
              <WhatsApp width={18} height={18} />
              Agendar pelo WhatsApp
            </WhatsAppLink>
            <WhatsAppLink
              source="hero-consultoria"
              href={waLink('Olá, VIP body & hair! Gostaria de agendar uma consultoria gratuita.')}
              className="group inline-flex min-h-11 items-center justify-center gap-3 text-sm text-bone/85 hover:text-bone xs:justify-start"
            >
              <span className="link-line pb-0.5">Consultoria gratuita</span>
              <ArrowRight width={16} height={16} className="transition-transform duration-500 group-hover:translate-x-1" />
            </WhatsAppLink>
          </div>

          <dl
            className="hero-rise mt-12 hidden max-w-lg grid-cols-3 gap-6 border-t border-bone/15 pt-6 lg:grid xl:mt-14 short:hidden"
            style={delay(1.3)}
          >
            <div>
              <dt className="eyebrow text-[0.6rem] text-bone/55">Google</dt>
              <dd className="mt-2 flex items-center gap-2 font-display text-2xl">
                {googleRating.value.toLocaleString('pt-BR')}
                <Star width={14} height={14} className="text-honey" />
              </dd>
            </div>
            <div>
              <dt className="eyebrow text-[0.6rem] text-bone/55">Embaixador</dt>
              <dd className="mt-2 font-display text-2xl">Wella</dd>
            </div>
            <div>
              <dt className="eyebrow text-[0.6rem] text-bone/55">Ter a sáb</dt>
              <dd className="mt-2 font-display text-2xl">10h–20h</dd>
            </div>
          </dl>
          <p className="sr-only">{hours.summary}.</p>
        </div>
      </m.div>

      <a
        href="#sobre"
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-bone/60 transition-colors hover:text-bone md:flex lg:left-[calc(54%-3rem)]"
        aria-label="Rolar para conhecer o salão"
      >
        <span className="eyebrow text-[0.55rem]">Role</span>
        <span className="relative h-10 w-px overflow-hidden bg-bone/20">
          <span className="scroll-cue absolute inset-x-0 top-0 h-1/2 bg-bone" />
        </span>
      </a>
    </section>
  );
}
