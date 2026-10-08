'use client';

import { useEffect, useState } from 'react';
import { KeyRound, LogOut, Monitor, RotateCcw, ShieldCheck } from 'lucide-react';
import { useStoreData } from '@/context/StoreDataContext';
import { useToast } from '@/context/ToastContext';
import { formatDateTime } from '@/lib/format';
import type { StoreSettings } from '@/services/repositories';
import { DemoNotice } from '@/components/ui/Feedback';
import { Field, Input, Switch } from '@/components/ui/Form';
import { useAdmin } from './AdminGuard';
import { ActivityFeed } from './ActivityFeed';
import { AdminAvatar, AdminBadge, AdminButton, AdminCard, AdminConfirm, AdminPageHeader, AdminTabs } from './AdminUI';

type Tab = 'perfil' | 'seguranca' | 'preferencias';

export function SettingsAdmin() {
  const [tab, setTab] = useState<Tab>('perfil');
  return (
    <>
      <AdminPageHeader title="Configurações" description="Sua conta de administrador e as preferências da loja." />
      <div className="mb-6">
        <AdminTabs<Tab>
          label="Seções das configurações"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'perfil', label: 'Perfil' },
            { id: 'seguranca', label: 'Segurança' },
            { id: 'preferencias', label: 'Preferências' },
          ]}
        />
      </div>
      {tab === 'perfil' && <ProfileSection />}
      {tab === 'seguranca' && <SecuritySection />}
      {tab === 'preferencias' && <PreferencesSection />}
    </>
  );
}

function ProfileSection() {
  const { session } = useAdmin();
  const { admin } = session;
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <AdminCard title="Perfil" description="Dados da sua conta de administrador">
        <div className="space-y-5 p-5">
          <div className="flex items-center gap-4">
            <AdminAvatar initials={admin.initials} className="size-16 text-lg" />
            <div>
              <p className="text-lg font-bold text-fg">{admin.name}</p>
              <AdminBadge tone="brand">Administrador</AdminBadge>
            </div>
          </div>
          <Field label="Nome">{(id) => <Input id={id} value={admin.name} readOnly disabled />}</Field>
          <Field label="E-mail">{(id) => <Input id={id} value={admin.email} readOnly disabled />}</Field>
          <Field label="Foto / avatar" hint="O avatar usa suas iniciais. Upload de foto chega junto com o banco de dados.">
            {(id, d) => <Input id={id} aria-describedby={d} value="Iniciais automáticas" readOnly disabled />}
          </Field>
        </div>
      </AdminCard>
      <AdminCard title="Como alterar estes dados">
        <div className="space-y-3 p-5 text-sm text-fg-2">
          <p>Nome e e-mail ficam guardados com segurança no servidor (variáveis de ambiente), e não neste navegador.</p>
          <p>
            Para alterar, atualize <code className="text-brand-300">FUTZONE_ADMIN_{admin.id.split('-')[1]}_NAME</code> ou <code className="text-brand-300">FUTZONE_ADMIN_{admin.id.split('-')[1]}_EMAIL</code> na Vercel e faça um novo deploy.
          </p>
        </div>
      </AdminCard>
    </div>
  );
}

function deviceLabel() {
  if (typeof navigator === 'undefined') return 'Este dispositivo';
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return [browser, os].filter(Boolean).join(' · ');
}

function SecuritySection() {
  const { session, previousAccess, logout, loggingOut } = useAdmin();
  const [device, setDevice] = useState('Este dispositivo');
  useEffect(() => setDevice(deviceLabel()), []);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <AdminCard title="Alterar senha" description="Disponível quando a autenticação estiver ligada a um banco de dados">
          <form className="space-y-4 p-5" onSubmit={(e) => e.preventDefault()} aria-describedby="pw-note">
            <Field label="Senha atual">{(id) => <Input id={id} type="password" disabled autoComplete="current-password" />}</Field>
            <Field label="Nova senha">{(id) => <Input id={id} type="password" disabled autoComplete="new-password" />}</Field>
            <AdminButton type="submit" disabled>
              <KeyRound className="size-4" /> Alterar senha
            </AdminButton>
            <p id="pw-note" className="text-xs text-muted">
              Hoje a senha é definida pelo hash em <code className="text-brand-300">FUTZONE_ADMIN_{session.admin.id.split('-')[1]}_PASSWORD_HASH</code>. Para trocar, gere um novo hash e atualize a variável na Vercel.
            </p>
          </form>
        </AdminCard>
        <AdminCard title="Registro de atividades" description="Ações administrativas neste navegador">
          <div className="max-h-96 overflow-y-auto">
            <ActivityFeed limit={50} />
          </div>
        </AdminCard>
      </div>

      <AdminCard title="Sessões" description="Sessões expiram automaticamente após 8 horas">
        <ul className="divide-y divide-white/[0.05]">
          <li className="flex items-start gap-3 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-500/12 text-brand-400">
              <Monitor className="size-5" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-fg">{device}</p>
                <AdminBadge tone="success">Sessão atual</AdminBadge>
              </div>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                <dt className="text-muted">Iniciada</dt>
                <dd className="text-fg-2">{formatDateTime(session.issuedAt)}</dd>
                <dt className="text-muted">Expira</dt>
                <dd className="text-fg-2">{formatDateTime(session.expiresAt)}</dd>
                <dt className="text-muted">Último acesso</dt>
                <dd className="text-fg-2">{previousAccess ? formatDateTime(previousAccess) : 'Primeiro acesso neste navegador'}</dd>
                <dt className="text-muted">ID</dt>
                <dd className="font-mono text-fg-2">{session.sessionId.slice(0, 8)}…</dd>
              </dl>
            </div>
          </li>
        </ul>
        <div className="space-y-4 border-t border-white/[0.06] p-5">
          <AdminButton variant="outline" onClick={logout} loading={loggingOut}>
            {!loggingOut && <LogOut className="size-4" />} Encerrar esta sessão
          </AdminButton>
          <p className="flex items-start gap-2 text-xs text-muted">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand-400" />
            <span>
              Suspeita de acesso indevido? Altere <code className="text-brand-300">FUTZONE_ADMIN_SESSION_VERSION</code> na Vercel: todas as sessões abertas são encerradas no próximo acesso.
            </span>
          </p>
        </div>
      </AdminCard>
    </div>
  );
}

