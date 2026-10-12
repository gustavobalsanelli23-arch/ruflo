'use client';

import { useEffect, useState } from 'react';
import type { ChangeKind, SyncChange, SyncRun } from '@/types/supplier';
import { CHANGE_KIND_LABEL } from '@/types/supplier';
import { EmptyState } from '@/components/ui/Feedback';
import { AdminBadge, AdminButton, AdminCard, AdminModal, AdminTable, AdminTabs } from '../AdminUI';
import { formatWhen, supplierRequest } from './useSupplierAdmin';

const STATE_LABEL: Record<SyncChange['state'], { label: string; tone: 'success' | 'warn' | 'brand' | 'neutral' }> = {
  applied: { label: 'Aplicada', tone: 'success' },
  pending: { label: 'Pendente', tone: 'warn' },
  approved: { label: 'Aprovada', tone: 'brand' },
  rejected: { label: 'Recusada', tone: 'neutral' },
};

/** Histórico de sincronizações e o que cada uma mudou. */
export function HistoryPanel({ runs }: { runs: SyncRun[] }) {
  const [open, setOpen] = useState<SyncRun | null>(null);

  if (!runs.length) {
    return (
      <AdminCard>
        <EmptyState title="Nenhuma sincronização ainda" description='Clique em "Sincronizar agora" para buscar o catálogo do fornecedor.' />
      </AdminCard>
    );
  }

  return (
    <>
      <AdminCard title="Sincronizações" description="As 20 mais recentes. Falhas não alteram o catálogo da loja.">
        <AdminTable head={['Início', 'Origem', 'Situação', 'Encontrados', 'Novos', 'Atualizados', 'Indisponíveis', 'Reposições', 'Pendentes', '']} minWidth={900} caption="Histórico de sincronizações">
          {runs.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap">{formatWhen(r.startedAt)}</td>
              <td className="text-fg-2">{r.trigger === 'cron' ? 'Automática' : 'Manual'}</td>
              <td>
                <AdminBadge tone={r.status === 'ok' ? 'success' : r.status === 'failed' ? 'danger' : 'info'}>
                  {r.status === 'ok' ? 'Concluída' : r.status === 'failed' ? 'Falhou' : 'Em andamento'}
                </AdminBadge>
              </td>
              <td className="tabular-nums">{r.found}</td>
              <td className="tabular-nums">{r.created}</td>
              <td className="tabular-nums">{r.updated}</td>
              <td className="tabular-nums">{r.unavailable}</td>
              <td className="tabular-nums">{r.restocked}</td>
              <td className="tabular-nums">{r.pending}</td>
              <td className="text-right">
                <AdminButton size="sm" variant="ghost" onClick={() => setOpen(r)}>
                  Ver alterações
                </AdminButton>
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>
      {open && <RunChanges run={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function RunChanges({ run, onClose }: { run: SyncRun; onClose(): void }) {
  const [changes, setChanges] = useState<SyncChange[] | null>(null);
  const [kind, setKind] = useState<ChangeKind | 'todas'>('todas');

  useEffect(() => {
    let alive = true;
    void supplierRequest(`/api/admin/fornecedor/alteracoes?runId=${run.id}`, 'GET').then((r) => alive && setChanges(r.ok ? (r.body.changes as SyncChange[]) : []));
    return () => {
      alive = false;
    };
  }, [run.id]);

  const kinds = [...new Set((changes ?? []).map((c) => c.kind))];
  const list = (changes ?? []).filter((c) => kind === 'todas' || c.kind === kind);

  return (
    <AdminModal open onClose={onClose} size="lg" title={`Sincronização de ${formatWhen(run.startedAt)}`} description={run.status === 'failed' ? 'Esta execução falhou e não alterou o catálogo.' : undefined}>
      {run.errors.length > 0 && (
        <ul className="mb-4 space-y-1 text-sm text-fg-2">
          {run.errors.map((e, i) => (
            <li key={i}>• {e}</li>
          ))}
        </ul>
      )}
      {changes === null ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : !changes.length ? (
        <p className="text-sm text-muted">Nenhuma alteração registrada nesta execução.</p>
      ) : (
        <>
          <div className="mb-3">
            <AdminTabs<ChangeKind | 'todas'>
              label="Filtrar por tipo"
              value={kind}
              onChange={setKind}
              tabs={[{ id: 'todas', label: 'Todas', count: changes.length }, ...kinds.map((k) => ({ id: k, label: CHANGE_KIND_LABEL[k], count: changes.filter((c) => c.kind === k).length }))]}
            />
          </div>
          <ul className="max-h-[55vh] divide-y divide-white/[0.05] overflow-y-auto text-sm">
            {list.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-fg">{c.productName}</span>
                  <span className="text-xs text-fg-2">{c.summary}</span>
                </span>
                <AdminBadge tone={STATE_LABEL[c.state].tone}>{STATE_LABEL[c.state].label}</AdminBadge>
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminModal>
  );
}
