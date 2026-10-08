'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, RotateCcw } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { cn, formatPrice } from '@/lib/format';
import { formatCEP, isValidCEP, onlyDigits } from '@/lib/validation';
import { SHIPPING_PROVIDERS } from '@/services/shipping/providers';
import { DEFAULT_SHIPPING_SETTINGS, shippingSettingsRepository, type MockRate, type ShippingSettings } from '@/services/shipping/shipping.settings';
import { ShippingService } from '@/services/shipping/shipping.service';
import { billableKg } from '@/services/shipping/package';
import { formatBusinessDays, formatDeliveryWindow } from '@/services/shipping/delivery';
import { ShippingError, type PackageDimensions, type ShippingQuote } from '@/services/shipping/shipping.types';
import { DemoNotice } from '@/components/ui/Feedback';
import { Field, Input, Switch } from '@/components/ui/Form';
import { useAdmin } from './AdminGuard';
import { AdminBadge, AdminButton, AdminCard, AdminConfirm, AdminPageHeader } from './AdminUI';

const reais = (cents: number) => String(cents / 100);
const toCents = (v: string) => Math.max(0, Math.round((Number(v.replace(',', '.')) || 0) * 100));
const int = (v: string, min = 0, max = 999) => Math.max(min, Math.min(max, Math.floor(Number(v)) || 0));

function DimensionsFields({ title, value, onChange }: { title: string; value: PackageDimensions; onChange(v: PackageDimensions): void }) {
  const fields: Array<[keyof PackageDimensions, string]> = [
    ['weightGrams', 'Peso (g)'],
    ['lengthCm', 'Compr. (cm)'],
    ['widthCm', 'Largura (cm)'],
    ['heightCm', 'Altura (cm)'],
  ];
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {fields.map(([key, label]) => (
          <Field key={key} label={label}>
            {(id) => <Input id={id} type="number" min={1} value={value[key]} onChange={(e) => onChange({ ...value, [key]: int(e.target.value, 1, 30000) })} className="h-10 rounded-lg" />}
          </Field>
        ))}
      </div>
    </fieldset>
  );
}

