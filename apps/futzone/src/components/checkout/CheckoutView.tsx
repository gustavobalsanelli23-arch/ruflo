'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, LoaderCircle, Shirt } from 'lucide-react';
import { findStockIssues, type StockIssue } from '@/services/inventory.service';
import { useCart } from '@/context/CartContext';
import { useStoreData } from '@/context/StoreDataContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { useToast } from '@/context/ToastContext';
import { computeTotals } from '@/lib/orders';
import { linkPriceMismatch, paymentGroups, productPriceKey } from '@/lib/paymentLinks';
import { formatPrice } from '@/lib/format';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { useCheckoutDraft, EMPTY_DRAFT, type CheckoutStep } from './useCheckoutDraft';
import { CheckoutProgress, StepCard } from './StepCard';
import { IdentificationStep } from './IdentificationStep';
import { ReviewStep } from './ReviewStep';
import { PaymentStep } from './PaymentStep';
import { TotalsTable } from './CheckoutTotals';
import { MobileOrderSummary, OrderSummary } from './OrderSummary';

const LABELS = ['Identificação', 'Resumo', 'Pagamento'];

/*
 * O resumo lateral gruda logo abaixo do Header rolado (58px = h-14 + 2 bordas,
 * components/layout/Header.tsx) com um respiro de 1.5rem.
 */
const SUMMARY_STICKY = 'sticky top-[calc(58px+1.5rem)]';

/**
 * Checkout em três estações. Endereço e frete não ficam aqui: o pagamento é
 * feito nos links da Stripe, que coletam o endereço e cobram o frete da região.
 */
