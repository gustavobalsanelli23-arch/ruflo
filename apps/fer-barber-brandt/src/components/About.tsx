import { useRef } from 'react';
import { copy, photos } from '../data/content';
import { useReveal } from '../hooks/useReveal';
import { Frame, Picture } from './Picture';
import { BookingLink, SectionLabel } from './ui';

/**
 * Sobre: composição editorial em duas fotos (o ambiente e um detalhe do
 * trabalho, sobrepostos e em velocidades diferentes) e o texto da casa.
 */
export function About() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);
  const [first, second] = copy.about.title;

  return (
    <section ref={root} id="sobre" aria-labelledby="sobre-titulo" className="section-y relative">
      <div className="container-x grid grid-cols-1 gap-y-16 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-12">
          <SectionLabel n="02" className="text-tabaco">
            Sobre
          </SectionLabel>
          <h2 id="sobre-titulo" className="text-display mt-8 lg:mt-10">
            <span data-reveal="lines" className="block">
              {first}
            </span>
            <span data-reveal="lines" data-delay="0.12" className="serif block text-[0.74em] leading-[1] lg:pl-[16.666%]">
              {second}
            </span>
          </h2>
        </div>

        {/* Fotos */}
        <div className="relative lg:col-span-7 lg:row-start-2">
          <div className="relative w-[82%] md:w-[68%] lg:w-[78%]">
            <Frame>
              <Picture
                slot={photos.ambiente}
                sizes="(min-width: 1024px) 44vw, 82vw"
                className="block aspect-[4/5] w-full"
                imgClassName="h-full w-full object-cover"
                index="02"
              />
            </Frame>
          </div>
          <div data-speed="0.18" className="absolute right-0 bottom-[-12%] w-[44%] md:w-[38%] lg:right-[2%] lg:bottom-[-18%] lg:w-[40%]">
            <Frame delay={0.2} className="shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)]">
              <Picture
                slot={photos.detalhe}
                sizes="(min-width: 1024px) 22vw, 44vw"
                className="block aspect-[3/4] w-full"
                imgClassName="h-full w-full object-cover"
                index="03"
              />
            </Frame>
          </div>
        </div>

        {/* Texto */}
        <div className="pt-16 lg:col-[9/span_4] lg:row-start-2 lg:self-end lg:pt-0 lg:pb-[6%]">
          <div data-reveal="rule" className="hairline" />
          <div className="mt-8 space-y-5 text-creme/78">
            {copy.about.paragraphs.map((p, i) => (
              <p key={i} data-reveal="fade" data-delay={i * 0.1} className={i === 0 ? 'text-lead text-creme' : ''}>
                {p}
              </p>
            ))}
          </div>
          <div data-reveal="fade" data-delay="0.2" className="mt-10">
            <BookingLink className="btn btn-ghost" />
          </div>
        </div>
      </div>
    </section>
  );
}
