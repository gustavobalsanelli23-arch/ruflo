'use client';

import { useMemo } from 'react';
import type { Product } from '@/types/catalog';
import { usePublicProducts } from '@/context/StoreDataContext';
import { sortProducts } from '@/lib/catalog';
import { availableSizes } from '@/lib/product';
import { RecentlyViewed } from '@/components/products/ProductSections';
import { TeamsRail } from './TeamsRail';
import { CollectionGrid } from './CollectionGrid';
import { ProductSection } from './ProductSection';
import { RetroBand } from './RetroBand';
import { NewSeason } from './NewSeason';

const inStock = (p: Product) => availableSizes(p).length > 0;

/** Temporada em destaque na Home e as grafias dela no catálogo do fornecedor. */
const SEASON = '26/27';
const SEASON_ALIASES = new Set([SEASON, '2026/27']);

/**
 * Um único ritmo vertical: cada seção abre com o mesmo respiro. A fileira de
 * times é a exceção, porque continua a parede de armários do hero.
 */
const SECTION = 'pt-24 sm:pt-32';

/**
 * Seções da Home, alternando trechos densos e calmos:
 * times (continua o hero) → coleções → mais vendidas → faixa retrô (calma)
 * → nova temporada → vistos recentemente.
 * Cada camisa aparece uma vez só na página (o hero vem do servidor em `heroIds`).
 */
export function HomeSections({ heroIds }: { heroIds: string[] }) {
  const products = usePublicProducts();

  const s = useMemo(() => {
    const shown = new Set(heroIds);
    const fresh = (list: Product[], n: number) => {
      const out = list.filter((p) => !shown.has(p.id)).slice(0, n);
      out.forEach((p) => shown.add(p.id));
      return out;
    };
    const available = products.filter(inStock);
    const bestSellers = fresh(sortProducts(available.filter((p) => p.tags.includes('mais-vendido')), 'relevancia'), 4);
    // Nova temporada: lançamentos primeiro, depois as mais procuradas da temporada.
    const season = sortProducts(available.filter((p) => SEASON_ALIASES.has(p.season)), 'relevancia').sort(
      (a, b) => Number(b.tags.includes('lancamento')) - Number(a.tags.includes('lancamento')),
    );
    return { bestSellers, season: fresh(season, 4) };
  }, [products, heroIds]);

  return (
    <>
      <TeamsRail products={products} className="pt-14 sm:pt-16" />
      <CollectionGrid products={products} className={SECTION} />
      <ProductSection title="Mais vendidas" href="/camisas?ordem=relevancia" linkContext="as camisas mais vendidas" products={s.bestSellers} omitStatus="mais-vendido" className={SECTION} />
      <RetroBand products={products} className="mt-24 sm:mt-32" />
      <NewSeason season={SEASON} products={s.season} className={SECTION} />
      {/* Some sem histórico; com histórico, segue o mesmo respiro das outras seções */}
      <div className="container-fz [&>section]:mt-24 sm:[&>section]:mt-32">
        <RecentlyViewed />
      </div>
    </>
  );
}
