import { useCallback, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { business } from '../config/site';
import { works } from '../data/content';
import { useReveal } from '../hooks/useReveal';
import { InstagramIcon } from './icons';
import { Lightbox } from './Lightbox';
import { Picture } from './Picture';
import { instagramLabel } from './ui';

/**
 * Posição de cada foto na grade do desktop (12 colunas, linhas de 1.5rem).
 * As proporções variam de propósito; no celular vira uma grade de 2 colunas
 * com a coluna da direita deslocada.
 */
const LAYOUT = [
  'lg:col-[1/span_5] lg:row-[1/span_28]',
  'lg:col-[7/span_3] lg:row-[5/span_16]',
  'lg:col-[10/span_3] lg:row-[1/span_18]',
  'lg:col-[10/span_3] lg:row-[20/span_16]',
  'lg:col-[6/span_4] lg:row-[23/span_21]',
  'lg:col-[2/span_4] lg:row-[31/span_20]',
  'lg:col-[10/span_3] lg:row-[38/span_15]',
];
const SPEED = ['0', '0.06', '-0.05', '-0.05', '0.08', '0.04', '-0.06'];

export function Gallery() {
  const root = useRef<HTMLElement>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  useReveal(root);

  const close = useCallback(() => {
    setIndex((current) => {
      if (current !== null) triggers.current[current]?.focus({ preventScroll: true });
      return null;
    });
  }, []);

  return (
    <section ref={root} id="trabalhos" aria-labelledby="trabalhos-titulo" className="section-y relative">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <h2 id="trabalhos-titulo" data-reveal="lines" className="text-display">
              Trabalhos
            </h2>
            <p data-reveal="fade" className="mt-6 max-w-md text-bone/75">
              Degradês, desenhos e cortes que saíram da cadeira da Geri. Toque em uma foto para ampliar.
            </p>
          </div>
          <a
            data-reveal="fade"
            href={business.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="link-line text-sm text-parchment hover:text-bone"
          >
            <InstagramIcon size={17} />
            Mais no {instagramLabel}
            <span className="sr-only">(abre o Instagram em nova aba)</span>
          </a>
        </div>

        <ul className="mt-14 grid grid-cols-2 gap-3 max-lg:pb-14 sm:gap-5 lg:mt-20 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-0 lg:[grid-auto-rows:1.5rem]">
          {works.map((work, i) => (
            <li
              key={work.image}
              className={`${LAYOUT[i]} ${i === 0 ? 'max-lg:col-span-2' : 'max-lg:even:translate-y-14'}`}
            >
              <figure data-speed={SPEED[i]} className="group relative h-full">
                <button
                  ref={(el) => {
                    triggers.current[i] = el;
                  }}
                  type="button"
                  onClick={() => setIndex(i)}
                  className="relative block w-full overflow-hidden lg:h-full"
                  aria-label={`Ampliar: ${work.title}`}
                >
                  <div data-reveal="image" className="h-full w-full overflow-hidden">
                    <Picture
                      image={work.image}
                      alt={work.alt}
                      sizes={i === 0 ? '(min-width: 1024px) 40vw, 100vw' : '(min-width: 1024px) 30vw, 50vw'}
                      className="block aspect-[4/5] w-full lg:aspect-auto lg:h-full"
                      imgClassName="h-full w-full object-cover transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
                    />
                  </div>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgb(16_16_15/0.78),rgb(16_16_15/0)_55%)] opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border border-bone/40 text-bone opacity-0 transition-[opacity,transform] duration-700 ease-[var(--ease-out-expo)] group-hover:rotate-90 group-hover:opacity-100 max-lg:hidden"
                  >
                    <Maximize2 size={15} strokeWidth={1.5} />
                  </span>
                </button>
                <figcaption className="pointer-events-none mt-3 text-[0.8rem] text-parchment/85 lg:absolute lg:inset-x-5 lg:bottom-4 lg:mt-0 lg:translate-y-3 lg:text-sm lg:text-bone lg:opacity-0 lg:transition-[opacity,transform] lg:duration-700 lg:ease-[var(--ease-out-expo)] lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-has-[:focus-visible]:translate-y-0 lg:group-has-[:focus-visible]:opacity-100">
                  {work.title}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>

      <Lightbox items={works} index={index} onChange={setIndex} onClose={close} origins={triggers} />
    </section>
  );
}