export function ShippingAdmin() {
  const { log } = useAdmin();
  const { notify } = useToast();
  const [form, setForm] = useState<ShippingSettings>(DEFAULT_SHIPPING_SETTINGS);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => setForm(shippingSettingsRepository.get()), []);

  const zipError = form.originZip && !isValidCEP(form.originZip) ? 'CEP inválido (8 dígitos).' : undefined;
  const setRate = (id: string, patch: Partial<MockRate>) => setForm({ ...form, mockRates: form.mockRates.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (zipError) return notify('Corrija o CEP de origem.', 'warning');
    if (form.mockRates.some((r) => r.minDays > r.maxDays)) return notify('O prazo mínimo não pode ser maior que o máximo.', 'warning');
    if (!form.mockRates.some((r) => r.enabled)) return notify('Deixe pelo menos um serviço de entrega ativo.', 'warning');
    shippingSettingsRepository.save({ ...form, originZip: onlyDigits(form.originZip) });
    log('frete', `atualizou as configurações de frete${form.freeShipping.enabled ? ` (frete grátis a partir de ${formatPrice(form.freeShipping.minSubtotal)})` : ''}`);
    notify('Configurações de frete salvas.');
  };

  return (
    <>
      <AdminPageHeader title="Fretes" description="Provedor, regras de frete grátis, tabela simulada e embalagens." />
      <DemoNotice className="mb-6">
        Nenhuma transportadora está integrada: os valores abaixo alimentam apenas a <strong>simulação</strong> exibida na loja (sempre sinalizada ao cliente). Para cotações reais, conecte um provedor no servidor.
      </DemoNotice>

      <form onSubmit={save} className="grid gap-4 sm:gap-6 xl:grid-cols-2">
        <div className="space-y-4 sm:space-y-6">
          <AdminCard title="Provedor de frete">
            <ul className="divide-y divide-white/[0.05] text-sm">
              {SHIPPING_PROVIDERS.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                  <span className="min-w-0">
                    <span className="block font-semibold">{p.name}</span>
                    <span className="text-xs text-muted">{p.description}</span>
                  </span>
                  {p.id === form.providerId ? <AdminBadge tone="warn">Em uso (simulado)</AdminBadge> : <AdminBadge tone="neutral" dot={false}>Não configurado</AdminBadge>}
                </li>
              ))}
            </ul>
          </AdminCard>

          <AdminCard title="Origem e preparo">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="CEP de origem" error={zipError} hint="De onde os pedidos saem. Usado pelos provedores reais.">
                {(id, d) => <Input id={id} aria-describedby={d} inputMode="numeric" value={formatCEP(form.originZip)} onChange={(e) => setForm({ ...form, originZip: onlyDigits(e.target.value).slice(0, 8) })} placeholder="00000-000" />}
              </Field>
              <Field label="Dias para postagem" hint="Dias úteis de separação, somados ao prazo do serviço.">
                {(id, d) => <Input id={id} aria-describedby={d} type="number" min={0} max={15} value={form.handlingDays} onChange={(e) => setForm({ ...form, handlingDays: int(e.target.value, 0, 15) })} />}
              </Field>
            </div>
          </AdminCard>

          <AdminCard title="Frete grátis" description="Desligado até a loja definir a regra.">
            <div className="space-y-4 p-5">
              <Switch checked={form.freeShipping.enabled} onChange={(enabled) => setForm({ ...form, freeShipping: { ...form.freeShipping, enabled } })} label="Ativar frete grátis por valor mínimo" />
              <div className={cn('space-y-4', !form.freeShipping.enabled && 'pointer-events-none opacity-50')} aria-disabled={!form.freeShipping.enabled}>
                <Field label="Pedido mínimo (R$)">
                  {(id) => <Input id={id} type="number" min={0} step="0.01" value={reais(form.freeShipping.minSubtotal)} onChange={(e) => setForm({ ...form, freeShipping: { ...form.freeShipping, minSubtotal: toCents(e.target.value) } })} disabled={!form.freeShipping.enabled} />}
                </Field>
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-2">Serviços com frete grátis</legend>
                  <div className="flex flex-wrap gap-2">
                    {form.mockRates.map((r) => {
                      const on = form.freeShipping.serviceIds.includes(r.id);
                      return (
                        <label key={r.id} className={cn('flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1', on ? 'bg-brand-500/12 ring-brand-500/50' : 'ring-white/[0.08]')}>
                          <input
                            type="checkbox"
                            className="accent-brand-500"
                            checked={on}
                            disabled={!form.freeShipping.enabled}
                            onChange={() =>
                              setForm({ ...form, freeShipping: { ...form.freeShipping, serviceIds: on ? form.freeShipping.serviceIds.filter((x) => x !== r.id) : [...form.freeShipping.serviceIds, r.id] } })
                            }
                          />
                          {r.name}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            </div>
          </AdminCard>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <AdminCard title="Tabela simulada" description="Valores fictícios para testar a loja — não são cotações.">
            <ul className="divide-y divide-white/[0.05]">
              {form.mockRates.map((r) => (
                <li key={r.id} className="space-y-3 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">
                      {r.name} <span className="font-normal text-muted">· {r.carrier}</span>
                    </span>
                    <Switch checked={r.enabled} onChange={(enabled) => setRate(r.id, { enabled })} label={<span className="sr-only">Ativar {r.name}</span>} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Field label="Base (R$)">{(id) => <Input id={id} type="number" min={0} step="0.01" value={reais(r.basePrice)} onChange={(e) => setRate(r.id, { basePrice: toCents(e.target.value) })} className="h-10 rounded-lg" />}</Field>
                    <Field label="Kg extra (R$)">{(id) => <Input id={id} type="number" min={0} step="0.01" value={reais(r.pricePerExtraKg)} onChange={(e) => setRate(r.id, { pricePerExtraKg: toCents(e.target.value) })} className="h-10 rounded-lg" />}</Field>
                    <Field label="Prazo mín.">{(id) => <Input id={id} type="number" min={0} value={r.minDays} onChange={(e) => setRate(r.id, { minDays: int(e.target.value, 0, 60) })} className="h-10 rounded-lg" />}</Field>
                    <Field label="Prazo máx.">{(id) => <Input id={id} type="number" min={0} value={r.maxDays} onChange={(e) => setRate(r.id, { maxDays: int(e.target.value, 0, 60) })} className="h-10 rounded-lg" />}</Field>
                  </div>
                </li>
              ))}
            </ul>
          </AdminCard>

          <AdminCard title="Embalagem e peso" description="O catálogo ainda não tem peso por produto; estes perfis são usados no cálculo.">
            <div className="space-y-5 p-5">
              <Field label="Peso da caixa (g)">
                {(id) => <Input id={id} type="number" min={0} value={form.boxWeightGrams} onChange={(e) => setForm({ ...form, boxWeightGrams: int(e.target.value, 0, 5000) })} className="sm:w-40" />}
              </Field>
              <DimensionsFields title="Camisa" value={form.profiles.camisa} onChange={(camisa) => setForm({ ...form, profiles: { ...form.profiles, camisa } })} />
              <DimensionsFields title="Kit" value={form.profiles.kit} onChange={(kit) => setForm({ ...form, profiles: { ...form.profiles, kit } })} />
            </div>
          </AdminCard>

          <div className="flex flex-wrap justify-end gap-3">
            <AdminButton type="button" variant="ghost" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="size-4" /> Restaurar padrão
            </AdminButton>
            <AdminButton type="submit">Salvar configurações</AdminButton>
          </div>
        </div>
      </form>

      <ShippingSimulator settings={form} />

      <AdminConfirm
        open={confirmReset}
        title="Restaurar configurações de frete?"
        description="A tabela simulada, as embalagens e a regra de frete grátis voltam ao padrão (frete grátis desligado)."
        confirmLabel="Restaurar"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          setForm(shippingSettingsRepository.reset());
          log('frete', 'restaurou as configurações de frete padrão');
          notify('Configurações de frete restauradas.', 'info');
        }}
      />
    </>
  );
}

