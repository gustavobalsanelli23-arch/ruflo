'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, TicketPercent, Trash2 } from 'lucide-react';
import { useStoreData } from '@/context/StoreDataContext';
import { useToast } from '@/context/ToastContext';
import { formatDate, formatPrice, toLocalISO } from '@/lib/format';
import { couponLabel, couponRepository, normalizeCode, type Coupon, type CouponType } from '@/services/coupons/coupon.service';
import { DemoNotice, EmptyState } from '@/components/ui/Feedback';
import { Field, Input, Select, Switch } from '@/components/ui/Form';
import { useAdmin } from './AdminGuard';
import { AdminBadge, AdminButton, AdminCard, AdminConfirm, AdminModal, AdminPageHeader } from './AdminUI';

interface Draft {
  code: string;
  description: string;
  type: CouponType;
  value: string;
  minSubtotal: string;
  maxDiscount: string;
  expiresAt: string;
}

const EMPTY: Draft = { code: '', description: '', type: 'percent', value: '10', minSubtotal: '0', maxDiscount: '', expiresAt: '' };
const toCents = (v: string) => Math.round((Number(v.replace(',', '.')) || 0) * 100);

function couponState(c: Coupon, today: string): { label: string; tone: 'success' | 'neutral' | 'danger' } {
  if (c.expiresAt && today > c.expiresAt) return { label: 'Expirado', tone: 'danger' };
  return c.active ? { label: 'Ativo', tone: 'success' } : { label: 'Pausado', tone: 'neutral' };
}

