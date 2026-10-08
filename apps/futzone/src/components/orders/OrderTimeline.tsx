'use client';

import { Check, Clock3 } from 'lucide-react';
import type { Order } from '@/types/commerce';
import { buildOrderTimeline, type TimelineStep } from '@/lib/orders';
import { cn, formatDateTime } from '@/lib/format';

const DOT: Record<TimelineStep['state'], string> = {
  done: 'bg-brand-500 text-white',
  current: 'bg-bg text-brand-300 ring-2 ring-brand-500',
  waiting: 'bg-bg text-warn border-2 border-dashed border-warn/60',
  upcoming: 'bg-bg text-subtle ring-1 ring-white/15',
};

/** Linha do tempo vertical do pedido (cliente). */
export function OrderTimeline({ order }: { order: Order }) {
  const steps = buildOrderTimeline(order);
  return (
    <ol className="relative" aria-label="Andamento do pedido">
      {steps.map((s, i) => {
        const nextDone = steps[i + 1]?.state === 'done';
        return (
          <li key={s.id} className="animate-fade-up relative flex gap-4 pb-6 last:pb-0" style={{ animationDelay: `${i * 70}ms` }} aria-current={s.state === 'current' ? 'step' : undefined}>
            {i < steps.length - 1 && (
              <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden>
                <span className={cn('block h-full w-full origin-top bg-brand-500 transition-transform duration-700 ease-[var(--ease-out-fz)]', nextDone ? 'scale-y-100' : 'scale-y-0')} />
              </span>
            )}
            <span className={cn('relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold', DOT[s.state])}>
              {s.state === 'current' && <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/30 [animation-duration:2s]" aria-hidden />}
              {s.state === 'done' ? <Check className="size-4" /> : s.state === 'waiting' ? <Clock3 className="size-4" /> : i + 1}
            </span>
            <div className="min-w-0 pt-1">
              <p className={cn('text-sm font-semibold', s.state === 'upcoming' ? 'text-muted' : 'text-fg')}>
                {s.label}
                <span className="sr-only">
                  {' '}
                  — {s.state === 'done' ? 'concluído' : s.state === 'current' ? 'em andamento' : s.state === 'waiting' ? 'aguardando integração' : 'próxima etapa'}
                </span>
              </p>
              {s.at && <p className="text-xs text-muted">{formatDateTime(s.at)}</p>}
              {s.detail && <p className={cn('mt-0.5 text-xs', s.state === 'waiting' ? 'text-warn' : 'text-fg-2')}>{s.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Barra de progresso compacta (listas e painel da conta). */
export function OrderProgress({ order }: { order: Order }) {
  if (order.status === 'cancelado') return <p className="text-xs font-semibold text-danger">Pedido cancelado</p>;
  const steps = buildOrderTimeline(order);
  const current = steps.find((s) => s.state === 'current' || s.state === 'waiting') ?? steps[steps.length - 1];
  const done = steps.filter((s) => s.state === 'done').length;
  return (
    <div>
      <div className="flex gap-1" aria-hidden>
        {steps.map((s) => (
          <span key={s.id} className={cn('h-1.5 flex-1 rounded-full transition-colors duration-500', s.state === 'done' ? 'bg-brand-500' : s.state === 'current' ? 'bg-brand-500/45' : s.state === 'waiting' ? 'bg-warn/50' : 'bg-white/[0.08]')} />
        ))}
      </div>
      <p className="mt-2 text-xs text-fg-2">
        <span className="font-semibold text-fg">{done === steps.length ? 'Entregue' : current.label}</span>
        <span className="text-muted"> · etapa {Math.min(done + 1, steps.length)} de {steps.length}</span>
      </p>
    </div>
  );
}
