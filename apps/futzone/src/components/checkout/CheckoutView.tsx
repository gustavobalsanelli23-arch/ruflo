'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, LoaderCircle, Lock, ShoppingBag } from 'lucide-react';
import type { Address } from '@/types/commerce';
import type { ShippingQuote } from '@/services/shipping/shipping.types';
import { shippingService } from '@/services/shipping/shipping.service';
import { couponProvider, couponRepository, evaluateCoupon } from '@/services/coupons/coupon.service';
import { findStockIssues, type StockIssue } from '@/services/inventory.service';
import { formatBusinessDays, formatDeliveryWindow } from '@/services/shipping/delivery';
import { useCart } from '@/context/CartContext';
import { useStoreData } from '@/context/StoreDataContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { computeTotals } from '@/lib/orders';
import { toShippingItems } from '@/lib/checkout';
import { formatPrice } from '@/lib/format';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { upsertAddress } from '@/components/account/AddressBook';
import { useCheckoutDraft, EMPTY_DRAFT, type CheckoutStep } from './useCheckoutDraft';
import { CheckoutProgress, StepCard } from './StepCard';
import { IdentificationStep } from './IdentificationStep';
import { AddressStep } from './AddressStep';
import { ShippingStep } from './ShippingStep';
import { ReviewStep } from './ReviewStep';
import { PaymentStep } from './PaymentStep';
import { CouponField, TotalsTable } from './CheckoutTotals';
import { MobileOrderSummary, OrderSummary } from './OrderSummary';

const LABELS = ['Identificação', 'Endereço', 'Entrega', 'Resumo', 'Pagamento'];

