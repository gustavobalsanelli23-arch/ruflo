import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { business } from '../config/site';
import { type CategoryId, type Work, filterWorks, monthYear, visibleCategories, works } from '../data/content';
import { useReveal } from '../hooks/useReveal';
import { toColumns } from '../lib/gallery';
import { EASE, Flip, ScrollTrigger, gsap, prefersReducedMotion, setupGsap, whenIdle } from '../lib/motion';
import { ArrowUpRightIcon, ExpandIcon } from './icons';
import { Lightbox } from './Lightbox';
import { Picture } from './Picture';

type Filter = CategoryId | 'todos';

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
  const grid = useRef<HTMLDivElement>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement | null>());
  const flipState = useRef<Flip.FlipState | null>(null);
  const busy = useRef(false);
  const queued = useRef<Filter | null>(null);
  const [filter, setFilter] = useState<Filter>('todos');
  const [index, setIndex] = useState<number | null>(null);
  const columnCount = useColumnCount();
  useReveal(root);

  const cats = useMemo(() => visibleCategories(), []);
  const items = useMemo(() => filterWorks(filter), [filter]);
  const columns = useMemo(() => toColumns(items, columnCount), [items, columnCount]);

  const select = (next: Filter) => {
    // Clique durante a animação: vale o último, aplicado assim que ela termina.
    if (busy.current) {
      queued.current = next;
      return;
    }
    if (next === filter) return;
    setupGsap();
    const scope = root.current!;
    const capture = () =>
      Flip.getState(scope.querySelectorAll('[data-flip-id]'), { props: 'opacity' });
    if (prefersReducedMotion()) {
      setFilter(next);
      return;
    }
    // 1) as fotos que saem somem rápido; 2) as que ficam deslizam para o lugar novo.
    const keep = new Set(filterWorks(next).map((w) => w.image));
    const leaving = [...scope.querySelectorAll<HTMLElement>('[data-work]')].filter(
      (el) => !keep.has(el.dataset.work as Work['image']),
    );
    busy.current = true;
    const commit = () => {
      flipState.current = capture();
      setFilter(next);
    };
    if (!leaving.length) commit();
    else gsap.to(leaving, { opacity: 0, scale: 0.96, duration: 0.3, ease: 'power2.in', onComplete: commit });
  };

  const selectRef = useRef(select);
  selectRef.current = select;

  useLayoutEffect(() => {
    const state = flipState.current;
    if (!state) return;
    flipState.current = null;
    const scope = root.current!;
    gsap.set(scope.querySelectorAll('[data-work]'), { clearProps: 'opacity,visibility,transform' });
    Flip.from(state, {
      targets: scope.querySelectorAll('[data-flip-id]'),
      duration: 0.95,
      ease: EASE.inOut,
      nested: true,
      prune: true,
      onEnter: (els) =>
        gsap.fromTo(els, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, stagger: 0.06, ease: EASE.out }),
      onComplete: () => {
        busy.current = false;
        ScrollTrigger.refresh();
        const next = queued.current;
        queued.current = null;
        if (next) selectRef.current(next);
      },
    });
  }, [filter]);

  // Entrada das fotos ao rolar (uma vez), em leve cascata. Montada com a thread ociosa.
  useLayoutEffect(() => {
    setupGsap();
    const ctx = gsap.context(() => {});
    const cancel = whenIdle(() =>
      ctx.add(() => {
        const mm = gsap.matchMedia();
        mm.add('(prefers-reduced-motion: no-preference)', () => {
          const tiles = grid.current!.querySelectorAll('[data-work-in]');
          gsap.set(tiles, { opacity: 0 });
          ScrollTrigger.batch(tiles, {
            start: 'top 92%',
            once: true,
            onEnter: (batch) =>
              gsap.fromTo(
                batch,
                { clipPath: 'inset(18% 0% 0% 0%)', y: 60, opacity: 0 },
                { clipPath: 'inset(0% 0% 0% 0%)', y: 0, opacity: 1, duration: 1.3, stagger: 0.12, ease: EASE.out },
              ),
          });
        });
        // As colunas mudam de 2 para 3 depois da hidratação e a altura da página muda:
        // todos os gatilhos de rolagem abaixo daqui precisam ser recalculados.
        ScrollTrigger.refresh();
        return () => mm.revert();
      }),
    );
    return () => {
      cancel();
      ctx.revert();
    };
  }, [columnCount]);

  const close = useCallback(() => {
    setIndex((current) => {
      if (current !== null) triggers.current.get(items[current].image)?.focus({ preventScroll: true });
      return null;
    });
  }, [items]);

  return (
    <section ref={root} id="trabalhos" aria-labelledby="trabalhos-titulo" className="section-y relative">
      <div className="container-x">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end lg:gap-x-6">
          <div className="lg:col-span-6">
            <h2 id="trabalhos-titulo" data-reveal="lines" className="text-display">
              Trabalhos
            </h2>
            <p data-reveal="fade" className="mt-6 max-w-[32rem] text-[var(--ink-soft)]">
              Resultados reais, publicados pela Meire no Instagram do salão. Toque em uma foto para ampliar.
            </p>
          </div>

          <div data-reveal="fade" className="lg:col-[7/span_6] lg:justify-self-end">
            <div
              role="group"
              aria-label="Filtrar trabalhos"
              className="-mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] pb-2 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:justify-end lg:overflow-visible lg:px-0"
            >
              {[{ id: 'todos' as const, label: 'Todos', count: works.length }, ...cats].map((c) => {
                const active = filter === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => select(c.id)}
                    className="relative isolate flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-[0.9375rem] shadow-[inset_0_0_0_1px_var(--line)] transition-colors duration-500 hover:shadow-[inset_0_0_0_1px_var(--color-floresta)] aria-pressed:text-papel"
                  >
                    {active && (
                      <span
                        data-flip-id="filtro-ativo"
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 rounded-full bg-floresta"
                      />
                    )}
                    {c.label}
                    <span className="text-[0.75rem] tabular-nums opacity-60">{c.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {items.length === 1 ? '1 foto' : `${items.length} fotos`}
        </p>

        <div ref={grid} className="mt-14 grid grid-cols-2 gap-x-4 sm:gap-x-6 md:grid-cols-[5fr_3.4fr_4fr] md:gap-x-10 lg:mt-20 lg:gap-x-16">
          {columns.map((col, c) => (
            <ul
              key={c}
              className={`flex flex-col gap-y-10 lg:gap-y-20 ${c === 1 ? 'pt-16 lg:pt-44' : ''} ${c === 2 ? 'md:pt-8 lg:pt-16' : ''}`}
            >
              {col.map((work, row) => {
                const i = items.indexOf(work);
                // Fotos menores alternam o alinhamento dentro da coluna.
                const small = work.small ? `w-[68%] ${(c + row) % 2 ? 'ml-auto' : ''}` : '';
                return (
                  <li key={work.image} data-work={work.image} data-flip-id={work.image} className={small}>
                    <figure data-work-in className="group">
                      <button
                        ref={(el) => {
                          triggers.current.set(work.image, el);
                        }}
                        type="button"
                        onClick={() => setIndex(i)}
                        className="relative block w-full overflow-hidden"
                        aria-label={`Ampliar: ${work.title}`}
                      >
                        <Picture
                          image={work.image}
                          alt={work.alt}
                          sizes="(min-width: 768px) 34vw, 46vw"
                          className="block w-full"
                          imgClassName="block h-auto w-full transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                        />
                        <span
                          aria-hidden="true"
                          className="absolute right-3 bottom-3 flex h-11 w-11 items-center justify-center rounded-full bg-papel/90 text-floresta opacity-0 transition-[opacity,transform] duration-700 ease-[var(--ease-out-expo)] group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 max-lg:hidden lg:translate-y-2 lg:group-hover:translate-y-0"
                        >
                          <ExpandIcon size={16} />
                        </span>
                      </button>
                      <figcaption className="mt-3 flex flex-col gap-0.5 xl:flex-row xl:items-baseline xl:justify-between xl:gap-4">
                        <span className="font-serif text-[1.0625rem] leading-snug sm:text-[1.1875rem]">{work.title}</span>
                        <span className="caption shrink-0">{monthYear(work.date)}</span>
                      </figcaption>
                    </figure>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>

        <div data-reveal="fade" className="mt-16 flex justify-center lg:mt-24">
          <a
            href={business.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            Ver todos os trabalhos no Instagram
            <ArrowUpRightIcon size={17} />
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </div>
      </div>

      <Lightbox items={items} index={index} onChange={setIndex} onClose={close} origins={triggers} />
    </section>
  );
}
