'use client';

import Link from 'next/link';
import type { Order } from '@/types/commerce';
import { useStoreData } from '@/context/StoreDataContext';
import { productHref } from '@/lib/product';
import { formatPrice } from '@/lib/format';
import { formatAddress } from '@/lib/orders';
import { formatBusinessDays, formatDeliveryWindow } from '@/services/shipping/delivery';

/** Itens do pedido com foto, tamanho, quantidade e preço. */
export function OrderItems({ order, linkProducts = true }: { order: Order; linkProducts?: boolean }) {
  const { products } = useStoreData();
  const hrefOf = (productId: string) => {
    const p = products.find((x) => x.id === productId && x.status === 'published');
    return p ? productHref(p) : null;
  };
  return (
    <ul className="divide-y divide-white/[0.06]">
      {order.lines.map((l) => (
        <li key={l.productId + l.size} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
          {l.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.image} alt="" width={720} height={960} loading="lazy" decoding="async" className="h-20 w-15 shrink-0 rounded-lg bg-surface-2 object-cover" />
          ) : (
            <span className="h-20 w-15 shrink-0 rounded-lg bg-surface-2" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            {linkProducts && hrefOf(l.productId) ? (
              <Link href={hrefOf(l.productId)!} className="line-clamp-2 text-sm font-semibold text-fg hover:text-brand-300">
                {l.name}
              </Link>
            ) : (
              <p className="line-clamp-2 text-sm font-semibold text-fg">{l.name}</p>
            )}
            <p className="mt-0.5 text-xs text-muted">
              Tamanho {l.size} · {l.quantity} × {formatPrice(l.unitPrice)}
            </p>
          </div>
          <p className="text-sm font-bold tabular-nums">{formatPrice(l.unitPrice * l.quantity)}</p>
        </li>
      ))}
    </ul>
  );
}

/** Subtotal, frete, desconto e total registrados no pedido. */
export function OrderTotals({ order }: { order: Order }) {
  const subtotal = order.subtotal ?? order.lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
  const shipping = order.shippingCost ?? order.shipping?.price;
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between text-fg-2">
        <dt>Subtotal</dt>
        <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
      </div>
      <div className="flex justify-between text-fg-2">
        <dt>Frete{order.shipping ? ` (${order.shipping.serviceName})` : ''}</dt>
        <dd className="tabular-nums">{shipping === undefined ? '—' : shipping === 0 ? 'Grátis' : formatPrice(shipping)}</dd>
      </div>
      {!!order.discount && (
        <div className="flex justify-between text-success">
          <dt>Desconto{order.coupon ? ` (${order.coupon.code})` : ''}</dt>
          <dd className="tabular-nums">− {formatPrice(order.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-white/[0.06] pt-3 text-base font-bold text-fg">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatPrice(order.total)}</dd>
      </div>
    </dl>
  );
}

/** Endereço + método de entrega + previsão. */
export function OrderDelivery({ order }: { order: Order }) {
  const s = order.shipping;
  return (
    <div className="space-y-4 text-sm">
      {order.address ? (
        <div>
          <p className="text-xs text-muted">Endereço de entrega</p>
          <p className="mt-1 font-semibold text-fg">{order.address.recipient}</p>
          <p className="text-fg-2">{formatAddress(order.address)}</p>
          {order.address.reference && <p className="text-xs text-muted">Referência: {order.address.reference}</p>}
        </div>
      ) : (
        <p className="text-muted">Endereço não informado.</p>
      )}
      {s && (
        <div>
          <p className="text-xs text-muted">Método de entrega</p>
          <p className="mt-1 font-semibold text-fg">
            {s.serviceName} · {s.carrier}
          </p>
          <p className="text-fg-2">
            {formatBusinessDays(s.minDays, s.maxDays)} · previsão {formatDeliveryWindow(s.estimatedFrom, s.estimatedTo)}
          </p>
          {s.isMock && <p className="mt-1 text-xs text-muted">Frete e prazo simulados (transportadora ainda não integrada).</p>}
        </div>
      )}
    </div>
  );
}
