import { useRef } from 'react';
import { business } from '../config/site';
import { about, monthYear, works } from '../data/content';
import { useReveal } from '../hooks/useReveal';
import { Lotus } from './Lotus';
import { Picture } from './Picture';
import { BookingLink } from './ui';

const photo = works.find((w) => w.image === 'correcao-de-cor')!;

export function About() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  return (
    <section ref={root} id="sobre" aria-labelledby="sobre-titulo" className="section-y relative">
      <div className="container-x grid grid-cols-1 gap-y-12 lg:grid-cols-12 lg:gap-x-6">
        <h2
          id="sobre-titulo"
          data-reveal="lines"
          className="text-display max-w-[13ch] lg:col-[6/span_7] lg:row-start-1 lg:max-w-none lg:pt-4"
        >
          A arte na forma de beleza.
        </h2>

        <figure className="lg:col-[1/span_4] lg:row-[1/span_2]">
          <div data-reveal="image" className="aspect-[640/930] overflow-hidden">
            <div data-speed="0.08" className="h-[112%] -translate-y-[6%]">
              <Picture
                image="correcao-de-cor"
                alt={photo.alt}
                sizes="(min-width: 1024px) 30vw, 100vw"
                className="block h-full w-full"
                imgClassName="h-full w-full object-cover"
              />
            </div>
          </div>
          <figcaption data-reveal="fade" className="caption mt-3">
            {photo.title}, {monthYear(photo.date)}. “{photo.caption}”
          </figcaption>
        </figure>

        <div className="lg:col-[7/span_5] lg:row-start-2 lg:pt-6">
          <div data-reveal="rule" className="hairline mb-10 max-w-[32rem]" />
          {about.paragraphs.map((text, i) => (
            <p
              key={text}
              data-reveal="fade"
              data-delay={i * 0.08}
              className={`max-w-[34rem] text-[var(--ink-soft)] ${i === 0 ? 'text-lead text-floresta' : 'mt-6'}`}
            >
              {text}
            </p>
          ))}

          <div data-reveal="fade" className="mt-12 flex flex-wrap items-end justify-between gap-8">
            <p className="flex items-center gap-4">
              <Lotus size={40} stroke={1.2} className="text-rosa" />
              <span>
                <span className="block font-serif text-[1.875rem] leading-none font-light italic">
                  {business.professional}
                </span>
                <span className="caption mt-1.5 block">Cabeleireira, {business.name}</span>
              </span>
            </p>
            <BookingLink className="link-line font-medium" label="Converse com a Meire" iconSize={18} />
          </div>
        </div>
      </div>
    </section>
  );
}
