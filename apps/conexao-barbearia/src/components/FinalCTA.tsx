import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useRef } from 'react';
import { links, whatsappLink } from '../data/site';
import { track } from '../lib/analytics';
import { WhatsAppIcon } from './ui/Icons';
import { Picture } from './ui/Picture';
import { Reveal } from './ui/Reveal';

const background = {
  name: 'cta-barboterapia-mono',
  widths: [800],
  width: 800,
  height: 800,
  alt: '',
};

export function FinalCTA() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ['0%', '0%'] : ['-10%', '10%']);

  return (
    <section
      ref={ref}
      id="agendar"
      aria-labelledby="cta-title"
      className="relative isolate overflow-hidden bg-ink py-32 md:py-44 lg:py-52"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <m.div style={{ y }} className="grain absolute -inset-y-[12%] inset-x-0">
          <Picture
            image={background}
            avif
            sizes="100vw"
            className="h-full w-full object-cover object-[50%_35%] opacity-60"
          />
        </m.div>
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/70 to-ink" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgb(16_16_16/0.7)_75%)]" />
      </div>

      <div className="container-x flex flex-col items-center text-center">
        <Reveal>
          <p className="eyebrow text-gold">
            <span aria-hidden="true" className="h-px w-10 bg-gold/60" />
            Agende agora
            <span aria-hidden="true" className="h-px w-10 bg-gold/60" />
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2
            id="cta-title"
            className="display text-balance mx-auto mt-8 max-w-5xl text-[2.75rem] xs:text-[3.25rem] sm:text-6xl md:text-7xl lg:text-8xl"
          >
            Seu próximo visual <span className="font-normal italic text-gold">começa aqui.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-8 max-w-md text-pretty text-base leading-relaxed text-bone/75 md:text-lg">
            Escolha seu horário e venha viver a experiência Conexão.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-11 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <a
              href={links.booking}
              target="_blank"
              rel="noopener"
              onClick={() => track('Schedule', { origem: 'cta-final' })}
              className="btn btn-gold min-h-14 px-9"
            >
              Agendar meu horário
              <ArrowUpRight className="btn-arrow size-4" strokeWidth={1.75} aria-hidden="true" />
            </a>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener"
              onClick={() => track('Contact', { origem: 'cta-final' })}
              className="btn btn-ghost min-h-14 px-9"
            >
              <WhatsAppIcon className="size-4" />
              Falar no WhatsApp
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
