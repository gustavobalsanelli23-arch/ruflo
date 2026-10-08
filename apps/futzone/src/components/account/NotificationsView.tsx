'use client';

import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { useCustomerNotifications } from '@/hooks/useAccountData';
import { cn, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';

export function NotificationsView() {
  const { list, unread, markRead, markAllRead } = useCustomerNotifications();
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="heading-display text-4xl">Notificações</h2>
          <p className="mt-1 text-sm text-muted">Atualizações dos seus pedidos. Em breve também por e-mail.</p>
        </div>
        {unread > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            <CheckCheck className="size-4" /> Marcar todas como lidas
          </Button>
        )}
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Bell className="size-6" />} title="Nenhuma notificação" description="Quando seus pedidos andarem, avisamos aqui." />
      ) : (
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl bg-surface ring-1 ring-white/[0.06]">
          {list.map((n) => (
            <li key={n.id}>
              <Link
                href={`/conta/pedidos/${n.orderId}`}
                onClick={() => markRead([n.id])}
                className={cn('flex gap-3 px-5 py-4 transition-colors hover:bg-white/[0.03]', !n.read && 'bg-brand-500/[0.04]')}
              >
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read ? 'bg-white/15' : 'bg-brand-400')} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-sm', n.read ? 'text-fg-2' : 'font-semibold text-fg')}>{n.title}</span>
                  <span className="text-xs text-muted">{n.message}</span>
                </span>
                <span className="shrink-0 text-xs text-subtle">{formatDateTime(n.at)}</span>
                {!n.read && <span className="sr-only">(não lida)</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
