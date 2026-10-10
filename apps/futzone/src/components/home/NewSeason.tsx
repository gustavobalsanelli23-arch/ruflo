'use client';

import { useEffect, useRef, useState } from 'react';
import type { Product } from '@/types/catalog';
import { cn } from '@/lib/format';
import { ProductCard } from '@/components/products/ProductCard';
import { Reveal, stagger } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/Feedback';
import { ShelfLink } from './ShelfLink';

/** Avisa uma única vez quando o elemento entra na tela (IntersectionObserver, sem ouvir o scroll). */
function useSeenOnce<T extends Element>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

/**
 * Nova temporada: um armário grande, cuja luz acende quando ele entra na tela,
 * e três armários comuns na mesma prateleira (todos apoiados na base).
 */
export function NewSeason({ season, products, className }: { season: string; products: Product[]; className?: string }) {
  const [leadRef, lit] = useSeenOnce<HTMLLIElement>();
  const [lead, ...rest] = products;
  if (!lead) return null;

  return (
    <section className={cn('container-fz', className)}>
      <SectionHeading
        title={`Temporada ${season}`}
        description="As camisas novas de clubes e seleções, recém-chegadas ao vestiário."
        action={<ShelfLink href="/camisas?ordem=novidades" label="Ver lançamentos" />}
      />
      <ul className="grid grid-cols-2 gap-2 border-b border-line-strong sm:gap-3 md:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))] md:items-end lg:gap-4">
        <li ref={leadRef} className="col-span-2 md:col-span-1">
          <ProductCard product={lead} lit={lit} litDelay={80} omitStatus="novo" />
        </li>
        {rest.slice(0, 3).map((p, i) => (
          // No celular cabem dois ao lado do grande; o terceiro aparece a partir do tablet.
          <Reveal as="li" key={p.id} delay={stagger(i, 60)} className={cn('h-full md:h-auto', i === 2 && 'hidden md:block')}>
            <ProductCard product={p} omitStatus="novo" />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
