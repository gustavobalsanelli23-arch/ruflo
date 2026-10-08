'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';

/** Telas de login/cadastro: quem já está logado segue direto para o destino. */
export function GuestOnly({ next, children }: { next: string; children: React.ReactNode }) {
  const { status } = useCustomerAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === 'authenticated') router.replace(next);
  }, [status, next, router]);
  return <>{children}</>;
}
