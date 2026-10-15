import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { finalCtaImage, links, whatsapp, whatsappLink } from '../data/site';
import { ArrowIcon, InstagramIcon } from './ui/Icons';
import { Picture } from './ui/Picture';
import { Reveal, RevealLines } from './ui/Reveal';

export function FinalCTA() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const reduced = useReducedMotion();
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-8%', '8%']);

  return (
    <section ref={ref} aria-labelledby="agendar-titulo" className="relative isolate overflow-hidden bg-ink text-ivory">
      <m.div style={{ y }} className="absolute inset-x-0 -top-[10%] -z-10 h-[120%]">
        <Picture image={finalCtaImage} sizes="100vw" className="size-full object-cover object-[50%_40%] opacity-45" />
      </m.div>
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/70 via-espresso/55 to-ink/85"
        aria-hidden="true"
      />

      <div className="container-x flex min-h-[80svh] flex-col items-center justify-center py-28 text-center md:py-40">
        <Reveal>
          <p className="eyebrow text-gold">Agende sua experiência</p>
        </Reveal>
        <RevealLines
          as="h2"
          id="agendar-titulo"
          className="display mt-8 text-[clamp(3.25rem,10vw,9rem)]"
          lines={[
            'Seu cabelo',
            <>
              merece <em className="italic text-gold">brilhar.</em>
            </>,
          ]}
        />
        <Reveal delay={0.15}>
          <p className="mx-auto mt-8 max-w-lg text-[0.9375rem] leading-relaxed text-linen md:text-base">
            Conte como está o seu cabelo e o resultado que você deseja. A gente responde pelo WhatsApp e encontra o
            melhor horário para você.
          </p>
        </Reveal>
        <Reveal delay={0.25} className="mt-11 flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="btn btn-light">
            Agendar pelo WhatsApp
            <ArrowIcon className="btn-arrow h-3 w-7" />
          </a>
          <a
            href={links.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="link-line text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-ivory"
          >
            <InstagramIcon className="size-4" />
            {links.instagramHandle}
          </a>
        </Reveal>
        <Reveal delay={0.35}>
          <a
            href={`tel:+${whatsapp.number}`}
            className="mt-10 inline-block font-display text-2xl italic text-ivory/85 transition-colors hover:text-gold"
          >
            {whatsapp.display}
          </a>
        </Reveal>
      </div>
    </section>
  );
}