export function CheckoutView() {
  const router = useRouter();
  const { notify } = useToast();
  const { lines, issues, validCount, clear } = useCart();
  const { hydrated, products, settings, placeOrder } = useStoreData();
  const auth = useCustomerAuth();
  const { draft, update, reset, loaded } = useCheckoutDraft();
  const [stockIssues, setStockIssues] = useState<StockIssue[]>([]);
  const [serverPriceIssues, setServerPriceIssues] = useState<string[]>([]);
  const [placing, setPlacing] = useState(false);
  const placed = useRef(false);

  const customer = auth.customer;
  const validLines = useMemo(() => lines.filter((l) => l.status === 'ok'), [lines]);
  const validItems = useMemo(() => validLines.map(({ productId, size, quantity }) => ({ productId, size, quantity })), [validLines]);

  // Identidade: cliente logado entra direto no modo conta.
  useEffect(() => {
    if (!loaded || auth.status === 'loading') return;
    if (auth.status === 'authenticated' && customer && draft.mode !== 'account') {
      update({ mode: 'account', guest: null, step: 2 });
    } else if (auth.status === 'anonymous' && draft.mode === 'account') {
      update(EMPTY_DRAFT);
    }
  }, [loaded, auth.status, customer, draft.mode, update]);

  const contact =
    draft.mode === 'account' && customer
      ? { name: customer.name, email: customer.email, phone: customer.phone, cpf: customer.cpf }
      : draft.mode === 'guest'
        ? draft.guest
        : null;

  const totals = computeTotals(
    validLines.map((l) => ({ unitPrice: l.unitPrice, compareAtPrice: l.compareAtPrice, quantity: l.quantity })),
    null,
    0,
  );

  // Cada tipo de camisa é pago no seu link; o preço precisa ser o mesmo do link.
  const priceIssues = useMemo(() => {
    const local = validLines.filter((l) => l.product && linkPriceMismatch(l.product)).map((l) => l.name);
    return [...new Set([...local, ...serverPriceIssues])];
  }, [validLines, serverPriceIssues]);
  const groups = useMemo(
    () => paymentGroups(validLines.filter((l) => l.product).map((l) => ({ priceKey: productPriceKey(l.product!), quantity: l.quantity, unitPrice: l.unitPrice })), ''),
    [validLines],
  );

  const done1 = !!contact;
  const maxStep: CheckoutStep = !done1 ? 1 : 3;
  const step = Math.min(draft.step, maxStep) as CheckoutStep;
  const go = useCallback((s: CheckoutStep) => update({ step: s }), [update]);

  const validateStock = () => {
    const found = findStockIssues(validItems, products);
    setStockIssues(found);
    return found.length === 0 && priceIssues.length === 0;
  };

  const finalize = async () => {
    if (!contact || placing) return;
    if (!validateStock()) {
      go(2);
      return;
    }
    setPlacing(true);
    const result = await placeOrder({
      items: validItems,
      customer: draft.mode === 'account' ? customer : null,
      contact,
    });
    if (!result.ok) {
      setPlacing(false);
      if (result.reason === 'estoque') {
        setStockIssues(result.issues);
        go(2);
      } else if (result.reason === 'preco') {
        setServerPriceIssues(result.products);
        go(2);
      } else if (result.reason === 'falha') {
        notify(result.message, 'warning');
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
      <div role="status" className="flex flex-col items-center gap-3 py-24 text-center text-sm text-fg-2">
        <LoaderCircle className="size-6 animate-spin text-muted" strokeWidth={1.75} aria-hidden /> Finalizando seu pedido…
      </div>
    );
  }

  if (!hydrated || !loaded || auth.status === 'loading') {
    return (
      <div role="status" className="flex flex-col items-center gap-3 py-24 text-center text-sm text-muted">
        <LoaderCircle className="size-6 animate-spin" strokeWidth={1.75} aria-hidden /> Carregando checkout…
      </div>
    );
  }

  if (validCount === 0 && issues === 0) {
    return (
      <EmptyState
        headingLevel="h2"
        icon={<Shirt className="size-6" strokeWidth={1.75} aria-hidden />}
        title="Seu carrinho está vazio"
        description="Adicione produtos ao carrinho para finalizar a compra."
        action={<LinkButton href="/camisas">Ver camisas</LinkButton>}
      />
    );
  }

  const totalsSlot = <TotalsTable totals={totals} itemCount={validLines.reduce((n, l) => n + l.quantity, 0)} />;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12 xl:gap-16">
      <div className="min-w-0">
        <CheckoutProgress step={step} labels={LABELS} />
        <MobileOrderSummary lines={validLines} total={totals.total} totalsSlot={totalsSlot} />

        {issues > 0 && (
          <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-warn/30 bg-warn/[0.06] px-4 py-3 text-sm text-warn">
            <AlertTriangle className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="flex-1">Alguns produtos ficaram indisponíveis e não entram neste pedido.</span>
            <LinkButton href="/carrinho" size="sm" variant="secondary">Revisar carrinho</LinkButton>
          </div>
        )}

        {/* As três estações, em lugar fixo, apoiadas na linha da prateleira */}
        <div className="border-b border-line-strong">
          <StepCard
            n={1}
            title="Identificação"
            active={step === 1}
            done={done1}
            onEdit={() => go(1)}
            summary={
              contact && (
                <>
                  <span className="text-fg">{contact.name}</span>, {contact.email}
                  {draft.mode === 'guest' && <span className="text-muted"> (visitante)</span>}
                </>
              )
            }
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

          <StepCard n={2} title="Resumo do pedido" active={step === 2} done={step === 3} onEdit={() => go(2)} summary={`Produtos ${formatPrice(totals.total)} + frete no pagamento`}>
            <ReviewStep lines={validLines} issues={stockIssues} priceIssues={priceIssues} totalsSlot={totalsSlot} onContinue={() => validateStock() && go(3)} />
          </StepCard>

          <StepCard n={3} title="Pagamento" active={step === 3} done={false} note="Último passo: pagamento com Pix ou cartão na Stripe.">
            <PaymentStep groups={groups} total={totals.total} placing={placing} onFinalize={finalize} />
          </StepCard>
        </div>

        <p className="mt-6 text-center text-xs text-muted">Seus dados trafegam por conexão segura (HTTPS).</p>
      </div>

      <aside className="hidden lg:block">
        <div className={SUMMARY_STICKY}>
          <OrderSummary lines={validLines} total={totals.total} totalsSlot={totalsSlot} />
        </div>
      </aside>
    </div>
  );
}
