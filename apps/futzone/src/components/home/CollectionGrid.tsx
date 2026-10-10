'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { collections, collectionHref } from '@/data/collections';
import { usePublicProducts } from '@/context/StoreDataContext';
import { cn } from '@/lib/format';
import { findByRef, teamById } from '@/lib/product';
import { Reveal, stagger } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/Feedback';

/** Grade de coleções (Brasileirão, Europeus, Seleções...), com a primeira em destaque. */
export function CollectionGrid() {
  const products = usePublicProducts();

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
    <section className="container-fz pt-20 sm:pt-28">
      <SectionHeading title="Escolha sua coleção" description="Do Brasileirão aos clássicos retrô — encontre a camisa certa em poucos cliques." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((c, i) => {
          const featured = i === 0;
          // As duas últimas ocupam a linha inteira no desktop (grade sem buracos).
          const wide = i >= cards.length - 2;
          return (
            <Reveal key={c.id} delay={stagger(i, 50)} className={cn(featured && 'col-span-2 lg:row-span-2', wide && 'lg:col-span-2')}>
              <Link
                href={collectionHref(c.id)}
                className={cn(
                  'group relative block h-full overflow-hidden rounded-[var(--radius-card)] bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                  featured ? 'aspect-[4/3] lg:aspect-auto' : wide ? 'aspect-[3/4] sm:aspect-[4/5] lg:aspect-[2/1]' : 'aspect-[3/4] sm:aspect-[4/5]',
                )}
              >
                {c.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.cover}
                    alt=""
                    width={720}
                    height={960}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover object-[50%_25%] transition-transform duration-500 ease-[var(--ease-out-fz)] group-hover:scale-[1.05]"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-colors duration-300 group-hover:from-black/90" aria-hidden />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                  <div className="min-w-0">
                    <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/60">{c.count} modelos</p>
                    <h3 className={cn('heading-display mt-1 text-white transition-colors duration-200 group-hover:text-brand-200', featured ? 'text-4xl sm:text-6xl' : 'text-2xl sm:text-3xl')}>
                      {c.name}
                    </h3>
                    <p className={cn('mt-1.5 text-xs text-white/70 sm:text-sm', featured ? 'max-w-sm' : 'hidden sm:line-clamp-2')}>{c.description}</p>
                  </div>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-[background-color,transform] duration-300 group-hover:rotate-45 group-hover:bg-brand-500" aria-hidden>
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
