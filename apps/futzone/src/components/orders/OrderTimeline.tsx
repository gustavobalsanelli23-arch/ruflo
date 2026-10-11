'use client';

import { Check, Clock3 } from 'lucide-react';
import type { Order } from '@/types/commerce';
import { buildOrderTimeline, type TimelineState } from '@/lib/orders';
import { cn, formatDateTime } from '@/lib/format';

/**
 * Estações fixas do pedido. Concluída: aço com o visto. Atual: a lâmpada
 * acesa. Aguardando: contorno tracejado, honesto sobre o que ainda não existe
 * (o gateway de pagamento). Próxima: apagada, só o número.
 */
const STATION: Record<TimelineState, string> = {
  done: 'border border-line-strong bg-steel-3 text-fg-2',
  current: 'bg-light text-bg',
  waiting: 'border border-dashed border-warn/70 bg-steel text-warn',
  upcoming: 'border border-line bg-steel text-muted',
};

const STATE_TEXT: Record<TimelineState, string> = {
  done: 'concluído',
  current: 'em andamento',
  waiting: 'aguardando integração',
  upcoming: 'próxima etapa',
};

/** Linha do tempo do pedido (cliente): as estações na ordem do caminho. */
export function OrderTimeline({ order }: { order: Order }) {
  const steps = buildOrderTimeline(order);
  return (
    <ol aria-label="Andamento do pedido">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        // O trilho até a próxima estação acende quando ela já foi concluída.
        const railDone = steps[i + 1]?.state === 'done';
        return (
          <li key={s.id} aria-current={s.state === 'current' ? 'step' : undefined} className={cn('relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4', !last && 'pb-7')}>
            {!last && <span aria-hidden className={cn('absolute bottom-1.5 left-4 top-[2.375rem] w-px -translate-x-1/2', railDone ? 'bg-fg-2/45' : 'bg-line-strong')} />}
            <span aria-hidden className={cn('grid size-8 place-items-center rounded-[var(--radius-button)] text-xs font-bold tabular-nums', STATION[s.state])}>
              {s.state === 'done' ? <Check className="size-4" strokeWidth={1.75} /> : s.state === 'waiting' ? <Clock3 className="size-4" strokeWidth={1.75} /> : i + 1}
            </span>
            <div className="min-w-0 pt-1">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className={cn('text-sm font-semibold', s.state === 'upcoming' ? 'text-muted' : 'text-fg')}>{s.label}</span>
                {s.state === 'waiting' ? (
                  <span className="rounded-[var(--radius-chip)] border border-warn/40 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-warn">Aguardando integração</span>
                ) : (
                  <span className="sr-only">({STATE_TEXT[s.state]})</span>
                )}
              </p>
              {s.at && <p className="mt-1 text-xs tabular-nums text-muted">{formatDateTime(s.at)}</p>}
              {s.detail && <p className={cn('mt-1 max-w-[56ch] text-xs leading-relaxed', s.state === 'waiting' ? 'text-warn' : 'text-fg-2')}>{s.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const SEGMENT: Record<TimelineState, string> = {
  done: 'bg-fg-2/55',
  current: 'bg-light',
  waiting: 'bg-warn/80',
  upcoming: 'bg-line-strong',
};

/** Barra compacta (listas e painel da conta): um trecho por estação, a atual acesa. */
export function OrderProgress({ order }: { order: Order }) {
  if (order.status === 'cancelado') return <p className="text-xs font-semibold text-danger">Pedido cancelado</p>;
  const steps = buildOrderTimeline(order);
  const now = steps.find((s) => s.state === 'current' || s.state === 'waiting');
  const done = steps.filter((s) => s.state === 'done').length;
  // A etapa que espera o gateway diz isso, em vez de anunciar "Pagamento aprovado".
  const caption = !now ? 'Entregue' : now.state === 'waiting' ? 'Pagamento: aguardando integração' : now.label;
  return (
    <div>
      <div className="flex gap-1" aria-hidden>
        {steps.map((s) => (
          <span key={s.id} className={cn('h-1 flex-1 rounded-[1px]', SEGMENT[s.state])} />
        ))}
      </div>
      <p className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
        <span className={cn('font-semibold', now?.state === 'waiting' ? 'text-warn' : 'text-fg')}>{caption}</span>
        <span className="tabular-nums text-muted">
          etapa {Math.min(done + 1, steps.length)} de {steps.length}
        </span>
      </p>
    </div>
  );
}
