'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Product, ProductTag } from '@/types/catalog';
import { categories } from '@/data/categories';
import { usePublicProducts } from '@/context/StoreDataContext';
import { sortProducts } from '@/lib/catalog';
import { isOnSale } from '@/lib/product';
import { LinkButton } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/Feedback';
import { JerseyArt } from '@/components/brand/JerseyArt';
import { CategoryCard } from './CategoryCard';
import { ProductGrid } from './ProductCard';

const byTag = (products: Product[], tag: ProductTag) => products.filter((p) => p.tags.includes(tag));

export function HomeSections() {
  const products = usePublicProducts();

  const sections = useMemo(
    () => ({
      bestSellers: sortProducts(byTag(products, 'mais-vendido'), 'relevancia').slice(0, 8),
      launches: sortProducts(byTag(products, 'lancamento'), 'novidades').slice(0, 4),
      sale: sortProducts(products.filter(isOnSale), 'relevancia').slice(0, 4),
      popular: sortProducts(byTag(products, 'popular'), 'relevancia').slice(0, 4),
    }),
    [products],
  );

  const countBy = (id: string) => products.filter((p) => p.category === id).length;

  return (
    <>
      <section className="container-fz pt-20">
        <SectionHeading eyebrow="Explore" title="Categorias" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <CategoryCard key={c.id} id={c.id} title={c.shortName} description={c.description} href={c.href} count={countBy(c.id)} />
          ))}
          <CategoryCard id="promocoes" title="Promoções" description="Camisas com preço especial por tempo limitado." href="/promocoes" count={products.filter(isOnSale).length} />
        </div>
      </section>

      <ProductSection eyebrow="Os favoritos da torcida" title="Mais vendidos" href="/camisas?ordem=relevancia" products={sections.bestSellers} />

      <section className="container-fz pt-20">
        <div className="relative isolate grid overflow-hidden rounded-[2rem] border border-brand-500/30 bg-gradient-to-br from-brand-900 via-surface to-surface md:grid-cols-[1.2fr_1fr]">
          <div className="pitch-lines absolute inset-0 -z-10" />
          <div className="p-8 sm:p-12">
            <p className="eyebrow mb-4">Coleção retrô</p>
            <h2 className="heading-display text-5xl sm:text-6xl">Clássicos que<br />não saem de campo</h2>
            <p className="mt-4 max-w-md text-fg-2">Releituras de camisas que marcaram gerações — para vestir a história do futebol.</p>
            <LinkButton href="/retro" className="mt-8">
              Ver retrô <ArrowRight className="size-4" />
            </LinkButton>
          </div>
          <div className="relative hidden min-h-72 md:block" aria-hidden>
            <div className="absolute inset-10 rounded-full bg-brand-500/20 blur-3xl" />
            <JerseyArt primary="#efe9dc" secondary="var(--color-brand-600)" cut="retro" className="absolute left-1/2 top-1/2 h-[85%] -translate-x-1/2 -translate-y-1/2 -rotate-6" />
          </div>
        </div>
      </section>

      <ProductSection eyebrow="Acabaram de chegar" title="Lançamentos" href="/camisas?ordem=novidades" products={sections.launches} />
      <ProductSection eyebrow="Preço especial" title="Promoções" href="/promocoes" products={sections.sale} />
      <ProductSection eyebrow="Em alta" title="Populares" href="/camisas" products={sections.popular} />
    </>
  );
}

function ProductSection({ eyebrow, title, href, products }: { eyebrow: string; title: string; href: string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="container-fz pt-20">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        action={
          <Link href={href} className="group inline-flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-400 hover:text-brand-300">
            Ver todos <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        }
      />
      <ProductGrid products={products} />
    </section>
  );
}
