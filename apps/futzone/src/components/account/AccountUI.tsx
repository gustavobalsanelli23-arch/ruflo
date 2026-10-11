import type { Address } from '@/types/commerce';
import { cn } from '@/lib/format';

/*
 * Peças comuns da área do cliente e das telas de acesso. Sem 'use client':
 * servem tanto às páginas do servidor (login, cadastro) quanto às da conta.
 */

/** Link de texto: branco com sublinhado discreto que firma no hover (o azul fica com o elemento ativo). */
export const TEXT_LINK =
  'font-semibold text-fg underline decoration-fg/35 underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-fg';

interface AccountHeadingProps {
  title: string;
  description?: React.ReactNode;
  /** Dado ou ação alinhados à direita, sobre a linha da prateleira. */
  aside?: React.ReactNode;
  /** Link de volta acima do título (ex.: "Meus pedidos" no detalhe do pedido). */
  back?: React.ReactNode;
  className?: string;
}

/** Título da página da conta: o h1 apoiado na linha da prateleira. */
export function AccountHeading({ title, description, aside, back, className }: AccountHeadingProps) {
  return (
    <header className={cn('shelf-line mb-8 pb-5 sm:mb-10 sm:pb-6', className)}>
      {back && <div className="mb-5">{back}</div>}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 max-w-2xl">
          <h1 className="heading-display text-[2.25rem] text-fg sm:text-5xl lg:text-[3.25rem]">{title}</h1>
          {description && <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-muted sm:text-[0.95rem]">{description}</p>}
        </div>
        {aside && <div className="shrink-0 sm:pb-0.5">{aside}</div>}
      </div>
    </header>
  );
}

interface ShelfTitleProps {
  title: string;
  /** Ação de texto à direita (ex.: "Ver todas"). */
  action?: React.ReactNode;
  as?: 'h2' | 'h3';
  className?: string;
}

/** Título de seção sobre a linha da prateleira: mais espaço acima (da seção) do que abaixo. */
export function ShelfTitle({ title, action, as: Heading = 'h2', className }: ShelfTitleProps) {
  return (
    <div className={cn('shelf-line mb-5 flex items-end justify-between gap-4 pb-3', className)}>
      <Heading className="heading-display text-[1.625rem] text-fg sm:text-[1.875rem]">{title}</Heading>
      {action && <div className="shrink-0 pb-1 text-sm">{action}</div>}
    </div>
  );
}

/**
 * O endereço em três linhas: rua e número (com complemento), bairro e
 * cidade/UF, CEP. Mesmos dados de formatAddress (lib/orders), quebrados para
 * leitura em bloco.
 */
export function addressLines(a: Address): [string, string, string] {
  return [`${a.street}, ${a.number}${a.complement ? `, ${a.complement}` : ''}`, `${a.district}, ${a.city}/${a.state}`, `CEP ${a.zip}`];
}

/** Bloco de endereço: as três linhas, com o CEP sem quebrar no hífen. */
export function AddressLines({ address, className }: { address: Address; className?: string }) {
  const [street, place, zip] = addressLines(address);
  return (
    <p className={cn('leading-relaxed', className)}>
      {street}
      <br />
      {place}
      <br />
      <span className="whitespace-nowrap tabular-nums">{zip}</span>
    </p>
  );
}
