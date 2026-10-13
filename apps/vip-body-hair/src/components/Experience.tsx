import { m, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { differentials, images } from '../data/site';
import { Picture } from './ui/Picture';
import { Reveal, RevealImage } from './ui/Reveal';
import { SectionHeader } from './ui/SectionHeader';

export function Experience() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['20%', '-20%']);

  return (
    <section id="experiencia" aria-labelledby="experiencia-titulo" className="bg-paper py-24 md:py-36">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <SectionHeader
          id="experiencia-titulo"
          index="04"
          eyebrow="Diferenciais"
          title={[
            'Uma experiência',
            <>
              do começo <em>ao brilho.</em>
            </>,
          ]}
        />

        <div ref={ref} className="mt-16 grid gap-16 md:mt-24 lg:grid-cols-12 lg:gap-10">
          <ol className="grid gap-x-10 sm:grid-cols-2 lg:col-span-7">
            {differentials.map((d, i) => (
              <Reveal as="li" key={d.title} delay={(i % 2) * 0.08} className="border-t border-ink/12 py-8">
                <span className="font-display text-sm italic text-honey-deep">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="display mt-3 text-[1.75rem] leading-tight">{d.title}</h3>
                <p className="mt-3 text-pretty text-[0.95rem] text-stone">{d.text}</p>
              </Reveal>
            ))}
          </ol>

          <div className="relative lg:col-span-4 lg:col-start-9">
            <p className="eyebrow mb-5 text-[0.6rem] text-stone">Menu da casa · shakes proteicos, sucos e lanches</p>
            <RevealImage className="relative overflow-hidden">
              <Picture image={images.shakes} sizes="(min-width: 1024px) 30vw, 90vw" className="aspect-[4/5] w-full object-cover" />
            </RevealImage>
            <m.figure
              style={{ y }}
              className="relative -mt-20 ml-auto mr-0 w-[58%] border-[6px] border-paper shadow-[0_30px_60px_-30px_rgba(15,14,12,.45)] lg:-ml-24 lg:mr-auto"
            >
              <Picture image={images.cafe} sizes="(min-width: 1024px) 18vw, 50vw" className="aspect-square w-full object-cover" />
            </m.figure>
          </div>
        </div>
      </div>
    </section>
  );
}
