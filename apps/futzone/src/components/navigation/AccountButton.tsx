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
      <Link href="/conta" className={className} aria-label={`Minha conta — ${customer.name}`} title="Minha conta">
        <span className="grid size-7 place-items-center rounded-full bg-brand-500 text-[0.62rem] font-bold text-white ring-2 ring-brand-500/25">{initialsOf(customer.name)}</span>
      </Link>
    );
  }
  return (
    <Link href="/login" className={cn(className)} aria-label="Entrar ou criar conta" title="Entrar">
      <UserRound className="size-5" />
    </Link>
  );
}
