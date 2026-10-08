import { AccountGuard } from '@/components/account/AccountGuard';
import { AccountNav } from '@/components/account/AccountNav';
import { PageHeader } from '../PageHeader';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader eyebrow="Área do cliente" title="Minha conta" />
      <div className="container-fz py-8 sm:py-10">
        <AccountGuard>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
            <AccountNav />
            <div className="min-w-0">{children}</div>
          </div>
        </AccountGuard>
      </div>
    </>
  );
}
