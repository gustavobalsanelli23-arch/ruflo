'use client';

import { useState } from 'react';
import { AlertTriangle, CircleCheck, CircleX, Clock, PackagePlus, PackageX, RefreshCw, Shuffle } from 'lucide-react';
import { useStoreData } from '@/context/StoreDataContext';
import { useToast } from '@/context/ToastContext';
import { AdminButton, AdminCard, AdminPageHeader, AdminStats, AdminTabs } from '../AdminUI';
import { useAdmin } from '../AdminGuard';
import { formatWhenShort, supplierRequest, useSupplierOverview } from './useSupplierAdmin';
import { ReviewPanel } from './ReviewPanel';
import { PendingChangesPanel } from './PendingChangesPanel';
import { HistoryPanel } from './HistoryPanel';
import { TeamsPanel } from './TeamsPanel';
import { SettingsPanel } from './SettingsPanel';

type Tab = 'novos' | 'alteracoes' | 'historico' | 'times' | 'config';

/**
 * Integração com fornecedor: status da conexão, sincronização sob demanda,
 * aprovação de produtos novos e de mudanças, histórico e configurações.
 */
export function SupplierAdmin() {
  const { data, loading, reload } = useSupplierOverview();
  const { refreshCatalog } = useStoreData();
  const { notify } = useToast();
  const { log } = useAdmin();
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<Tab>('novos');

  const afterChange = async () => {
    await reload();
    await refreshCatalog({ admin: true });
  };

  const syncNow = async () => {
    setSyncing(true);
    const r = await supplierRequest('/api/admin/fornecedor/sync', 'POST');
    setSyncing(false);
    if (r.ok) {
      const c = r.body.counts as Record<string, number>;
      notify(`Sincronizado: ${c.created} novos, ${c.updated} atualizados, ${c.unavailable} indisponíveis, ${c.restocked} reposições.`);
      log('produto', `sincronizou o catálogo do fornecedor (${c.found} produtos encontrados)`);
    } else {
      const errors = r.body.errors as string[] | undefined;
      notify(errors?.[0] ?? (r.body.error as string) ?? 'A sincronização falhou. O catálogo não foi alterado.', 'warning');
    }
    await afterChange();
  };

  if (loading || !data) {
    return (
      <>
        <AdminPageHeader title="Integração com fornecedor" description="Carregando…" />
      </>
    );
  }

  if (!data.database) {
    return (
      <>
        <AdminPageHeader title="Integração com fornecedor" description="Catálogo do fornecedor (catalogopro) sincronizado com a loja" />
        <AdminCard title="Banco de dados não configurado">
          <div className="space-y-3 p-5 text-sm text-fg-2">
            <p>A sincronização e o controle de estoque precisam do banco de dados da loja. Enquanto ele não existe, a loja usa o catálogo atual do arquivo, sem alterações.</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Na Vercel, abra o projeto e vá em Storage, Create Database, Neon (Postgres).</li>
              <li>Conecte o banco a este projeto (a variável DATABASE_URL é criada sozinha).</li>
              <li>Em Settings, Environment Variables, crie CRON_SECRET com um valor longo e aleatório.</li>
              <li>Faça um novo deploy e volte aqui para clicar em Sincronizar agora.</li>
            </ol>
          </div>
        </AdminCard>
      </>
    );
  }

  if (data.error || !data.status) {
    return (
      <>
        <AdminPageHeader title="Integração com fornecedor" />
        <AdminCard title="Não foi possível carregar">
          <p className="p-5 text-sm text-fg-2">{data.error ?? 'Tente novamente em instantes.'}</p>
        </AdminCard>
      </>
    );
  }

  const { status } = data;
  const last = status.lastRun;
  const reachable = status.supplierReachable;
  const review = data.review ?? [];
  const pending = data.pendingChanges ?? [];
  const unmapped = (data.teams ?? []).filter((t) => !t.teamId && t.models > 0);

  return (
    <>
      <AdminPageHeader
        title="Integração com fornecedor"
        description="Catálogo do fornecedor (catalogopro) sincronizado com a loja. A loja nunca consulta o fornecedor durante as visitas."
        actions={
          <AdminButton onClick={syncNow} loading={syncing}>
            {!syncing && <RefreshCw className="size-4" aria-hidden />} Sincronizar agora
          </AdminButton>
        }
      />

      <p className="mb-2 text-xs text-muted">Números da última sincronização{last?.trigger === 'cron' ? ' (automática)' : ''}.</p>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <AdminStats
          label="Conexão"
          value={reachable === null ? 'Sem dados' : reachable ? 'Ok' : 'Falhou'}
          hint={reachable === false ? 'Último catálogo válido mantido' : 'Fornecedor catalogopro'}
          icon={reachable === false ? CircleX : CircleCheck}
          tone={reachable === false ? 'danger' : reachable ? 'success' : 'neutral'}
        />
        <AdminStats label="Última sincronização" value={formatWhenShort(last?.startedAt)} hint={`Último sucesso: ${formatWhenShort(status.lastSuccessAt)}`} icon={Clock} tone="neutral" />
        <AdminStats label="Encontrados" value={String(last?.found ?? 0)} hint={`${status.counts.supplierLinked} vinculados na loja`} icon={Shuffle} tone="brand" />
        <AdminStats label="Novos" value={String(last?.created ?? 0)} hint={`${status.counts.pendingReview} aguardando aprovação`} icon={PackagePlus} tone="brand" />
        <AdminStats label="Atualizados" value={String(last?.updated ?? 0)} hint={`${last?.restocked ?? 0} reposições`} icon={RefreshCw} tone="success" />
        <AdminStats label="Indisponíveis" value={String(last?.unavailable ?? 0)} hint={`${status.counts.unavailable} sem estoque no total`} icon={PackageX} tone="warn" />
      </div>

      {last && last.errors.length > 0 && (
        <AdminCard className="mb-4" title={last.status === 'failed' ? 'A última sincronização falhou' : 'Avisos da última sincronização'}>
          <ul className="space-y-1.5 p-5 text-sm text-fg-2">
            {last.errors.slice(0, 8).map((e, i) => (
              <li key={i} className="flex gap-2">
                <AlertTriangle className={last.status === 'failed' ? 'mt-0.5 size-4 shrink-0 text-danger' : 'mt-0.5 size-4 shrink-0 text-warn'} aria-hidden />
                {e}
              </li>
            ))}
            {last.errors.length > 8 && <li className="text-muted">E mais {last.errors.length - 8} aviso(s) no histórico.</li>}
          </ul>
        </AdminCard>
      )}

      <div className="mb-4">
        <AdminTabs<Tab>
          label="Seções da integração"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'novos', label: 'Aprovar novos', count: review.length },
            { id: 'alteracoes', label: 'Alterações pendentes', count: pending.length },
            { id: 'historico', label: 'Histórico' },
            { id: 'times', label: 'Times do fornecedor', count: unmapped.length || undefined },
            { id: 'config', label: 'Configurações' },
          ]}
        />
      </div>

      {tab === 'novos' && <ReviewPanel items={review} onChanged={afterChange} />}
      {tab === 'alteracoes' && <PendingChangesPanel changes={pending} onChanged={afterChange} />}
      {tab === 'historico' && <HistoryPanel runs={data.runs ?? []} />}
      {tab === 'times' && <TeamsPanel teams={data.teams ?? []} onChanged={reload} />}
      {tab === 'config' && <SettingsPanel status={status} onChanged={afterChange} />}
    </>
  );
}