/** Calcula o frete com as configurações do formulário (mesmo sem salvar). */
function ShippingSimulator({ settings }: { settings: ShippingSettings }) {
  const [zip, setZip] = useState('');
  const [shirts, setShirts] = useState(1);
  const [kits, setKits] = useState(0);
  const [subtotal, setSubtotal] = useState('299.90');
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [error, setError] = useState('');
  const service = useMemo(() => new ShippingService(() => settings), [settings]);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const items = [
      ...(shirts > 0 ? [{ productId: 'sim-camisa', category: 'clubes' as const, quantity: shirts, unitPrice: 0 }] : []),
      ...(kits > 0 ? [{ productId: 'sim-kit', category: 'kits' as const, quantity: kits, unitPrice: 0 }] : []),
    ];
    try {
      setQuote(await service.calculateShipping({ destinationZip: zip, items, subtotal: toCents(subtotal) }));
    } catch (err) {
      setQuote(null);
      setError(err instanceof ShippingError ? err.message : 'Não foi possível simular.');
    }
  };

  const pkg = quote?.request.package;
  return (
    <AdminCard title="Simular cálculo de frete" description="Usa as configurações acima, inclusive as ainda não salvas." className="mt-4 sm:mt-6">
      <form onSubmit={run} className="grid grid-cols-2 gap-3 border-b border-white/[0.06] p-5 sm:grid-cols-5 sm:items-end">
        <Field label="CEP de destino" className="col-span-2 sm:col-span-1">
          {(id) => <Input id={id} inputMode="numeric" value={formatCEP(zip)} onChange={(e) => setZip(onlyDigits(e.target.value).slice(0, 8))} placeholder="00000-000" className="h-10 rounded-lg" />}
        </Field>
        <Field label="Camisas">{(id) => <Input id={id} type="number" min={0} value={shirts} onChange={(e) => setShirts(int(e.target.value, 0, 50))} className="h-10 rounded-lg" />}</Field>
        <Field label="Kits">{(id) => <Input id={id} type="number" min={0} value={kits} onChange={(e) => setKits(int(e.target.value, 0, 50))} className="h-10 rounded-lg" />}</Field>
        <Field label="Subtotal (R$)">{(id) => <Input id={id} type="number" min={0} step="0.01" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} className="h-10 rounded-lg" />}</Field>
        <AdminButton type="submit" className="col-span-2 sm:col-span-1">
          <Calculator className="size-4" /> Simular
        </AdminButton>
      </form>
      {error && <p role="alert" className="px-5 py-4 text-sm text-danger">{error}</p>}
      {quote && pkg && (
        <div className="space-y-3 p-5 text-sm">
          <p className="text-xs text-muted">
            Pacote: {pkg.items} {pkg.items === 1 ? 'item' : 'itens'} · {(pkg.weightGrams / 1000).toLocaleString('pt-BR')} kg reais · {pkg.lengthCm}×{pkg.widthCm}×{pkg.heightCm} cm · {billableKg(pkg)} kg cobráveis
            {quote.freeShipping.enabled && (quote.freeShipping.applied ? ' · frete grátis aplicado' : ` · faltam ${formatPrice(quote.freeShipping.remaining)} para o frete grátis`)}
          </p>
          <ul className="divide-y divide-white/[0.05] rounded-xl ring-1 ring-white/[0.06]">
            {quote.options.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  <span className="font-semibold">{o.name}</span> <span className="text-muted">· {formatBusinessDays(o.minDays, o.maxDays)} · previsão {formatDeliveryWindow(o.estimate.from, o.estimate.to)}</span>
                </span>
                <span className="font-bold tabular-nums">{o.isFree ? <>Grátis <s className="ml-1 font-normal text-muted">{formatPrice(o.originalPrice)}</s></> : formatPrice(o.price)}</span>
              </li>
            ))}
            {!quote.options.length && <li className="px-4 py-3 text-muted">Nenhum serviço ativo.</li>}
          </ul>
        </div>
      )}
    </AdminCard>
  );
}
