import { m, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { googleRating, images } from '../data/site';
import { Picture } from './ui/Picture';
import { Reveal, RevealImage } from './ui/Reveal';
import { SectionHeader } from './ui/SectionHeader';

const facts = [
  { value: '+20', label: 'anos de história' },
  { value: googleRating.value.toLocaleString('pt-BR'), label: `no Google · ${googleRating.count} avaliações` },
  { value: '1 de 8', label: 'embaixadores Wella Professionals no Brasil' },
];

export function About() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const floatY = useTransform(scrollYProgress, [0, 1], ['18%', '-18%']);

  return (
    <section id="sobre" aria-labelledby="sobre-titulo" className="bg-paper py-24 md:py-36">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <SectionHeader
          id="sobre-titulo"
          index="01"
          eyebrow="O salão"
          title={[
            'Beleza com técnica,',
            <>
              tempo e <em>intenção.</em>
            </>,
          ]}
        />

        <div ref={ref} className="mt-16 grid gap-14 md:mt-24 lg:grid-cols-12 lg:gap-10">
          <div className="relative lg:col-span-6 lg:col-start-1">
            <RevealImage className="zoom-img relative overflow-hidden">
              <Picture
                image={images.salaoInterior}
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="aspect-[4/5] w-full object-cover"
              />
            </RevealImage>
            <m.figure
              style={{ y: floatY }}
              className="absolute -bottom-10 right-4 hidden w-[38%] border-[6px] border-paper shadow-[0_30px_60px_-30px_rgba(15,14,12,.45)] md:block lg:-right-16"
            >
              <Picture image={images.ferramentas} sizes="20vw" className="aspect-[4/5] w-full object-cover" />
            </m.figure>
            <p className="eyebrow mt-4 text-[0.6rem] text-stone">Espelhos em arco · Bethaville, Barueri</p>
          </div>

          <div className="flex flex-col justify-center lg:col-span-5 lg:col-start-8">
            <Reveal>
              <p className="display text-pretty text-[1.65rem] leading-[1.25] md:text-[2.1rem]">
                Há mais de vinte anos, o VIP body &amp; hair transforma técnica em <em>autoestima</em> — revelando a melhor
                versão de cada cliente.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="mt-8 space-y-5 text-pretty text-stone md:text-[1.0625rem]">
                <p>
                  A casa é especialista em coloração, luzes e tratamentos capilares, com atenção especial aos loiros. Ao
                  redor da cor, um time completo cuida de corte com visagismo, make, penteado, mãos, olhar e pele.
                </p>
                <p>
                  Tudo começa com uma consultoria gratuita: entender a sua referência e o histórico dos seus fios para
                  traduzir o desejo em um resultado possível, personalizado e fiel a você.
                </p>
              </div>
            </Reveal>

            <dl className="mt-12 grid grid-cols-1 border-t border-ink/12 xs:grid-cols-3">
              {facts.map((f, i) => (
                <Reveal
                  key={f.label}
                  delay={0.1 + i * 0.08}
                  className="border-b border-ink/12 py-5 xs:border-b-0 xs:border-l xs:pl-4 xs:pr-3 xs:pt-6 xs:first:border-l-0 xs:first:pl-0"
                >
                  <dt className="sr-only">{f.label}</dt>
                  <dd>
                    <span className="display block text-4xl">{f.value}</span>
                    <span className="mt-2 block text-xs leading-snug text-stone">{f.label}</span>
                  </dd>
                </Reveal>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
