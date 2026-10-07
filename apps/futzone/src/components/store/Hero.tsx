import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { heroShowcase, site } from '@/data/site';
import { seedProducts } from '@/data/products';
import { cn, formatPrice } from '@/lib/format';
import { findByRef, productHref, teamById } from '@/lib/product';
import { LinkButton } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';

/** Posição de cada foto da vitrine: esquerda, centro (destaque) e direita. */
const SLOTS = [
  'left-0 top-[14%] w-[44%] -rotate-[7deg] [animation-delay:250ms]',
  'left-1/2 top-0 z-10 w-[52%] -translate-x-1/2 [animation-delay:100ms]',
  'right-0 top-[14%] w-[44%] rotate-[7deg] [animation-delay:400ms]',
];

/** Hero da Home: logo oficial + vitrine com fotos reais do catálogo. */
export function Hero({ stats }: { stats: Array<{ value: string; label: string }> }) {
  const showcase = heroShowcase.map((ref) => findByRef(seedProducts, ref)).filter((p) => p && p.images.length > 0);

  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_80%_10%,color-mix(in_oklab,var(--color-brand-500)_30%,transparent)_0%,transparent_60%),radial-gradient(50%_60%_at_0%_100%,color-mix(in_oklab,var(--color-brand-700)_35%,transparent)_0%,transparent_70%)]" />
      <div className="pitch-lines absolute inset-0 -z-10 opacity-70" />

      <div className="container-fz grid min-h-[min(84dvh,780px)] items-center gap-10 py-10 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:py-16">
        <div className="animate-fade-up relative z-10 text-center lg:text-left">
          <h1 className="sr-only">FutZone — {site.tagline}</h1>
          <Logo variant="full" href={null} priority className="flex justify-center lg:justify-start" imgClassName="w-[min(62%,250px)] sm:w-[340px] lg:w-[400px]" />
          <p className="mt-6 text-2xl font-medium text-fg sm:mt-8 sm:text-3xl">{site.tagline}</p>
          <p className="mx-auto mt-3 max-w-md text-fg-2 lg:mx-0">
            Clubes, seleções, retrô e kits — as camisas que você quer, em um só lugar.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
            <LinkButton href="/camisas" size="lg">
              Ver camisas <ArrowRight className="size-4" />
            </LinkButton>
            <LinkButton href="/retro" size="lg" variant="outline">
              Coleção retrô
            </LinkButton>
          </div>
          <dl className="mx-auto mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6 lg:mx-0">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-[0.68rem] uppercase tracking-wider text-muted">{s.label}</dt>
                <dd className="heading-display mt-1 text-3xl text-fg">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto aspect-[10/9] w-full max-w-[600px]">
          <div className="absolute inset-[10%] rounded-full bg-brand-500/30 blur-3xl" aria-hidden />
          {showcase.map((p, i) => {
            const product = p!;
            return (
              <Link
                key={product.id}
                href={productHref(product)}
                className={cn(
                  'animate-fade-up group absolute block overflow-hidden rounded-3xl border border-white/10 bg-surface shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] transition-transform duration-500 hover:z-20 hover:scale-[1.03]',
                  SLOTS[i],
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.images[0].src}
                  alt={product.name}
                  width={720}
                  height={960}
                  fetchPriority={i === 1 ? 'high' : undefined}
                  className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className={cn('absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3 pt-10 sm:p-4 sm:pt-12', i !== 1 && 'hidden')}>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-brand-300">{teamById(product.teamId)?.name}</p>
                  <p className="line-clamp-1 text-xs font-semibold text-white sm:text-sm">{product.name}</p>
                  <p className="mt-0.5 text-xs font-extrabold text-white sm:text-sm">{formatPrice(product.price)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
