import type { Metadata } from 'next';
import { seedProducts } from '@/data/products';
import { productHref, teamBySlug } from '@/lib/product';
import { ProductDetail } from '@/components/products/ProductDetail';

type Params = Promise<{ time: string; slug: string }>;

/** Pré-gera as URLs do catálogo inicial; produtos criados no painel renderizam sob demanda. */
export const generateStaticParams = () =>
  seedProducts.map((p) => {
    const [, , time, slug] = productHref(p).split('/');
    return { time, slug };
  });

/** Título e descrição pelo par time + produto (o mesmo que a página usa para achar a camisa). */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { time, slug } = await params;
  const team = teamBySlug(time);
  const product = team ? seedProducts.find((p) => p.slug === slug && p.teamId === team.id) : undefined;
  return { title: product?.name ?? 'Produto', description: product?.description };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { time, slug } = await params;
  return (
    <div className="container-fz py-6 sm:py-10">
      {/* A chave recomeça tamanho, quantidade e galeria ao ir de uma camisa para outra */}
      <ProductDetail key={`${time}/${slug}`} teamSlug={time} slug={slug} />
    </div>
  );
}