export function CheckoutView() {
  const router = useRouter();
  const { lines, items, subtotal, issues, validCount, clear } = useCart();
  const { hydrated, products, settings, placeOrder } = useStoreData();
  const auth = useCustomerAuth();
  const { draft, update, reset, loaded } = useCheckoutDraft();
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [stockIssues, setStockIssues] = useState<StockIssue[]>([]);
  const [placing, setPlacing] = useState(false);
  const placed = useRef(false);

  const customer = auth.customer;
  const validLines = useMemo(() => lines.filter((l) => l.status === 'ok'), [lines]);
  const validItems = useMemo(() => validLines.map(({ productId, size, quantity }) => ({ productId, size, quantity })), [validLines]);
  const shippingItems = useMemo(() => toShippingItems(lines), [lines]);

  // Identidade: cliente logado entra direto no modo conta (com endereço principal).
  useEffect(() => {
    if (!loaded || auth.status === 'loading') return;
    if (auth.status === 'authenticated' && customer && draft.mode !== 'account') {
      const main = customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0];
      update({ mode: 'account', guest: null, addressId: main?.id ?? null, oneOffAddress: null, shippingId: null, step: main ? 3 : 2 });
    } else if (auth.status === 'anonymous' && draft.mode === 'account') {
      update({ ...EMPTY_DRAFT, couponCode: draft.couponCode });
    }
  }, [loaded, auth.status, customer, draft.mode, draft.couponCode, update]);

  const contact =
    draft.mode === 'account' && customer
      ? { name: customer.name, email: customer.email, phone: customer.phone, cpf: customer.cpf }
      : draft.mode === 'guest'
        ? draft.guest
        : null;

  const address: Address | null =
    draft.addressId === 'avulso' ? draft.oneOffAddress : draft.mode === 'account' ? (customer?.addresses.find((a) => a.id === draft.addressId) ?? null) : null;

  // Cotação de frete sempre que endereço ou carrinho mudam.
  const quoteKey = address ? `${address.zip}|${JSON.stringify(shippingItems)}|${subtotal}|${retry}` : '';
  useEffect(() => {
    if (!address || !shippingItems.length) {
      setQuote(null);
      return;
    }
    let alive = true;
    setQuoteLoading(true);
    setQuoteError(null);
    shippingService
      .calculateShipping({ destinationZip: address.zip, items: shippingItems, subtotal })
      .then((q) => alive && setQuote(q))
      .catch((e: Error) => alive && setQuoteError(e.message))
      .finally(() => alive && setQuoteLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  const shipping = quote?.options.find((o) => o.id === draft.shippingId) ?? null;

  const couponResult = useMemo(() => {
    if (!draft.couponCode) return null;
    return evaluateCoupon(
      couponRepository.list().find((c) => c.code === draft.couponCode),
      { subtotal, shippingCost: shipping?.price ?? null },
    );
  }, [draft.couponCode, subtotal, shipping]);

  const totals = computeTotals(
    validLines.map((l) => ({ unitPrice: l.unitPrice, compareAtPrice: l.compareAtPrice, quantity: l.quantity })),
    shipping?.price ?? null,
    couponResult?.ok ? couponResult.discount : 0,
  );

  const done1 = !!contact;
  const done2 = done1 && !!address;
  const done3 = done2 && !!shipping;
  const maxStep: CheckoutStep = !done1 ? 1 : !done2 ? 2 : !done3 ? 3 : 5;
  const step = Math.min(draft.step, maxStep) as CheckoutStep;
  const go = useCallback((s: CheckoutStep) => update({ step: s }), [update]);

  const applyCoupon = async (code: string) => {
    const result = await couponProvider.validate(code, { subtotal, shippingCost: shipping?.price ?? null });
    if (result.ok) update({ couponCode: result.coupon.code });
    return result;
  };

  const validateStock = () => {
    const found = findStockIssues(validItems, products);
    setStockIssues(found);
    return found.length === 0;
  };

  const finalize = () => {
    if (!contact || !address || !shipping || !quote || placing) return;
    if (!validateStock()) {
      go(4);
      return;
    }
    setPlacing(true);
    const result = placeOrder({
      items: validItems,
      customer: draft.mode === 'account' ? customer : null,
      contact,
      address,
      shipping,
      package: quote.request.package,
      originZip: quote.request.originZip,
      couponCode: couponResult?.ok ? (draft.couponCode ?? undefined) : undefined,
    });
    if (!result.ok) {
      setPlacing(false);
      if (result.reason === 'estoque') {
        setStockIssues(result.issues);
        go(4);
      }
      return;
    }
    placed.current = true;
    clear();
    reset();
    router.push(`/pedido/sucesso?pedido=${encodeURIComponent(result.order.id)}`);
  };

  if (placed.current) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 py-24 text-center text-fg-2">
        <LoaderCircle className="size-8 animate-spin text-brand-400" /> Finalizando seu pedido…
      </div>
    );
  }

  if (!hydrated || !loaded || auth.status === 'loading') {
    return (
      <div role="status" className="flex flex-col items-center gap-3 py-24 text-center text-muted">
        <LoaderCircle className="size-6 animate-spin" /> Carregando checkout…
      </div>
    );
  }

  if (validCount === 0 && issues === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-6" />}
        title="Seu carrinho está vazio"
        description="Adicione produtos ao carrinho para finalizar a compra."
        action={<LinkButton href="/camisas">Ver camisas</LinkButton>}
      />
    );
  }

  const couponSlot = <CouponField code={draft.couponCode} result={couponResult} onApply={applyCoupon} onRemove={() => update({ couponCode: null })} />;
  const totalsSlot = <TotalsTable totals={totals} itemCount={validLines.reduce((n, l) => n + l.quantity, 0)} shipping={shipping} couponCode={draft.couponCode} couponResult={couponResult} />;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px] lg:gap-12">
      <div className="min-w-0">
        <CheckoutProgress step={step} labels={LABELS} />
        <MobileOrderSummary lines={validLines} total={totals.total} totalsSlot={totalsSlot} couponSlot={couponSlot} />

        {issues > 0 && (
          <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="flex-1">Alguns produtos ficaram indisponíveis e não entram neste pedido.</span>
            <LinkButton href="/carrinho" size="sm" variant="secondary">Revisar carrinho</LinkButton>
          </div>
        )}

        <div className="space-y-3">
          <StepCard
            n={1}
            title="Identificação"
            active={step === 1}
            done={done1}
            onEdit={() => go(1)}
            summary={contact && `${contact.name} · ${contact.email}${draft.mode === 'guest' ? ' (visitante)' : ''}`}
          >
            <IdentificationStep
              customer={draft.mode === 'account' ? customer : null}
              guest={draft.guest}
              allowGuest={settings.allowGuestCheckout}
              onGuest={(guest) => update({ mode: 'guest', guest, step: 2 })}
              onContinue={() => go(2)}
              onLogout={() => void auth.logout()}
            />
          </StepCard>

          <StepCard
            n={2}
            title="Endereço"
            active={step === 2}
            done={done2}
            onEdit={() => go(2)}
            summary={address && `${address.label} — ${address.street}, ${address.number} · ${address.city}/${address.state}`}
          >
            <AddressStep
              customer={draft.mode === 'account' ? customer : null}
              recipientName={contact?.name ?? ''}
              selectedId={draft.addressId}
              oneOff={draft.oneOffAddress}
              onSelect={(id) => update({ addressId: id, shippingId: null })}
              onNewAddress={(a, save) => {
                if (save && customer) {
                  auth.saveAddresses(upsertAddress(customer.addresses, a));
                  update({ addressId: a.id, shippingId: null, step: 3 });
                } else {
                  update({ addressId: 'avulso', oneOffAddress: a, shippingId: null, step: 3 });
                }
              }}
              onContinue={() => go(3)}
            />
          </StepCard>

          <StepCard
            n={3}
            title="Entrega"
            active={step === 3}
            done={done3}
            onEdit={() => go(3)}
            summary={
              shipping && `${shipping.name} · ${shipping.isFree ? 'Grátis' : formatPrice(shipping.price)} · ${formatBusinessDays(shipping.minDays, shipping.maxDays)} (${formatDeliveryWindow(shipping.estimate.from, shipping.estimate.to)})`
            }
          >
            {address && (
              <ShippingStep
                address={address}
                quote={quote}
                loading={quoteLoading}
                error={quoteError}
                selectedId={draft.shippingId}
                onSelect={(id) => update({ shippingId: id })}
                onRetry={() => setRetry((r) => r + 1)}
                onContinue={() => go(4)}
              />
            )}
          </StepCard>

          <StepCard n={4} title="Resumo do pedido" active={step === 4} done={step === 5} onEdit={() => go(4)} summary={`Total ${formatPrice(totals.total)}`}>
            {address && shipping && (
              <ReviewStep
                lines={validLines}
                address={address}
                shipping={shipping}
                issues={stockIssues}
                totalsSlot={totalsSlot}
                couponSlot={couponSlot}
                onEdit={go}
                onContinue={() => validateStock() && go(5)}
              />
            )}
          </StepCard>

          <StepCard n={5} title="Pagamento" active={step === 5} done={false}>
            <PaymentStep total={totals.total} placing={placing} onFinalize={finalize} />
          </StepCard>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
          <Lock className="size-3.5" /> Seus dados trafegam por conexão segura (HTTPS).
        </p>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <OrderSummary lines={validLines} total={totals.total} totalsSlot={totalsSlot} couponSlot={couponSlot} />
        </div>
      </aside>
    </div>
  );
}
