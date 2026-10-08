'use client';

import { useState } from 'react';
import { Check, Copy, MapPinned, Truck } from 'lucide-react';
import type { Order } from '@/types/commerce';
import type { TrackingInfo } from '@/services/shipping/shipping.types';
import { shippingService } from '@/services/shipping/shipping.service';
import { formatDateKey } from '@/services/shipping/delivery';
import { formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/Button';

const STATUS_LABEL: Record<TrackingInfo['status'], string> = {
  postado: 'Postado',
  em_transito: 'Em trânsito',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  indisponivel: 'Indisponível',
};

/** Rastreamento: código, transportadora, status, última atualização e previsão. */
export function TrackingCard({ order }: { order: Order }) {
  const [info, setInfo] = useState<TrackingInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!order.tracking) {
    if (order.status === 'cancelado' || order.status === 'entregue') return null;
    return (
      <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.06]">
        <h2 className="flex items-center gap-2 text-sm font-bold"><Truck className="size-4 text-brand-400" /> Rastreamento</h2>
        <p className="mt-2 text-sm text-muted">O código de rastreio aparecerá aqui assim que o pedido for enviado.</p>
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
    await navigator.clipboard?.writeText(tracking.code).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const status = order.status === 'entregue' ? 'entregue' : 'em_transito';
  const estimate = order.status !== 'entregue' ? order.shipping?.estimatedTo : undefined;
  const last = [...(order.history ?? [])].reverse().find((e) => ['enviado', 'em_transito', 'rastreio', 'entregue'].includes(e.type))?.at ?? tracking.addedAt;

  return (
    <section className="rounded-2xl bg-surface p-5 ring-1 ring-white/[0.06]">
      <h2 className="flex items-center gap-2 text-sm font-bold"><Truck className="size-4 text-brand-400" /> Rastreamento</h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="col-span-2">
          <dt className="text-xs text-muted">Código de rastreio</dt>
          <dd className="mt-0.5 flex items-center gap-2 font-mono font-semibold text-fg">
            {tracking.code}
            <button type="button" onClick={copy} className="grid size-7 place-items-center rounded-md text-muted hover:bg-white/[0.06] hover:text-fg" aria-label="Copiar código de rastreio">
              {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            </button>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Transportadora</dt>
          <dd className="mt-0.5 text-fg">{tracking.carrier}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Status</dt>
          <dd className="mt-0.5 font-semibold text-fg">{STATUS_LABEL[status]}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Última atualização</dt>
          <dd className="mt-0.5 text-fg">{formatDateTime(last)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Previsão de entrega</dt>
          <dd className="mt-0.5 text-fg">{estimate ? `até ${formatDateKey(estimate)}` : order.status === 'entregue' ? 'Entregue' : '—'}</dd>
        </div>
      </dl>
      <Button variant="outline" size="sm" className="mt-5" onClick={follow} loading={loading} aria-expanded={open}>
        {!loading && <MapPinned className="size-4" />} {open ? 'Ocultar atualizações' : 'Acompanhar entrega'}
      </Button>
      {open && info && (
        <div className="animate-fade-up mt-4 border-t border-white/[0.06] pt-4">
          {info.events.length ? (
            <ol className="space-y-3">
              {info.events.map((e) => (
                <li key={e.at + e.description} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-400" aria-hidden />
                  <span>
                    <span className="block text-fg">{e.description}</span>
                    <span className="text-xs text-muted">{formatDateTime(e.at)}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">Sem atualizações ainda.</p>
          )}
          {info.source === 'interno' && (
            <p className="mt-4 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-muted">
              Atualizações registradas pela loja. O rastreamento em tempo real da transportadora será exibido quando a integração estiver ativa.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
