import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import type { Product } from '@/types/catalog';
import { seedProducts } from '@/data/products';
import { findByRef, isPublic, productHref, teamById } from '@/lib/product';
import { TEXT_LINK } from '@/components/account/AccountUI';

/** Camisa do armário aceso ao lado de cada formulário (fotos reais do catálogo). */
const LOCKERS = {
  entrar: { teamId: 'japao', slug: 'camisa-retro-japao-azul-1998' },
  cadastro: { teamId: 'barcelona', slug: 'camisa-retro-barcelona-1994-95' },
  senha: { teamId: 'palmeiras', slug: 'camisa-retro-palmeiras-parmalat-1994' },
};

export type AuthLocker = keyof typeof LOCKERS;

const withPhoto = (p?: Product): p is Product => !!p && isPublic(p) && p.images.length > 0;

/** A camisa escolhida ou, se ela sair do catálogo, a primeira retrô com foto. */
function lockerShirt(key: AuthLocker): Product | undefined {
  const chosen = findByRef(seedProducts, LOCKERS[key]);
  if (withPhoto(chosen)) return chosen;
  return seedProducts.find((p) => withPhoto(p) && p.category === 'retro') ?? seedProducts.find(withPhoto);
}

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Qual armário acende ao lado do formulário. */
  locker?: AuthLocker;
}

/**
 * Moldura das telas de login, cadastro e recuperação de senha: o título na
 * linha da prateleira, o formulário num armário de aço e, ao lado (no
 * desktop), um armário aceso com uma camisa real. No celular o formulário vem
 * primeiro e o armário fica compacto, no fim.
 */
export function AuthShell({ title, subtitle, children, footer, locker = 'entrar' }: AuthShellProps) {
  const shirt = lockerShirt(locker);
  return (
    <div className="container-fz pt-8 sm:pt-12 lg:pt-14">
      <div className="mx-auto max-w-5xl">
        <header className="shelf-line pb-5 sm:pb-6">
          <h1 className="heading-display text-[2.75rem] text-fg sm:text-6xl">{title}</h1>
          {subtitle && <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted sm:text-base">{subtitle}</p>}
        </header>

        <div className="mt-8 grid gap-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] xl:gap-16">
          <div className="min-w-0">
            <div className="locker rounded-[var(--radius-card)] p-5 sm:p-8">{children}</div>
            {footer && <p className="mt-6 text-sm text-muted">{footer}</p>}
            <p className="mt-8 flex max-w-[68ch] items-start gap-2.5 border-t border-line pt-5 text-xs leading-relaxed text-muted">
              <ShieldCheck className="mt-px size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              Modo demonstração: sua conta fica salva apenas neste navegador e a senha é guardada criptografada (hash), nunca em texto. O login com servidor será ativado junto com o banco de dados.
            </p>
          </div>
          {shirt && <LitLocker product={shirt} />}
        </div>
      </div>
    </div>
  );
}

/**
 * Armário aceso: plaquinha (time e temporada), o nicho com a foto sob a luz do
 * teto (acende uma vez) e o nome da camisa, que leva à página dela.
 */
function LitLocker({ product }: { product: Product }) {
  const team = teamById(product.teamId);
  const image = product.images[0];
  return (
    <figure className="locker grid grid-cols-[6.5rem_minmax(0,1fr)] self-start overflow-hidden rounded-[var(--radius-card)] lg:sticky lg:top-24 lg:grid-cols-1">
      <div className="col-span-full flex h-9 items-center justify-between gap-3 border-b border-line px-3">
        <span className="plate truncate text-[0.82rem] text-fg">{team?.name}</span>
        {product.season && <span className="plate shrink-0 text-[0.74rem] tabular-nums text-muted">{product.season}</span>}
      </div>
      <div className="relative isolate overflow-hidden bg-[#0a0c10]">
        <span aria-hidden className="animate-light-on pointer-events-none absolute inset-x-[14%] top-0 z-20 h-[2px] bg-light [animation-delay:200ms]" />
        <span
          aria-hidden
          className="animate-cone-on pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(62%_40%_at_50%_0%,rgb(219_230_255/0.2),transparent_78%)] mix-blend-screen [animation-delay:420ms]"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt="" width={720} height={960} loading="lazy" decoding="async" className="block aspect-[3/4] h-auto w-full object-cover" />
      </div>
      <figcaption className="flex min-w-0 items-center border-l border-line px-4 py-3 lg:border-l-0 lg:border-t">
        <Link href={productHref(product)} className={`${TEXT_LINK} text-sm leading-snug`}>
          {product.name}
        </Link>
      </figcaption>
    </figure>
  );
}
