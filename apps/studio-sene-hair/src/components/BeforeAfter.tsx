import { AnimatePresence, m } from 'framer-motion';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { beforeAfter } from '../data/site';
import { ArrowUpRightIcon } from './ui/Icons';
import { Picture } from './ui/Picture';
import { ease } from './ui/Reveal';

/**
 * Antes e depois em díptico editorial, com abas por caso. As fotos de cada par
 * vêm da mesma publicação do Instagram, sem montagem nem retoque.
 */
export function BeforeAfter() {
  const [current, setCurrent] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();
  const item = beforeAfter[current];

  // Setas navegam entre as abas (padrão WAI-ARIA), a partir da aba em foco.
  const onKeyDown = (e: KeyboardEvent, from: number) => {
    const delta =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (from + delta + beforeAfter.length) % beforeAfter.length;
    setCurrent(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-4">
        <p className="eyebrow text-gold">Antes &amp; depois</p>
        <h3 className="mt-5 font-display text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.02] text-ivory">
          A transformação, <em className="italic text-gold">lado a lado.</em>
        </h3>
        <p className="mt-5 max-w-sm text-[0.9375rem] leading-relaxed text-linen">
          Escolha um caso. Cada par de fotos é da mesma cliente, publicado no nosso Instagram.
        </p>

        <div
          role="tablist"
          aria-label="Casos de antes e depois"
          className="mt-9 flex flex-wrap gap-2 lg:flex-col lg:gap-0"
        >
          {beforeAfter.map((c, i) => {
            const selected = i === current;
            return (
              <button
                key={c.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                role="tab"
                type="button"
                id={`${uid}-tab-${c.id}`}
                aria-selected={selected}
                aria-controls={`${uid}-painel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setCurrent(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`group flex items-center gap-4 border px-4 py-3 text-left text-[0.6875rem] font-medium uppercase tracking-[0.22em] transition-colors duration-500 lg:border-0 lg:border-b lg:border-ivory/12 lg:px-0 lg:py-5 ${
                  selected ? 'border-gold text-ivory' : 'border-ivory/15 text-ivory/55 hover:text-ivory'
                }`}
              >
                <span
                  className={`hidden h-px bg-gold transition-all duration-500 ease-[var(--ease-editorial)] lg:block ${
                    selected ? 'w-10' : 'w-0 group-hover:w-4'
                  }`}
                  aria-hidden="true"
                />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${uid}-painel`}
        aria-labelledby={`${uid}-tab-${item.id}`}
        className="lg:col-span-7 lg:col-start-6"
      >
        <div className="grid grid-cols-2 gap-2 md:gap-4">
          {(['before', 'after'] as const).map((side, i) => (
            <figure key={side} className="relative">
              <div className="relative aspect-[3/4] overflow-hidden bg-cafe">
                <AnimatePresence mode="wait" initial={false}>
                  <m.div
                    key={`${item.id}-${side}`}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, delay: i * 0.08, ease }}
                  >
                    <Picture
                      image={item[side]}
                      sizes="(min-width: 1024px) 28vw, 50vw"
                      className="size-full object-cover"
                    />
                  </m.div>
                </AnimatePresence>
              </div>
              <figcaption className="mt-4 flex items-center gap-3 text-[0.625rem] font-medium uppercase tracking-[0.32em] text-ivory/70">
                <span className={`h-px w-6 ${side === 'after' ? 'bg-gold' : 'bg-ivory/40'}`} aria-hidden="true" />
                {side === 'before' ? 'Antes' : 'Depois'}
              </figcaption>
            </figure>
          ))}
        </div>
        <a
          href={item.post}
          target="_blank"
          rel="noopener noreferrer"
          className="link-line mt-6 text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-gold"
        >
          Ver publicação original
          <ArrowUpRightIcon className="size-2.5" />
        </a>
      </div>
    </div>
  );
}
