import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { useRef } from 'react';
import { business, formatPrice, links, services, units } from '../data/site';
import { track } from '../lib/analytics';
import { Picture } from './ui/Picture';

const heroImage = {
  name: 'hero-monocromatico',
  widths: [480, 800],
  width: 800,
  height: 800,
  alt: 'Cliente da Conexão Barbearia com corte degradê, risco lateral e barba alinhada, em preto e branco',
};

const lines: { text: string; accent?: boolean }[] = [
  { text: 'Seu estilo.' },
  { text: 'Sua identidade.' },
  { text: 'Nossa conexão.', accent: true },
];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const photoY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '16%']);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', reduce ? '0%' : '-10%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, reduce ? 1 : 0.15]);

  return (
    <section
      ref={ref}
      id="inicio"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink"
    >
      {/* Fotografia */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[68svh] lg:inset-y-0 lg:left-auto lg:h-full lg:w-[60%]">
        <m.div style={{ y: photoY }} className="absolute inset-0 will-change-transform">
          <div className="hero-zoom grain relative h-full w-full">
            <Picture
              image={heroImage}
              avif
              priority
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="h-full w-full object-cover object-[58%_35%] lg:object-[55%_30%]"
            />
          </div>
        </m.div>
        {/* Overlays de leitura */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10 lg:via-ink/10 lg:to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 hidden w-2/3 bg-gradient-to-r from-ink via-ink/70 to-transparent lg:block"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-ink/25" />
      </div>

      {/* Conteúdo */}
      <m.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="container-x relative flex flex-1 flex-col justify-end pb-12 pt-32 sm:pb-16 lg:justify-center lg:pb-32 lg:pt-36"
      >
        <p className="hero-fade eyebrow text-bone/80" style={{ animationDelay: '0.15s' }}>
          <span aria-hidden="true" className="h-px w-10 bg-gold" />
          Desde {business.foundedYear} <span className="text-gold">•</span> {business.city}, {business.state}
        </p>

        <h1
          id="hero-title"
          className="display mt-7 text-[2.55rem] xs:text-[3.1rem] sm:text-[4.25rem] md:text-[5rem] lg:text-[5.4rem] xl:text-[6.25rem] 2xl:text-[7rem]"
        >
          {lines.map((line, i) => (
            <span key={line.text} className="block overflow-hidden pb-[0.08em]">
              <span
                className={`hero-line block ${line.accent ? 'font-normal italic text-gold' : ''}`}
                style={{ animationDelay: `${0.25 + i * 0.12}s` }}
              >
                {line.text}
              </span>
            </span>
          ))}
        </h1>

        <p
          style={{ animationDelay: '0.7s' }}
          className="hero-fade mt-7 max-w-[26rem] text-pretty text-base leading-relaxed text-bone/75 sm:text-[1.0625rem]"
        >
          Mais que uma barbearia, uma experiência de cuidado, precisão e personalidade.
        </p>

        <div style={{ animationDelay: '0.85s' }} className="hero-fade mt-9 flex flex-col gap-3 sm:flex-row">
          <a
            href={links.booking}
            target="_blank"
            rel="noopener"
            onClick={() => track('Schedule', { origem: 'hero' })}
            className="btn btn-gold"
          >
            Agendar horário
            <ArrowUpRight className="btn-arrow size-4" strokeWidth={1.75} aria-hidden="true" />
          </a>
          <a href="#sobre" className="btn btn-ghost">
            Conhecer a barbearia
          </a>
        </div>
      </m.div>

      {/* Faixa de informações rápidas */}
      <div style={{ animationDelay: '1.1s' }} className="hero-fade relative hidden border-t border-bone/10 lg:block">
        <div className="container-x">
          <dl className="grid grid-cols-4 divide-x divide-bone/10">
            {services.map((s) => (
              <div
                key={s.id}
                className="flex items-baseline justify-between gap-4 py-6 pr-8 [&:not(:first-child)]:pl-8"
              >
                <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-bone/60">{s.name}</dt>
                <dd className="font-display text-2xl text-bone">{formatPrice(s.price)}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 py-6 pl-8">
              <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-bone/60">Unidades</dt>
              <dd>
                <a href="#unidades" className="link-line text-sm text-bone">
                  {units.length} em Barueri
                  <ArrowDown className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
