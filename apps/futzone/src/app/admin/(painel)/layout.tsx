import { requireAdmin } from '@/lib/auth/session';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminLayout } from '@/components/admin/AdminLayout';

/**
 * Segunda barreira (após o proxy): valida a sessão no servidor a cada
 * requisição. Sem sessão de ADMIN, nada do painel é renderizado.
 */
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <AdminGuard session={session}>
      <AdminLayout>{children}</AdminLayout>
    </AdminGuard>
  );
}
