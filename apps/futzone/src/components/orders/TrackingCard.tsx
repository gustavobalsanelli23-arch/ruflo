'use client';

import { useId, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Order } from '@/types/commerce';
import type { TrackingInfo } from '@/services/shipping/shipping.types';
import { shippingService } from '@/services/shipping/shipping.service';
import { formatDateKey } from '@/services/shipping/delivery';
import { cn, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { ShelfTitle } from '@/components/account/AccountUI';

const STATUS_LABEL: Record<TrackingInfo['status'], string> = {
  postado: 'Postado',
  em_transito: 'Em trânsito',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  indisponivel: 'Indisponível',
};

/** Rastreamento: código (com cópia), transportadora, status, última atualização, previsão e o histórico interno. */
export function TrackingCard({ order }: { order: Order }) {
  const [info, setInfo] = useState<TrackingInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const eventsId = useId();

  if (!order.tracking) {
    if (order.status === 'cancelado' || order.status === 'entregue') return null;
    return (
      <section>
        <ShelfTitle title="Rastreamento" />
        <p className="max-w-[60ch] text-sm text-muted">O código de rastreio aparecerá aqui assim que o pedido for enviado.</p>
      </section>
    );
  }

  const tracking = order.tracking;
  const follow = async () => {
    if (open) return setOpen(false);
    setLoading(true);
    setInfo(await shippingService.trackShipment(order));
    setLoading(false);
    setOpen(true);
  };
  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('sem área de transferência');
      await navigator.clipboard.writeText(tracking.code);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
    window.setTimeout(() => setCopied('idle'), 1800);
  };

  const status = order.status === 'entregue' ? 'entregue' : 'em_transito';
  const estimate = order.status !== 'entregue' ? order.shipping?.estimatedTo : undefined;
  const last = [...(order.history ?? [])].reverse().find((e) => ['enviado', 'em_transito', 'rastreio', 'entregue'].includes(e.type))?.at ?? tracking.addedAt;

  return (
    <section>
      <ShelfTitle title="Rastreamento" />
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-4">
          <dt className="text-xs text-muted">Código de rastreio</dt>
          <dd className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-semibold tracking-wide text-fg [overflow-wrap:anywhere]">{tracking.code}</span>
            <button
              type="button"
              onClick={copy}
              className="motion-lift grid size-9 shrink-0 place-items-center rounded-lg border border-line-strong bg-steel-2 text-fg-2 transition-[background-color,color,scale] duration-150 ease-[var(--ease-out-fz)] hover:bg-steel-3 hover:text-fg active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              aria-label="Copiar código de rastreio"
            >
              {copied === 'ok' ? <Check className="size-4 text-success" strokeWidth={1.75} aria-hidden /> : <Copy className="size-4" strokeWidth={1.75} aria-hidden />}
            </button>
            <span className={cn('text-xs', copied === 'fail' ? 'text-warn' : 'sr-only')} aria-live="polite">
              {copied === 'ok' ? 'Código copiado.' : copied === 'fail' ? 'Não foi possível copiar. Selecione o código.' : ''}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Transportadora</dt>
          <dd className="mt-1 text-fg">{tracking.carrier}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Status</dt>
          <dd className="mt-1 font-semibold text-fg">{STATUS_LABEL[status]}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Última atualização</dt>
          <dd className="mt-1 tabular-nums text-fg">{formatDateTime(last)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Previsão de entrega</dt>
          <dd className="mt-1 tabular-nums text-fg">{estimate ? `até ${formatDateKey(estimate)}` : order.status === 'entregue' ? 'Entregue' : 'Sem previsão'}</dd>
        </div>
      </dl>

      <Button variant="outline" size="sm" className="mt-6" onClick={follow} loading={loading} aria-expanded={open} aria-controls={open ? eventsId : undefined}>
        {open ? 'Ocultar atualizações' : 'Acompanhar entrega'}
      </Button>

      {open && info && (
        <div id={eventsId} className="animate-fade mt-5">
          {info.events.length ? (
            <ol className="divide-y divide-line border-y border-line">
              {info.events.map((e) => (
                <li key={e.at + e.description} className="grid gap-x-5 gap-y-0.5 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                  <span className="text-xs tabular-nums text-muted sm:pt-px">{formatDateTime(e.at)}</span>
                  <span className="text-sm text-fg">{e.description}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">Sem atualizações ainda.</p>
          )}
          {info.source === 'interno' && (
            <p className="mt-3 max-w-[62ch] text-xs leading-relaxed text-muted">
              Atualizações registradas pela loja. O rastreamento em tempo real da transportadora será exibido quando a integração estiver ativa.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
