'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Product } from '@/types/catalog';
import { retroShowcase } from '@/data/site';
import { cn } from '@/lib/format';
import { sortProducts } from '@/lib/catalog';
import { findByRef, productHref, teamById } from '@/lib/product';
import { LinkButton } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/Feedback';

const PHOTOS = 3;

/** Junta nomes em português: "A", "A e B", "A, B e C". */
const joinNames = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`);

/**
 * Escolhe três retrôs do mesmo ano: primeiro a vitrine de data/site.ts; se
 * alguma saiu do catálogo, completa com outras do ano dela e, por fim, com as
 * retrôs mais procuradas. O ano em destaque é sempre o das camisas mostradas.
 */
function pickRetro(products: Product[]) {
  const retro = sortProducts(
    products.filter((p) => p.category === 'retro' && p.images.length > 0),
    'relevancia',
  );
  const chosen = retroShowcase.map((ref) => findByRef(retro, ref)).filter((p): p is Product => !!p);
  const year = chosen[0]?.season || retro.find((p) => p.season)?.season || '';
  const sameYear = retro.filter((p) => p.season === year && !chosen.includes(p));
  const others = retro.filter((p) => !chosen.includes(p) && !sameYear.includes(p));
  const photos = [...chosen, ...sameYear, ...others].slice(0, PHOTOS);
  const teamsOfYear = [...new Set(photos.filter((p) => p.season === year).map((p) => teamById(p.teamId)?.name).filter(Boolean))] as string[];
  return { photos, year, teamsOfYear };
}

/**
 * Faixa editorial do retrô, de ponta a ponta: um ano verdadeiro do catálogo
 * em estêncil gigante e três camisas daquele ano, lado a lado.
 */
export function RetroBand({ products, className }: { products: Product[]; className?: string }) {
  const { photos, year, teamsOfYear } = useMemo(() => pickRetro(products), [products]);
  if (photos.length === 0) return null;

  return (
    <section className={cn('border-y border-line bg-steel', className)}>
      <div className="container-fz py-16 sm:py-24">
        <SectionHeading title="Clássicos que não saem de campo" description="Camisas retrô de clubes e seleções, com o desenho e os patrocínios da época." />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end lg:gap-14">
          <div className="flex flex-col items-start">
            {year && (
              <p
                aria-hidden
                className={cn(
                  'heading-stencil -ml-[0.04em] whitespace-nowrap leading-[0.78] tabular-nums text-fg',
                  // Um ano (1995) ocupa a coluna; temporadas longas (1992/93) descem de corpo para caber.
                  year.length <= 4 ? 'text-[min(34vw,15rem)] lg:text-[min(17vw,15rem)]' : 'text-[min(17vw,8rem)] lg:text-[min(8.5vw,8rem)]',
                )}
              >
                {year}
              </p>
            )}
            {year && teamsOfYear.length > 0 && (
              <p className="mt-5 max-w-[34ch] text-base leading-relaxed text-fg-2">
                {joinNames(teamsOfYear)} em {year}.
              </p>
            )}
            <LinkButton href="/retro" variant="outline" size="lg" className="mt-8">
              Coleção retrô
            </LinkButton>
          </div>

          <ul className="grid grid-cols-3 gap-2 sm:gap-3">
            {photos.map((p) => (
              <li key={p.id}>
                <Link
                  href={productHref(p)}
                  aria-label={p.name}
                  className="locker group relative block overflow-hidden rounded-[var(--radius-card)] transition-[border-color] duration-200 hover:border-line-strong active:border-fg-2/50"
                >
                  <span aria-hidden className="absolute inset-x-[16%] top-0 z-10 h-[2px] bg-light opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.images[0].src} alt="" width={720} height={960} loading="lazy" decoding="async" className="aspect-[3/4] w-full bg-[#0a0c10] object-cover" />
                  <span className="flex items-center justify-between gap-2 border-t border-line px-2.5 py-2 sm:px-3">
                    <span className="plate truncate text-[0.72rem] text-fg-2 transition-colors duration-200 group-hover:text-fg sm:text-[0.82rem]">{teamById(p.teamId)?.name}</span>
                    <span className="plate hidden shrink-0 text-[0.74rem] tabular-nums text-muted sm:inline">{p.season}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
