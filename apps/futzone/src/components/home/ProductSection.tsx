import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/types/catalog';
import { SectionHeading } from '@/components/ui/Feedback';
import { ProductRail } from '@/components/products/ProductCard';

interface ProductSectionProps {
  eyebrow: string;
  title: string;
  description?: string;
  href: string;
  products: Product[];
}

/** Vitrine de produtos da Home: trilho no celular, grade de 4 no desktop. */
export function ProductSection({ eyebrow, title, description, href, products }: ProductSectionProps) {
  if (products.length === 0) return null;
  return (
    <section className="container-fz pt-20 sm:pt-28">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={
          <Link href={href} className="group hidden items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-fg-2 transition-colors hover:text-fg sm:inline-flex">
            Ver todos <ArrowRight className="size-4 text-brand-400 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        }
      />
      <ProductRail products={products} />
      <Link href={href} className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-fg-2 sm:hidden">
        Ver todos <ArrowRight className="size-4 text-brand-400" />
      </Link>
    </section>
  );
}
