'use client';

import { Boxes, LogIn, Package, Settings, ShoppingCart, TicketPercent, Truck, Users } from 'lucide-react';
import type { AdminActivityKind } from '@/lib/admin/activity';
import { formatDateTime } from '@/lib/format';
import { useAdmin } from './AdminGuard';

const ICON: Record<AdminActivityKind, React.ComponentType<{ className?: string }>> = {
  auth: LogIn,
  produto: Package,
  estoque: Boxes,
  pedido: ShoppingCart,
  cliente: Users,
  frete: Truck,
  cupom: TicketPercent,
  configuracao: Settings,
};

/** Linha do tempo: "Admin 1 alterou o estoque da camisa X". */
export function ActivityFeed({ limit = 20 }: { limit?: number }) {
  const { activity } = useAdmin();
  const list = activity.slice(0, limit);
  if (list.length === 0) return <p className="px-5 py-6 text-sm text-muted">Nenhuma ação registrada ainda.</p>;
  return (
    <ul className="divide-y divide-white/[0.05]">
      {list.map((a) => {
        const Icon = ICON[a.kind];
        return (
          <li key={a.id} className="flex gap-3 px-5 py-3">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-fg-2">
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 text-sm">
              <p className="text-fg-2">
                <span className="font-semibold text-fg">{a.adminName}</span> {a.message}
              </p>
              <p className="text-xs text-subtle">{formatDateTime(a.at)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