function PreferencesSection() {
  const { settings, saveSettings, resetDemoData } = useStoreData();
  const { log } = useAdmin();
  const { notify } = useToast();
  const [form, setForm] = useState<StoreSettings>(settings);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => setForm(settings), [settings]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const threshold = Math.max(1, Math.min(100, Math.floor(Number(form.lowStockThreshold)) || 1));
    saveSettings({ ...form, lowStockThreshold: threshold });
    log('configuracao', 'atualizou as preferências da loja');
    notify('Preferências salvas.');
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <AdminCard title="Loja">
        <form onSubmit={submit} className="space-y-5 p-5">
          <Field label="Nome da loja">{(id) => <Input id={id} value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />}</Field>
          <Field label="E-mail de contato">{(id) => <Input id={id} type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />}</Field>
          <Field label="Limite de estoque baixo" hint="Produtos com total de unidades igual ou abaixo deste valor são destacados.">
            {(id, d) => <Input id={id} aria-describedby={d} type="number" min={1} max={100} value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} />}
          </Field>
          <Switch checked={form.showDemoNotice} onChange={(showDemoNotice) => setForm({ ...form, showDemoNotice })} label="Exibir selo “Dados simulados” no painel" />
          <Switch checked={form.allowGuestCheckout} onChange={(allowGuestCheckout) => setForm({ ...form, allowGuestCheckout })} label="Permitir compra sem cadastro (visitante)" />
          <div className="flex justify-end">
            <AdminButton type="submit">Salvar preferências</AdminButton>
          </div>
        </form>
      </AdminCard>

      <div className="space-y-6">
        <AdminCard title="Integrações futuras">
          <ul className="divide-y divide-white/[0.05] text-sm">
            {[
              ['Autenticação com banco de dados', 'lib/auth → trocar a fonte das contas'],
              ['Gateway de pagamento', 'services/contracts.ts → PaymentGateway (provedor a definir)'],
              ['Contas de clientes no servidor', 'services/auth → CustomerAuthProvider'],
              ['Frete real (Correios, Melhor Envio ou Frenet)', 'services/shipping/providers → ShippingProvider'],
              ['Consulta de CEP', 'services/address/cep.service.ts → CepProvider'],
              ['E-mails transacionais', 'services/notifications → NotificationChannel'],
              ['API do fornecedor (catálogo e estoque)', 'services/contracts.ts → SupplierCatalogClient'],
              ['Banco de dados', 'services/repositories.ts → trocar implementações locais'],
            ].map(([name, where]) => (
              <li key={name} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
                <span>
                  <span className="block font-semibold">{name}</span>
                  <span className="text-xs text-muted">{where}</span>
                </span>
                <AdminBadge tone="neutral" dot={false}>Não configurado</AdminBadge>
              </li>
            ))}
          </ul>
        </AdminCard>
        <AdminCard title="Dados de demonstração">
          <div className="space-y-4 p-5">
            <DemoNotice>Produtos, pedidos e clientes de exemplo ficam salvos neste navegador. Restaurar descarta as alterações locais.</DemoNotice>
            <AdminButton variant="danger" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="size-4" /> Restaurar dados de exemplo
            </AdminButton>
          </div>
        </AdminCard>
      </div>

      <AdminConfirm
        open={confirmReset}
        title="Restaurar dados de exemplo?"
        description="Todas as alterações locais em produtos, estoque, pedidos e clientes serão descartadas."
        confirmLabel="Restaurar"
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          setConfirmReset(false);
          await resetDemoData();
          log('configuracao', 'restaurou os dados de exemplo');
          notify('Dados de exemplo restaurados.', 'info');
        }}
      />
    </div>
  );
}
