import type { Metadata } from 'next';
import { seedProducts } from '@/data/products';
import { productHref } from '@/lib/product';
import { ProductDetail } from '@/components/store/ProductDetail';

/** Pré-gera as URLs do catálogo inicial; produtos criados no painel renderizam sob demanda. */
export const generateStaticParams = () =>
  seedProducts.map((p) => {
    const [, , time, slug] = productHref(p).split('/');
    return { time, slug };
  });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = seedProducts.find((p) => p.slug === slug);
  return { title: product?.name ?? 'Produto', description: product?.description };
}

export default async function ProductPage({ params }: { params: Promise<{ time: string; slug: string }> }) {
  const { time, slug } = await params;
  return (
    <div className="container-fz py-6 sm:py-10">
      <ProductDetail teamSlug={time} slug={slug} />
    </div>
  );
}
