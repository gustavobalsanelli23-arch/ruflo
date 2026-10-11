'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Exige cliente logado. Sem sessão, vai para /login?next=<página atual>.
 * (No modo demonstração a sessão é local; com o backend, o servidor também
 * valida a sessão antes de entregar qualquer dado da conta.)
 *
 * O esqueleto repete as medidas do layout da conta (coluna de placas e
 * título na linha da prateleira) para nada pular quando a conta carrega.
 */
export function AccountGuard({ children }: { children: React.ReactNode }) {
  const { status } = useCustomerAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'anonymous') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);

  if (status !== 'authenticated') {
    return (
      <div role="status" aria-label="Carregando sua conta" className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
        <div className="-mx-4 flex gap-1.5 overflow-hidden px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-1 lg:px-0">
          <Skeleton className="mb-2 hidden h-[4.375rem] rounded-[var(--radius-card)] lg:block" />
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-32 shrink-0 rounded-[var(--radius-card)] lg:h-12 lg:w-full" />
          ))}
        </div>
        <div className="min-w-0">
          <div className="shelf-line mb-8 pb-5 sm:mb-10 sm:pb-6">
            <Skeleton className="h-10 w-56 rounded-sm sm:h-12 sm:w-72" />
            <Skeleton className="mt-4 h-4 w-full max-w-sm rounded-sm" />
          </div>
          <Skeleton className="h-52 rounded-[var(--radius-card)]" />
          <Skeleton className="mt-4 h-32 rounded-[var(--radius-card)]" />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
