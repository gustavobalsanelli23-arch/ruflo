import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/types/catalog';
import { cn } from '@/lib/format';
import { productHref } from '@/lib/product';
import { LinkButton } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';

interface CampaignBannerProps {
  eyebrow: string;
  title: React.ReactNode;
  text: string;
  cta: { label: string; href: string };
  products: Product[];
  /** Lado das fotos no desktop. */
  align?: 'left' | 'right';
}

/** Banner de campanha com fotos reais em leque. */
export function CampaignBanner({ eyebrow, title, text, cta, products, align = 'right' }: CampaignBannerProps) {
  const photos = products.filter((p) => p.images[0]).slice(0, 3);
  return (
    <section className="container-fz pt-20 sm:pt-28">
      <Reveal variant="scale" className="relative isolate overflow-hidden rounded-[2rem] bg-surface">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(70%_90%_at_85%_50%,color-mix(in_oklab,var(--color-brand-600)_30%,transparent),transparent_70%)]" aria-hidden />
        <div className={cn('grid items-center gap-8 p-7 sm:p-12 lg:grid-cols-2 lg:gap-12 lg:p-16', align === 'left' && 'lg:[&>*:first-child]:order-2')}>
          <div>
            <p className="eyebrow mb-4">{eyebrow}</p>
            <h2 className="heading-display text-5xl text-fg sm:text-6xl lg:text-7xl">{title}</h2>
            <p className="mt-5 max-w-md text-fg-2">{text}</p>
            <LinkButton href={cta.href} size="lg" className="mt-8">
              {cta.label} <ArrowRight className="size-4" />
            </LinkButton>
          </div>
          <div className="relative mx-auto aspect-[5/4] w-full max-w-lg">
            {photos.map((p, i) => (
              <Link
                key={p.id}
                href={productHref(p)}
                aria-label={p.name}
                className={cn(
                  'absolute top-1/2 aspect-[3/4] w-[38%] -translate-y-1/2 overflow-hidden rounded-2xl bg-surface-2 shadow-[0_30px_50px_-25px_rgba(0,0,0,0.9)] transition-transform duration-300 ease-[var(--ease-out-fz)] hover:z-20 hover:-translate-y-[54%]',
                  i === 0 && 'left-0 -rotate-6',
                  i === 1 && 'left-1/2 z-10 w-[44%] -translate-x-1/2 hover:-translate-x-1/2',
                  i === 2 && 'right-0 rotate-6',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.images[0].src} alt="" width={720} height={960} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </Link>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