export function CouponsAdmin() {
  const { orders } = useStoreData();
  const { log } = useAdmin();
  const { notify } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [removing, setRemoving] = useState<Coupon | null>(null);
  const today = toLocalISO().slice(0, 10);

  useEffect(() => setCoupons(couponRepository.list()), []);

  const usage = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    orders.forEach((o) => {
      if (!o.coupon || o.status === 'cancelado') return;
      const u = map.get(o.coupon.code) ?? { count: 0, amount: 0 };
      map.set(o.coupon.code, { count: u.count + 1, amount: u.amount + o.coupon.amount });
    });
    return map;
  }, [orders]);

  const commit = (next: Coupon[]) => {
    setCoupons(next);
    couponRepository.saveAll(next);
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const code = normalizeCode(draft.code);
    const value = draft.type === 'percent' ? Math.floor(Number(draft.value)) : toCents(draft.value);
    const err: typeof errors = {};
    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) err.code = 'Use de 3 a 20 letras, números, - ou _.';
    else if (coupons.some((c) => c.code === code)) err.code = 'Já existe um cupom com esse código.';
    if (draft.type === 'percent' && !(value >= 1 && value <= 100)) err.value = 'Informe um percentual entre 1 e 100.';
    if (draft.type === 'fixed' && value <= 0) err.value = 'Informe um valor maior que zero.';
    if (draft.expiresAt && draft.expiresAt < today) err.expiresAt = 'A validade não pode estar no passado.';
    setErrors(err);
    if (Object.keys(err).length) return;
    const coupon: Coupon = {
      code,
      description: draft.description.trim() || couponLabel({ type: draft.type, value } as Coupon),
      type: draft.type,
      value: draft.type === 'free_shipping' ? 0 : value,
      minSubtotal: toCents(draft.minSubtotal),
      maxDiscount: draft.type === 'percent' && draft.maxDiscount.trim() ? toCents(draft.maxDiscount) : undefined,
      active: true,
      expiresAt: draft.expiresAt || undefined,
      createdAt: today,
    };
    commit([coupon, ...coupons]);
    log('cupom', `criou o cupom ${code} (${couponLabel(coupon)})`);
    notify(`Cupom ${code} criado.`);
    setOpen(false);
    setDraft(EMPTY);
  };

  const toggle = (c: Coupon) => {
    commit(coupons.map((x) => (x.code === c.code ? { ...x, active: !x.active } : x)));
    log('cupom', `${c.active ? 'pausou' : 'ativou'} o cupom ${c.code}`);
  };

  return (
    <>
      <AdminPageHeader
        title="Cupons"
        description={`${coupons.length} ${coupons.length === 1 ? 'cupom' : 'cupons'} de demonstração`}
        actions={
          <AdminButton onClick={() => { setErrors({}); setOpen(true); }}>
            <Plus className="size-4" /> Novo cupom
          </AdminButton>
        }
      />
      <DemoNotice className="mb-6">
        Cupons de demonstração, válidos somente neste navegador. Em produção a validação (limite de uso, validade, cliente) precisa acontecer no servidor — veja <code>services/coupons</code>.
      </DemoNotice>

      <AdminCard>
        {coupons.length === 0 ? (
          <EmptyState className="m-4" icon={<TicketPercent className="size-6" />} title="Nenhum cupom" description="Crie um cupom para testar o checkout." />
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {coupons.map((c) => {
              const state = couponState(c, today);
              const used = usage.get(c.code);
              return (
                <li key={c.code} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-sm font-bold">{c.code}</span>
                      <AdminBadge tone={state.tone}>{state.label}</AdminBadge>
                    </p>
                    <p className="mt-1.5 text-sm text-fg-2">
                      {couponLabel(c)}
                      {c.maxDiscount ? ` (até ${formatPrice(c.maxDiscount)})` : ''}
                      {c.minSubtotal ? ` · pedidos a partir de ${formatPrice(c.minSubtotal)}` : ''}
                    </p>
                    <p className="text-xs text-muted">
                      {c.description} · {c.expiresAt ? `válido até ${formatDate(c.expiresAt)}` : 'sem validade'} · {used ? `${used.count} ${used.count === 1 ? 'uso' : 'usos'}, ${formatPrice(used.amount)} em descontos` : 'nenhum uso'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={c.active} onChange={() => toggle(c)} label={<span className="sr-only">{c.active ? 'Pausar' : 'Ativar'} {c.code}</span>} />
                    <AdminButton size="sm" variant="ghost" onClick={() => setRemoving(c)} aria-label={`Excluir ${c.code}`}>
                      <Trash2 className="size-4" />
                    </AdminButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>

      <AdminModal open={open} onClose={() => setOpen(false)} title="Novo cupom" description="Fica disponível no checkout deste navegador.">
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <Field label="Código" error={errors.code} required>
            {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.code} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="EX.: TORCIDA15" className="font-mono uppercase" />}
          </Field>
          <Field label="Tipo">
            {(id) => (
              <Select id={id} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as CouponType })}>
                <option value="percent">Percentual</option>
                <option value="fixed">Valor fixo</option>
                <option value="free_shipping">Frete grátis</option>
              </Select>
            )}
          </Field>
          {draft.type !== 'free_shipping' && (
            <Field label={draft.type === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'} error={errors.value} required>
              {(id, d) => <Input id={id} aria-describedby={d} type="number" min={0} step={draft.type === 'percent' ? 1 : 0.01} value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />}
            </Field>
          )}
          {draft.type === 'percent' && (
            <Field label="Desconto máximo (R$)" hint="Opcional.">
              {(id, d) => <Input id={id} aria-describedby={d} type="number" min={0} step="0.01" value={draft.maxDiscount} onChange={(e) => setDraft({ ...draft, maxDiscount: e.target.value })} />}
            </Field>
          )}
          <Field label="Pedido mínimo (R$)">
            {(id) => <Input id={id} type="number" min={0} step="0.01" value={draft.minSubtotal} onChange={(e) => setDraft({ ...draft, minSubtotal: e.target.value })} />}
          </Field>
          <Field label="Válido até" error={errors.expiresAt} hint="Opcional.">
            {(id, d) => <Input id={id} aria-describedby={d} type="date" min={today} value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} />}
          </Field>
          <Field label="Descrição interna" className="sm:col-span-2">
            {(id) => <Input id={id} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Ex.: campanha de lançamento" maxLength={80} />}
          </Field>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <AdminButton type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</AdminButton>
            <AdminButton type="submit">Criar cupom</AdminButton>
          </div>
        </form>
      </AdminModal>

      <AdminConfirm
        open={!!removing}
        title={`Excluir o cupom ${removing?.code ?? ''}?`}
        description="Clientes não poderão mais usá-lo. Pedidos já feitos mantêm o desconto."
        confirmLabel="Excluir"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          commit(coupons.filter((c) => c.code !== removing.code));
          log('cupom', `excluiu o cupom ${removing.code}`);
          notify(`Cupom ${removing.code} excluído.`, 'info');
          setRemoving(null);
        }}
      />
    </>
  );
}
