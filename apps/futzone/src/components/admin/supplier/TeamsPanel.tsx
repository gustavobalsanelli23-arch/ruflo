'use client';

import { useMemo, useState } from 'react';
import type { TeamMapRow } from '@/types/supplier';
import { teams as storeTeams } from '@/data/teams';
import { useToast } from '@/context/ToastContext';
import { EmptyState } from '@/components/ui/Feedback';
import { AdminBadge, AdminCard, AdminSelect, AdminTable } from '../AdminUI';
import { supplierRequest } from './useSupplierAdmin';

/**
 * Times do fornecedor ligados aos times da loja. Produtos de um time sem
 * correspondência ficam fora da loja (revisão manual) até o time ser ligado.
 */
export function TeamsPanel({ teams, onChanged }: { teams: TeamMapRow[]; onChanged(): Promise<void> }) {
  const { notify } = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const sorted = useMemo(() => [...teams].sort((a, b) => Number(!!a.teamId) - Number(!!b.teamId) || b.models - a.models || a.supplierName.localeCompare(b.supplierName)), [teams]);
  const options = useMemo(() => [...storeTeams].sort((a, b) => a.name.localeCompare(b.name)), []);

  if (!teams.length) {
    return (
      <AdminCard>
        <EmptyState title="Nenhum time lido ainda" description="Os times aparecem depois da primeira sincronização." />
      </AdminCard>
    );
  }

  const save = async (row: TeamMapRow, teamId: string) => {
    setSaving(row.supplierTeamId);
    const r = await supplierRequest('/api/admin/fornecedor/times', 'PUT', { supplierTeamId: row.supplierTeamId, teamId: teamId || null });
    setSaving(null);
    if (!r.ok) {
      notify((r.body.error as string) ?? 'Não foi possível salvar.', 'warning');
      return;
    }
    notify(teamId ? `"${row.supplierName}" ligado. Os produtos entram na próxima sincronização.` : `"${row.supplierName}" desligado.`, 'info');
    await onChanged();
  };

  return (
    <AdminCard
      title="Times do fornecedor"
      description="Ligados automaticamente pelo nome. Se um time não existe na loja, os produtos dele aguardam aqui. Para um time novo, cadastre-o no catálogo da loja (src/data/teams.ts)."
    >
      <AdminTable head={['Time no fornecedor', 'Time na loja', 'Situação']} minWidth={560} caption="Times do fornecedor">
        {sorted.map((row) => (
          <tr key={row.supplierTeamId}>
            <td className="font-semibold text-fg">{row.supplierName}</td>
            <td>
              <AdminSelect
                value={row.teamId ?? ''}
                disabled={saving === row.supplierTeamId}
                onChange={(e) => save(row, e.target.value)}
                aria-label={`Time da loja para ${row.supplierName}`}
                className="h-9 w-56"
              >
                <option value="">Sem correspondência</option>
                {options.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </AdminSelect>
            </td>
            <td>
              {row.teamId ? (
                <AdminBadge tone="success">Ligado</AdminBadge>
              ) : row.models > 0 ? (
                <AdminBadge tone="warn">{row.models} produto(s) aguardando</AdminBadge>
              ) : (
                <AdminBadge tone="neutral">Sem produtos ativos</AdminBadge>
              )}
            </td>
          </tr>
        ))}
      </AdminTable>
    </AdminCard>
  );
}
