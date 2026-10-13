import { m, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { business, images } from '../data/site';
import { track } from '../lib/analytics';
import { ArrowRight, Phone, WhatsApp } from './ui/Icons';
import { Picture } from './ui/Picture';
import { MaskedLines, Reveal } from './ui/Reveal';
import { WhatsAppLink } from './ui/WhatsAppLink';

export function FinalCTA() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  return (
    <section ref={ref} aria-labelledby="cta-titulo" className="grain relative isolate overflow-hidden bg-ink text-bone">
      {/* Foto: faixa no topo no celular; fundo em tela cheia a partir do desktop. */}
      <div className="relative aspect-[4/3] overflow-hidden sm:aspect-[16/9] lg:absolute lg:inset-0 lg:-z-10 lg:aspect-auto">
        <m.div style={{ y }} className="absolute inset-[-8%_0]">
          <Picture
            image={images.corteCamadas}
            sizes="100vw"
            className="h-full w-full object-cover object-[32%_30%]"
          />
        </m.div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent lg:hidden" aria-hidden />
        <div className="absolute inset-0 hidden bg-gradient-to-l from-ink from-35% via-ink/75 via-55% to-ink/10 lg:block" aria-hidden />
      </div>

      <div className="mx-auto grid max-w-[1440px] px-5 pb-24 pt-4 md:px-10 lg:grid-cols-12 lg:py-40">
        <div className="lg:col-span-6 lg:col-start-7 xl:col-span-5 xl:col-start-8">
          <Reveal>
            <p className="eyebrow flex items-center gap-4 text-[0.625rem] text-bone/70">
              <span className="h-px w-8 bg-honey" aria-hidden />
              Consultoria gratuita
            </p>
          </Reveal>
          <h2 id="cta-titulo" className="display mt-8 text-[2.9rem] xs:text-6xl md:text-7xl xl:text-[5.25rem]">
            <MaskedLines
              lines={[
                'Seu próximo',
                'capítulo',
                <>
                  começa <em className="text-honey">aqui.</em>
                </>,
              ]}
            />
          </h2>
          <Reveal delay={0.15}>
            <p className="mt-8 max-w-md text-pretty text-bone/75 md:text-lg">
              Conte o que você imagina. A equipe do VIP body &amp; hair cuida do caminho até o resultado — com técnica,
              tempo e atenção a cada detalhe.
            </p>
          </Reveal>
          <Reveal delay={0.25} className="mt-10 flex flex-col gap-3 xs:flex-row xs:flex-wrap xs:items-center xs:gap-4">
            <WhatsAppLink source="cta-final" className="btn btn-light">
              <WhatsApp width={18} height={18} />
              Agendar pelo WhatsApp
              <ArrowRight width={16} height={16} className="btn-arrow" />
            </WhatsAppLink>
            <a
              href={business.phone.href}
              className="btn btn-outline-light"
              onClick={() => track('Contact', { channel: 'telefone', source: 'cta-final' })}
            >
              <Phone width={16} height={16} />
              {business.phone.display}
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
