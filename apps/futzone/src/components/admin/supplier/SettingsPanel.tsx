'use client';

import { useState } from 'react';
import type { IntegrationSettings, IntegrationStatus } from '@/types/supplier';
import { PRICE_KEY_LABEL, type PriceKey, type PriceRules } from '@/lib/pricing';
import { centsToInput, parsePrice } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import { Field, Switch } from '@/components/ui/Form';
import { AdminBadge, AdminButton, AdminCard, AdminInput } from '../AdminUI';
import { useAdmin } from '../AdminGuard';
import { supplierRequest } from './useSupplierAdmin';

/** Opções da integração e tabela de preços por tipo de camisa. */
export function SettingsPanel({ status, onChanged }: { status: IntegrationStatus; onChanged(): Promise<void> }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <OptionsCard settings={status.settings} cronConfigured={status.cronConfigured} onChanged={onChanged} />
      <PriceRulesCard rules={status.priceRules} approve={status.settings.approvePriceChanges} onChanged={onChanged} />
    </div>
  );
}

function OptionsCard({ settings, cronConfigured, onChanged }: { settings: IntegrationSettings; cronConfigured: boolean; onChanged(): Promise<void> }) {
  const { notify } = useToast();
  const { log } = useAdmin();
  const [form, setForm] = useState(settings);
  const [cap, setCap] = useState(String(settings.defaultCap));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const defaultCap = Number(cap);
    if (!Number.isInteger(defaultCap) || defaultCap < 0 || defaultCap > 999) {
      notify('Limite por tamanho deve ser um número inteiro entre 0 e 999.', 'warning');
      return;
    }
    setSaving(true);
    const r = await supplierRequest('/api/admin/fornecedor/config', 'PUT', { settings: { ...form, defaultCap } });
    setSaving(false);
    if (!r.ok) {
      notify((r.body.error as string) ?? 'Não foi possível salvar.', 'warning');
      return;
    }
    notify('Configurações da integração salvas.');
    log('configuracao', 'alterou as configurações da integração com fornecedor');
    await onChanged();
  };

  return (
    <AdminCard title="Sincronização" description="Como a loja recebe as mudanças do fornecedor.">
      <div className="space-y-5 p-5">
        <div className="space-y-1.5">
          <Switch checked={form.autoSync} onChange={(autoSync) => setForm({ ...form, autoSync })} label="Sincronização automática (uma vez por dia, de madrugada)" />
          <p className="pl-14 text-xs text-muted">
            {cronConfigured ? 'Agendamento ativo na Vercel.' : 'Para funcionar, crie a variável CRON_SECRET na Vercel e faça um novo deploy.'}{' '}
            {!cronConfigured && <AdminBadge tone="warn">Pendente</AdminBadge>}
          </p>
        </div>
        <Switch checked={form.approveNew} onChange={(approveNew) => setForm({ ...form, approveNew })} label="Aprovar produtos novos antes de publicar" />
        <Switch checked={form.approvePriceChanges} onChange={(approvePriceChanges) => setForm({ ...form, approvePriceChanges })} label="Aprovar mudanças de preço antes de aplicar" />
        <Field label="Limite de venda por tamanho" hint="O fornecedor informa só se o tamanho está disponível, não a quantidade. A loja vende até este limite e renova quando o fornecedor repõe.">
          {(id, describedBy) => <AdminInput id={id} aria-describedby={describedBy} value={cap} onChange={(e) => setCap(e.target.value)} inputMode="numeric" className="w-28" />}
        </Field>
        <AdminButton onClick={save} loading={saving}>
          Salvar configurações
        </AdminButton>
      </div>
    </AdminCard>
  );
}

function PriceRulesCard({ rules, approve, onChanged }: { rules: PriceRules; approve: boolean; onChanged(): Promise<void> }) {
  const { notify } = useToast();
  const { log } = useAdmin();
  const [form, setForm] = useState<Record<PriceKey, string>>(() => Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, centsToInput(v)])) as Record<PriceKey, string>);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const parsed = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, parsePrice(v)]));
    if (Object.values(parsed).some((v) => !Number.isFinite(v) || v <= 0)) {
      notify('Revise os preços: use valores como 349,90.', 'warning');
      return;
    }
    setSaving(true);
    const r = await supplierRequest('/api/admin/fornecedor/config', 'PUT', { priceRules: parsed });
    setSaving(false);
    if (!r.ok) {
      notify((r.body.error as string) ?? 'Não foi possível salvar.', 'warning');
      return;
    }
    const n = Number(r.body.changes ?? 0);
    notify(n ? (r.body.pending ? `Tabela salva. ${n} preço(s) aguardando aprovação em Alterações pendentes.` : `Tabela salva. ${n} preço(s) atualizado(s).`) : 'Tabela de preços salva.');
    log('configuracao', 'alterou a tabela de preços por tipo de camisa');
    await onChanged();
  };

  return (
    <AdminCard
      title="Tabela de preços"
      description={`O fornecedor não informa preço. Produtos com preço editado à mão não mudam. ${approve ? 'Mudanças vão para aprovação.' : 'Mudanças são aplicadas na hora.'}`}
    >
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {(Object.keys(PRICE_KEY_LABEL) as PriceKey[]).map((key) => (
          <Field key={key} label={PRICE_KEY_LABEL[key]}>
            {(id) => <AdminInput id={id} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} inputMode="decimal" />}
          </Field>
        ))}
        <p className="text-xs leading-relaxed text-warn sm:col-span-2">
          Os links de pagamento da Stripe têm preço fixo. Se mudar um valor aqui, mude também o preço do link na Stripe e no código da loja; enquanto forem diferentes, essas camisas não podem ser pagas.
        </p>
        <div className="sm:col-span-2">
          <AdminButton onClick={save} loading={saving}>
            Salvar tabela de preços
          </AdminButton>
        </div>
      </div>
    </AdminCard>
  );
}
