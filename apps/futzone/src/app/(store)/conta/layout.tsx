import { AccountGuard } from '@/components/account/AccountGuard';
import { AccountNav } from '@/components/account/AccountNav';

/**
 * Área do cliente: a coluna de placas (navegação) e a página ao lado. Cada
 * página tem o próprio título na linha da prateleira. As colunas repetem as
 * do esqueleto do AccountGuard.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-fz pt-6 sm:pt-10 lg:pt-12">
      <AccountGuard>
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
          <AccountNav />
          <div className="min-w-0">{children}</div>
        </div>
      </AccountGuard>
    </div>
  );
}
