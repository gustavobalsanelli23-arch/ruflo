'use client';

import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { initialsOf } from '@/components/account/AccountNav';
import { cn } from '@/lib/format';

/** Ícone de conta do cabeçalho: iniciais quando logado; senão leva ao login. */
export function AccountButton({ className }: { className?: string }) {
  const { customer } = useCustomerAuth();
  if (customer) {
    return (
      <Link href="/conta" className={className} aria-label={`Minha conta: ${customer.name}`} title="Minha conta">
        <span className="grid size-7 place-items-center rounded-md border border-line-strong bg-steel-3 text-[0.6875rem] font-bold text-fg">{initialsOf(customer.name)}</span>
      </Link>
    );
  }
  return (
    <Link href="/login" className={cn(className)} aria-label="Entrar ou criar conta" title="Entrar">
      <UserRound className="size-5" strokeWidth={1.75} />
    </Link>
  );
}
