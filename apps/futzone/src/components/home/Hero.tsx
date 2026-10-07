import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { heroShowcase } from '@/data/site';
import { seedProducts } from '@/data/products';
import { cn, formatPrice } from '@/lib/format';
import { findByRef, productHref, teamById } from '@/lib/product';
import { LinkButton } from '@/components/ui/Button';
import type { Product } from '@/types/catalog';

const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

/** Mini-cartão flutuante com produto real (link para a página do produto). */
function FloatingProduct({ product, className, style }: { product: Product; className?: string; style?: React.CSSProperties }) {
  return (
    <Link
      href={productHref(product)}
      style={style}
      className={cn(
        'animate-fade-up absolute z-20 flex w-52 items-center gap-3 rounded-2xl border border-white/10 bg-bg/75 p-2 pr-4 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-transform duration-300 ease-[var(--ease-out-fz)] hover:-translate-y-1',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={product.images[0].src} alt="" width={720} height={960} decoding="async" className="h-14 w-11 shrink-0 rounded-lg object-cover" />
      <span className="min-w-0">
        <span className="block text-[0.6rem] font-bold uppercase tracking-[0.16em] text-brand-400">{teamById(product.teamId)?.name}</span>
        <span className="block truncate text-xs font-semibold text-fg">{product.name.replace(/^Camisa\s+/, '')}</span>
        <span className="block text-xs font-bold text-fg">{formatPrice(product.price)}</span>
      </span>
    </Link>
  );
}

/** Hero da Home em formato de campanha: título forte + foto grande do catálogo. */
export function Hero({ stats }: { stats: Array<{ value: string; label: string }> }) {
  const [left, main, right] = heroShowcase.map((ref) => findByRef(seedProducts, ref));

  return (
    <section className="relative isolate overflow-hidden">
      {/* Fundo: luz azul discreta + linhas de campo minimalistas */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(55%_70%_at_75%_35%,color-mix(in_oklab,var(--color-brand-600)_22%,transparent),transparent_70%)]" />
      <svg className="absolute -right-24 top-1/2 -z-10 hidden h-[130%] -translate-y-1/2 text-white/[0.04] lg:block" viewBox="0 0 600 600" fill="none" aria-hidden>
        <circle cx="300" cy="300" r="190" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="300" cy="300" r="4" fill="currentColor" />
        <path d="M300 0V600" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <div className="container-fz grid items-center gap-10 pb-14 pt-8 sm:pt-12 lg:min-h-[min(calc(100dvh-110px),760px)] lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pb-16">
        <div className="relative z-10">
          <p className="animate-fade-up eyebrow mb-5 flex items-center gap-3" style={delay(0)}>
            <span className="h-px w-8 bg-brand-500" aria-hidden /> Temporada 26/27
          </p>
          <h1 className="animate-fade-up heading-display text-[clamp(3.4rem,11vw,7.6rem)] text-fg" style={delay(60)}>
            Vista a <span className="text-brand-500">paixão</span>
            <br /> pelo futebol.
          </h1>
          <p className="animate-fade-up mt-6 max-w-md text-base leading-relaxed text-fg-2 sm:text-lg" style={delay(140)}>
            Camisas de clubes, seleções e clássicos retrô — escolhidas para quem vive o jogo dentro e fora do estádio.
          </p>
          <div className="animate-fade-up mt-9 flex flex-wrap gap-3" style={delay(220)}>
            <LinkButton href="/camisas" size="lg">
              Ver camisas <ArrowRight className="size-4" />
            </LinkButton>
            <LinkButton href="/retro" size="lg" variant="outline">
              Coleção retrô
            </LinkButton>
          </div>
          <dl className="animate-fade-up mt-12 flex gap-10 border-t border-white/[0.07] pt-6" style={delay(300)}>
            {stats.map((s) => (
              <div key={s.label}>
                <dd className="heading-display text-3xl text-fg sm:text-4xl">{s.value}</dd>
                <dt className="mt-1 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        {main && main.images[0] && (
          <div className="relative mx-auto w-full max-w-[460px] lg:max-w-none">
            <Link
              href={productHref(main)}
              className="animate-hero-image group relative mx-auto block aspect-[4/5] w-[82%] overflow-hidden rounded-[2rem] bg-surface-2 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)] lg:w-[78%]"
              aria-label={main.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={main.images[0].src}
                alt={main.name}
                width={720}
                height={960}
                fetchPriority="high"
                className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out-fz)] group-hover:scale-[1.03]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 pt-16">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-brand-300">Destaque da temporada</p>
                <p className="mt-1 font-semibold text-white">{main.name}</p>
                <p className="text-sm font-bold text-white/90">{formatPrice(main.price)}</p>
              </div>
            </Link>
            {left?.images[0] && <FloatingProduct product={left} className="-left-1 top-[12%] hidden sm:flex lg:-left-4" style={delay(380)} />}
            {right?.images[0] && <FloatingProduct product={right} className="-right-1 bottom-[16%] hidden sm:flex lg:-right-2" style={delay(460)} />}
          </div>
        )}
      </div>
    </section>
  );
}
