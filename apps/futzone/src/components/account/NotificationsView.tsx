'use client';

import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { useCustomerNotifications } from '@/hooks/useAccountData';
import { cn, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { AccountHeading } from './AccountUI';

/** Atualizações dos pedidos. A lâmpada acesa marca o que ainda não foi lido. */
export function NotificationsView() {
  const { list, unread, markRead, markAllRead } = useCustomerNotifications();
  return (
    <div>
      <AccountHeading
        title="Notificações"
        description="Atualizações dos seus pedidos. Em breve também por e-mail."
        aside={
          unread > 0 && (
            <Button variant="secondary" size="sm" onClick={markAllRead}>
              <CheckCheck className="size-4" strokeWidth={1.75} aria-hidden /> Marcar todas como lidas
            </Button>
          )
        }
      />
      {list.length === 0 ? (
        <EmptyState headingLevel="h2" icon={<Bell className="size-6" strokeWidth={1.75} />} title="Nenhuma notificação" description="Quando seus pedidos andarem, avisamos aqui." />
      ) : (
        <ul className="locker divide-y divide-line overflow-hidden rounded-[var(--radius-card)]">
          {list.map((n) => (
            <li key={n.id}>
              <Link
                href={`/conta/pedidos/${n.orderId}`}
                onClick={() => markRead([n.id])}
                className="group grid grid-cols-[7px_minmax(0,1fr)] gap-x-4 px-4 py-4 transition-colors duration-150 hover:bg-steel-3/60 focus-visible:outline-offset-[-2px] sm:grid-cols-[7px_minmax(0,1fr)_auto] sm:px-5"
              >
                <span aria-hidden className={cn('mt-[0.4rem] size-[7px] rounded-[1px]', !n.read && 'bg-light')} />
                <span className="min-w-0">
                  <span className={cn('block text-sm', n.read ? 'text-fg-2' : 'font-semibold text-fg')}>{n.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{n.message}</span>
                  {!n.read && <span className="sr-only">(não lida)</span>}
                </span>
                <span className="col-start-2 mt-1.5 text-xs tabular-nums text-muted sm:col-start-3 sm:mt-0 sm:pt-px">{formatDateTime(n.at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
