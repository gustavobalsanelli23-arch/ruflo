import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Maximize2 } from 'lucide-react';
import { business } from '../config/site';
import { monthYear, workTitle, works } from '../data/content';
import { parallax, revealFrame, useReveal } from '../hooks/useReveal';
import { COLUMN_OFFSETS, toColumns } from '../lib/gallery';
import { ScrollTrigger, gsap, setupGsap, whenIdle } from '../lib/motion';
import { Lightbox } from './Lightbox';
import { Frame, Picture, ratioOf } from './Picture';
import { SectionLabel } from './ui';

/** Velocidade de parallax de cada coluna: profundidade sem desalinhar as fotos. */
const SPEEDS: Record<number, number[]> = { 2: [0.04, 0.12], 3: [0.03, 0.15, 0.08] };

/** 2 colunas no celular, 3 a partir do tablet. O SSR sempre parte de 2. */
function useColumnCount() {
  const [count, setCount] = useState(2);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setCount(mq.matches ? 3 : 2);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return count;
}

export function Gallery() {
  const root = useRef<HTMLElement>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement | null>());
  const [index, setIndex] = useState<number | null>(null);
  const count = useColumnCount();
  const columns = useMemo(() => toColumns(works, count), [count]);
  const grid = useRef<HTMLDivElement>(null);
  useReveal(root);

  // As fotos e o parallax das colunas são montados a cada troca de colunas
  // (2 no celular, 3 a partir do tablet — inclusive ao girar a tela). A altura
  // da página muda junto: os gatilhos de rolagem são recalculados no fim.
  useLayoutEffect(() => {
    setupGsap();
    const ctx = gsap.context(() => {});
    const cancel = whenIdle(() =>
      ctx.add(() => {
        const mm = gsap.matchMedia();
        mm.add('(prefers-reduced-motion: no-preference)', () => {
          grid.current!.querySelectorAll<HTMLElement>('[data-reveal="tile"]').forEach((el) => revealFrame(el));
          grid.current!.querySelectorAll<HTMLElement>('[data-speed]').forEach((el) => parallax(el));
        });
        ScrollTrigger.refresh();
        return () => mm.revert();
      }),
    );
    return () => {
      cancel();
      ctx.revert();
    };
  }, [count]);

  const close = useCallback(() => {
    setIndex((current) => {
      if (current !== null) triggers.current.get(works[current].photo.id)?.focus({ preventScroll: true });
      return null;
    });
  }, []);

  return (
    <section ref={root} id="galeria" aria-labelledby="galeria-titulo" className="section-y relative">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-x-6">
          <div className="lg:col-span-8">
            <SectionLabel n="04" className="text-fumo">
              Galeria
            </SectionLabel>
            <h2 id="galeria-titulo" className="text-display mt-8 lg:mt-10">
              <span data-reveal="lines" className="block">
                Trabalho
              </span>
              <span data-reveal="lines" data-delay="0.1" className="serif block pl-[0.6em] text-[0.8em] leading-[0.95]">
                assinado
              </span>
            </h2>
          </div>
          <p data-reveal="fade" className="max-w-[26rem] text-fumo lg:col-[9/span_4] lg:justify-self-end">
            Cortes publicados no Instagram da barbearia. Toque em uma foto para ampliar.
          </p>
        </div>

        <div
          ref={grid}
          className="mt-16 grid grid-cols-2 items-start gap-x-3 sm:gap-x-5 md:grid-cols-[5fr_3.2fr_4fr] md:gap-x-8 lg:mt-28 lg:gap-x-14 xl:gap-x-20"
        >
          {columns.map((col, c) => (
            <ul
              key={c}
              data-speed={SPEEDS[count][c]}
              data-speed-own
              className="flex flex-col gap-y-12 md:gap-y-16 lg:gap-y-24"
              style={{ paddingTop: `calc(${COLUMN_OFFSETS[count][c]} * 100%)` }}
            >
              {col.map((work) => {
                const i = works.indexOf(work);
                const n = String(i + 1).padStart(2, '0');
                const title = workTitle(work, i);
                return (
                  <li key={work.photo.id}>
                    <figure className="group">
                      <button
                        ref={(el) => {
                          triggers.current.set(work.photo.id, el);
                        }}
                        type="button"
                        onClick={() => setIndex(i)}
                        className="relative block w-full cursor-zoom-in text-left"
                        aria-label={`Ampliar: ${title}`}
                      >
                        <Frame kind="tile" delay={c * 0.08}>
                          <div className="transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.045]">
                            <Picture
                              slot={work.photo}
                              sizes="(min-width: 1024px) 36vw, (min-width: 768px) 40vw, 46vw"
                              className="block w-full"
                              imgClassName="block h-auto w-full"
                              style={{ aspectRatio: String(ratioOf(work.photo)) }}
                              index={n}
                            />
                          </div>
                        </Frame>
                        <span
                          aria-hidden="true"
                          className="absolute right-3 bottom-3 flex h-11 w-11 items-center justify-center bg-osso text-carvao opacity-0 transition-[opacity,transform] duration-700 ease-[var(--ease-out-expo)] group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 max-lg:hidden lg:translate-y-2 lg:group-hover:translate-y-0"
                        >
                          <Maximize2 size={16} strokeWidth={1.5} />
                        </span>
                      </button>
                      <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span className="flex items-baseline gap-3">
                          <span className="label text-fumo tabular-nums">{n}</span>
                          {work.title && <span className="text-[0.9375rem] font-semibold uppercase font-stretch-[80%]">{work.title}</span>}
                        </span>
                        {work.date && <span className="label min-w-0 text-fumo">{monthYear(work.date)}</span>}
                      </figcaption>
                    </figure>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>

        <div data-reveal="fade" className="mt-20 flex flex-col items-start gap-6 border-t border-[var(--line-dark)] pt-10 sm:flex-row sm:items-center sm:justify-between lg:mt-32">
          <p className="label text-fumo">Mais trabalhos em @{business.instagram.handle}</p>
          <a href={business.instagram.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost max-sm:w-full">
            Ver no Instagram
            <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </div>
      </div>

      <Lightbox items={works} index={index} onChange={setIndex} onClose={close} origins={triggers} />
    </section>
  );
}
