'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RotateCcw, Search } from 'lucide-react';
import { categories } from '@/data/categories';
import { teams } from '@/data/teams';
import { useStoreData } from '@/context/StoreDataContext';
import { useToast } from '@/context/ToastContext';
import { formatDate, formatPrice } from '@/lib/format';
import { isOnSale } from '@/lib/product';
import type { StoreSettings } from '@/services/repositories';
import { Button } from '@/components/ui/Button';
import { DemoNotice } from '@/components/ui/Feedback';
import { Field, Input, Switch } from '@/components/ui/Form';
import { ConfirmDialog } from '@/components/ui/Modal';
import { CategoryArt } from '@/components/brand/CategoryArt';
import { AdminPageHeader, AdminTable, Panel } from './AdminUI';

export function CustomersAdmin() {
  const { customers, orders } = useStoreData();
  const [q, setQ] = useState('');
  const list = customers.filter((c) => `${c.name} ${c.email} ${c.city}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <AdminPageHeader title="Clientes" description={`${customers.length} clientes simulados`} />
      <Panel>
        <div className="border-b border-line p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail ou cidade" aria-label="Buscar clientes" className="h-11 w-full rounded-xl border border-line bg-surface-2 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none" />
          </div>
        </div>
        <AdminTable head={['Cliente', 'Contato', 'Cidade', 'Pedidos', 'Total gasto', 'Cliente desde']} minWidth={820}>
          {list.map((c) => {
            const mine = orders.filter((o) => o.customerId === c.id);
            const spent = mine.filter((o) => o.status !== 'cancelado').reduce((n, o) => n + o.total, 0);
            return (
              <tr key={c.id} className="hover:bg-surface-2/50">
                <td>
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500/15 text-xs font-bold text-brand-300">
                      {c.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </span>
                    <span className="font-semibold">{c.name}</span>
                  </div>
                </td>
                <td className="text-fg-2"><span className="block">{c.email}</span><span className="text-xs text-muted">{c.phone}</span></td>
                <td className="text-fg-2">{c.city}/{c.state}</td>
                <td className="font-bold tabular-nums">{mine.length}</td>
                <td className="tabular-nums">{formatPrice(spent)}</td>
                <td className="text-muted">{formatDate(c.createdAt)}</td>
              </tr>
            );
          })}
        </AdminTable>
      </Panel>
    </>
  );
}

export function CategoriesAdmin() {
  const { products } = useStoreData();
  return (
    <>
      <AdminPageHeader title="Categorias" description="Categorias e times são definidos em src/data — novos itens aparecem automaticamente na loja." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((c) => {
          const items = products.filter((p) => p.category === c.id);
          return (
            <Panel key={c.id} className="overflow-hidden">
              <div className="grid h-36 place-items-center border-b border-line bg-[radial-gradient(80%_80%_at_50%_100%,color-mix(in_oklab,var(--color-brand-500)_20%,transparent),transparent)]">
                <CategoryArt id={c.id} />
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <h2 className="heading-display text-2xl">{c.name}</h2>
                  <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-bold text-brand-300">{items.length}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{c.description}</p>
                <p className="mt-3 text-xs text-fg-2">
                  {items.filter((p) => p.status === 'published').length} publicados · {items.filter(isOnSale).length} em promoção
                </p>
                <Link href={c.href} className="mt-4 inline-block text-xs font-bold uppercase tracking-wider text-brand-400 hover:text-brand-300">Ver na loja →</Link>
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel title={`Times (${teams.length})`} className="mt-6">
        <AdminTable head={['Time', 'Tipo', 'País', 'Produtos']} minWidth={520}>
          {teams.map((t) => (
            <tr key={t.id} className="hover:bg-surface-2/50">
              <td>
                <span className="flex items-center gap-3">
                  <span className="size-6 rounded-md ring-1 ring-white/10" style={{ background: `linear-gradient(135deg, ${t.colors.primary} 0 55%, ${t.colors.secondary} 55%)` }} aria-hidden />
                  <span className="font-semibold">{t.name}</span>
                </span>
              </td>
              <td className="text-fg-2">{t.kind === 'clube' ? 'Clube' : 'Seleção'}</td>
              <td className="text-fg-2">{t.country}</td>
              <td className="font-bold tabular-nums">{products.filter((p) => p.teamId === t.id).length}</td>
            </tr>
          ))}
        </AdminTable>
      </Panel>
    </>
  );
}

export function SettingsAdmin() {
  const { settings, saveSettings, resetDemoData } = useStoreData();
  const { notify } = useToast();
  const [form, setForm] = useState<StoreSettings>(settings);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => setForm(settings), [settings]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const threshold = Math.max(1, Math.min(100, Math.floor(Number(form.lowStockThreshold)) || 1));
    saveSettings({ ...form, lowStockThreshold: threshold });
    notify('Configurações salvas.');
  };

  return (
    <>
      <AdminPageHeader title="Configurações" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Loja">
          <form onSubmit={submit} className="space-y-5 p-5">
            <Field label="Nome da loja">
              {(id) => <Input id={id} value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />}
            </Field>
            <Field label="E-mail de contato">
              {(id) => <Input id={id} type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />}
            </Field>
            <Field label="Limite de estoque baixo" hint="Produtos com total de unidades igual ou abaixo deste valor são destacados.">
              {(id, d) => <Input id={id} aria-describedby={d} type="number" min={1} max={100} value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} />}
            </Field>
            <Switch checked={form.showDemoNotice} onChange={(showDemoNotice) => setForm({ ...form, showDemoNotice })} label="Exibir selo “Dados simulados” no painel" />
            <div className="flex justify-end"><Button type="submit">Salvar configurações</Button></div>
          </form>
        </Panel>

        <div className="space-y-6">
          <Panel title="Integrações futuras">
            <ul className="divide-y divide-line text-sm">
              {[
                ['Pagamentos (Mercado Pago)', 'services/contracts.ts → PaymentGateway'],
                ['Checkout e frete', 'services/contracts.ts → CheckoutService'],
                ['API do fornecedor', 'services/contracts.ts → SupplierCatalogClient'],
                ['Banco de dados', 'services/repositories.ts → trocar implementações locais'],
              ].map(([name, where]) => (
                <li key={name} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                  <span>
                    <span className="block font-semibold">{name}</span>
                    <span className="text-xs text-muted">{where}</span>
                  </span>
                  <span className="rounded-full bg-surface-3 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted">Não configurado</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Dados de demonstração">
            <div className="space-y-4 p-5">
              <DemoNotice>Produtos, pedidos e dados do cliente ficam salvos no navegador (localStorage). Restaurar descarta as alterações locais e volta ao catálogo inicial.</DemoNotice>
              <Button variant="danger" onClick={() => setConfirmReset(true)}>
                <RotateCcw className="size-4" /> Restaurar dados de exemplo
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Restaurar dados de exemplo?"
        description="Todas as alterações locais em produtos, estoque, pedidos e dados do cliente serão descartadas."
        confirmLabel="Restaurar"
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          setConfirmReset(false);
          await resetDemoData();
          notify('Dados de exemplo restaurados.', 'info');
        }}
      />
    </>
  );
}
