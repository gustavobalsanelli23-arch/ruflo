'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Exige cliente logado. Sem sessão → /login?next=<página atual>.
 * (No modo demonstração a sessão é local; com o backend, o servidor também
 * valida a sessão antes de entregar qualquer dado da conta.)
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
      <div role="status" aria-label="Carregando sua conta" className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
