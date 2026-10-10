import type { Product } from '@/types/catalog';
import type { BadgeKind } from '@/lib/product';
import { cn } from '@/lib/format';
import { SectionHeading } from '@/components/ui/Feedback';
import { ProductRail } from '@/components/products/ProductCard';
import { ShelfLink } from './ShelfLink';

interface ProductSectionProps {
  title: string;
  description?: string;
  href: string;
  /** Completa o nome acessível de "Ver todos" (ex.: "as mais vendidas"). */
  linkContext: string;
  products: Product[];
  className?: string;
  /** Situação que o título já anuncia: os armários não a repetem. */
  omitStatus?: BadgeKind;
}

/** Prateleira de armários da Home: trilho no celular, quatro lado a lado no desktop. */
export function ProductSection({ title, description, href, linkContext, products, className, omitStatus }: ProductSectionProps) {
  if (products.length === 0) return null;
  return (
    <section className={cn('container-fz', className)}>
      <SectionHeading title={title} description={description} action={<ShelfLink href={href} context={linkContext} />} />
      <ProductRail products={products} omitStatus={omitStatus} />
    </section>
  );
}
