'use client';

import { useMemo } from 'react';
import type { Product, ProductTag } from '@/types/catalog';
import { usePublicProducts } from '@/context/StoreDataContext';
import { sortProducts } from '@/lib/catalog';
import { availableSizes } from '@/lib/product';
import { teams } from '@/data/teams';
import { CollectionGrid } from './CollectionGrid';
import { ProductSection } from './ProductSection';
import { CampaignBanner } from './CampaignBanner';
import { WhyFutzone } from './WhyFutzone';
import { FinalCta } from './FinalCta';
import { RecentlyViewed } from '@/components/products/ProductSections';

const inStock = (p: Product) => availableSizes(p).length > 0;
const byTag = (products: Product[], tag: ProductTag) => products.filter((p) => p.tags.includes(tag));

/** Seções da Home, na ordem: coleções → vitrines → campanha → diferenciais → CTA final. */
export function HomeSections() {
  const products = usePublicProducts();

  const s = useMemo(() => {
    const available = products.filter(inStock);
    const take = (list: Product[], n = 4) => list.slice(0, n);
    return {
      featured: take(sortProducts(byTag(available, 'popular'), 'relevancia')),
      bestSellers: take(sortProducts(byTag(available, 'mais-vendido'), 'relevancia')),
      retro: take(sortProducts(available.filter((p) => p.category === 'retro'), 'relevancia')),
      national: take(sortProducts(available.filter((p) => p.category === 'selecoes'), 'relevancia')),
      kits: take(sortProducts(available.filter((p) => p.category === 'kits'), 'relevancia')),
      launches: sortProducts(byTag(available, 'lancamento'), 'novidades'),
    };
  }, [products]);

  return (
    <>
      <CollectionGrid />
      <ProductSection eyebrow="Seleção FutZone" title="Camisas em destaque" description="Os modelos que mais chamam atenção nesta temporada." href="/camisas" products={s.featured} />
      <ProductSection eyebrow="Os favoritos da torcida" title="Mais vendidas" href="/camisas?ordem=relevancia" products={s.bestSellers} />
      <ProductSection eyebrow="Coleção retrô" title="Clássicos que não saem de campo" href="/retro" products={s.retro} />
      <ProductSection eyebrow="Seleções" title="Vista as cores do seu país" href="/selecoes" products={s.national} />
      <ProductSection eyebrow="Kits" title="Kits completos" description="Camisa e calção para jogar com o manto." href="/kits" products={s.kits} />
      <div className="container-fz">
        <RecentlyViewed className="mt-20 sm:mt-28" />
      </div>
      <CampaignBanner
        eyebrow="Nova temporada 26/27"
        title={
          <>
            Os novos mantos <span className="text-brand-500">já chegaram.</span>
          </>
        }
        text="Lançamentos dos principais clubes e seleções, com fotos reais e grade completa de tamanhos."
        cta={{ label: 'Ver lançamentos', href: '/camisas?ordem=novidades' }}
        products={s.launches.length >= 3 ? s.launches : s.featured}
      />
      <WhyFutzone productCount={products.length} teamCount={teams.length} />
      <FinalCta />
    </>
  );
}
