'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Product } from '@/types/catalog';
import { collections, collectionHref } from '@/data/collections';
import { cn } from '@/lib/format';
import { findByRef, teamById } from '@/lib/product';
import { Reveal, stagger } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/Feedback';

/**
 * Desenho assimétrico das 7 coleções (desktop, 12 colunas):
 *   linha 1-2: [Brasileirão 5 col, 2 linhas] [Europeus 4] [Seleções 3]
 *                                            [Retrô 3]    [Kits 4]
 *   linha 3:   [Femininas 7]                  [Infantis 5]
 * No celular: a primeira ocupa a largura toda e as outras seis formam pares.
 * Se o número de coleções mudar, revise este desenho (sobram buracos).
 */
const HALF = 'h-[17rem] sm:h-[22rem] lg:h-auto';
/** `pos`: enquadramento da foto 3:4 na célula (portas largas descem até o escudo, não ao rosto). */
const CELL = [
  { span: 'col-span-2 h-[23rem] sm:h-[28rem] lg:col-span-5 lg:row-span-2 lg:h-auto', title: 'text-[2.75rem] sm:text-6xl', pos: 'object-[50%_24%]' },
  { span: `${HALF} lg:col-span-4`, title: 'text-[1.7rem] sm:text-4xl', pos: 'object-[50%_30%] lg:object-[50%_36%]' },
  { span: `${HALF} lg:col-span-3`, title: 'text-[1.7rem] sm:text-4xl', pos: 'object-[50%_30%]' },
  { span: `${HALF} lg:col-span-3`, title: 'text-[1.7rem] sm:text-4xl', pos: 'object-[50%_30%]' },
  { span: `${HALF} lg:col-span-4`, title: 'text-[1.7rem] sm:text-4xl', pos: 'object-[50%_30%] lg:object-[50%_36%]' },
  { span: `${HALF} lg:col-span-7`, title: 'text-[1.7rem] sm:text-4xl', pos: 'object-[50%_30%] lg:object-[50%_44%]' },
  { span: `${HALF} lg:col-span-5`, title: 'text-[1.7rem] sm:text-4xl', pos: 'object-[50%_30%] lg:object-[50%_42%]' },
];

const plural = (n: number) => `${n} ${n === 1 ? 'modelo' : 'modelos'}`;

/** Coleções (Brasileirão, Europeus, Seleções...) como portas do vestiário, com foto real e contagem do catálogo. */
export function CollectionGrid({ products, className }: { products: Product[]; className?: string }) {
  const cards = useMemo(
    () =>
      collections.map((c) => ({
        ...c,
        cover: findByRef(products, c.cover)?.images[0]?.src,
        count: products.filter((p) => c.matches(p, teamById(p.teamId))).length,
      })),
    [products],
  );

  return (
    <section className={cn('container-fz', className)}>
      <SectionHeading title="Escolha sua coleção" description="Clubes do Brasil e da Europa, seleções, retrô, kits, femininas e infantis." />
      <ul className="grid grid-cols-2 gap-2 sm:gap-3 lg:auto-rows-[16rem] lg:grid-cols-12">
        {cards.map((c, i) => {
          const cell = CELL[i] ?? CELL[CELL.length - 1];
          return (
            <Reveal as="li" key={c.id} delay={stagger(i, 50)} className={cell.span}>
              <Link
                href={collectionHref(c.id)}
                className="locker group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] transition-[border-color] duration-200 hover:border-line-strong active:border-fg-2/50"
              >
                {/* Luz da porta: acende ao apontar, como a dos armários */}
                <span aria-hidden className="absolute inset-x-[16%] top-0 z-10 h-[2px] bg-light opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" />
                <div className="relative min-h-0 flex-1 overflow-hidden bg-[#0a0c10]">
                  {c.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.cover}
                      alt=""
                      width={720}
                      height={960}
                      loading="lazy"
                      decoding="async"
                      className={cn(
                        'motion-lift absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[var(--ease-out-fz)] [@media(hover:hover)]:group-hover:scale-[1.03]',
                        cell.pos,
                      )}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1 border-t border-line px-3 pb-3 pt-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3 sm:px-4 sm:pb-3.5">
                  <h3 className={cn('heading-display min-w-0 text-fg', cell.title)}>{c.name}</h3>
                  <span className="shrink-0 pb-0.5 text-xs font-semibold tabular-nums text-muted transition-colors duration-200 group-hover:text-fg-2">{plural(c.count)}</span>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}
