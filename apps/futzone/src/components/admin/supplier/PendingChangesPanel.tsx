'use client';

import { useState } from 'react';
import type { SyncChange } from '@/types/supplier';
import { CHANGE_KIND_LABEL } from '@/types/supplier';
import { useToast } from '@/context/ToastContext';
import { EmptyState } from '@/components/ui/Feedback';
import { AdminBadge, AdminButton, AdminCard, AdminTable } from '../AdminUI';
import { useAdmin } from '../AdminGuard';
import { formatWhen, supplierRequest } from './useSupplierAdmin';

/** Mudanças de preço (pela tabela) e de fotos (trocadas pelo fornecedor) aguardando decisão. */
export function PendingChangesPanel({ changes, onChanged }: { changes: SyncChange[]; onChanged(): Promise<void> }) {
  const { notify } = useToast();
  const { log } = useAdmin();
  const [busy, setBusy] = useState<number | null>(null);

  if (!changes.length) {
    return (
      <AdminCard>
        <EmptyState title="Nenhuma alteração pendente" description="Mudanças de preço e troca de fotos que pedem aprovação aparecem aqui." />
      </AdminCard>
    );
  }

  const decide = async (c: SyncChange, action: 'approve' | 'reject') => {
    setBusy(c.id);
    const r = await supplierRequest('/api/admin/fornecedor/decisao', 'POST', { action, changeId: c.id });
    setBusy(null);
    if (!r.ok) {
      notify((r.body.error as string) ?? 'Não foi possível concluir.', 'warning');
      return;
    }
    notify(action === 'approve' ? `Alteração aplicada em "${c.productName}".` : `Alteração recusada: "${c.productName}" mantém o valor atual.`, action === 'approve' ? 'success' : 'info');
    log('produto', `${action === 'approve' ? 'aprovou' : 'recusou'} ${CHANGE_KIND_LABEL[c.kind].toLowerCase()} de "${c.productName}"`);
    await onChanged();
  };

  return (
    <AdminCard title={`${changes.length} alteração(ões) aguardando decisão`} description="Recusar mantém o valor atual como escolha manual: a sincronização não volta a propor a mesma mudança.">
      <AdminTable head={['Produto', 'Tipo', 'Alteração', 'Encontrada em', '']} minWidth={760} caption="Alterações pendentes">
        {changes.map((c) => (
          <tr key={c.id}>
            <td className="max-w-[16rem] truncate font-semibold text-fg">{c.productName}</td>
            <td>
              <AdminBadge tone={c.kind === 'preco' ? 'brand' : 'info'}>{CHANGE_KIND_LABEL[c.kind]}</AdminBadge>
            </td>
            <td className="text-fg-2">
              {c.summary}
              {c.kind === 'fotos' && Array.isArray(c.after) && (
                <span className="mt-2 flex gap-1.5">
                  {(c.after as string[]).slice(0, 3).map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-[3/4] w-10 rounded object-cover" />
                  ))}
                </span>
              )}
            </td>
            <td className="whitespace-nowrap text-xs text-muted">{formatWhen(c.createdAt)}</td>
            <td>
              <div className="flex justify-end gap-1.5">
                <AdminButton size="sm" onClick={() => decide(c, 'approve')} loading={busy === c.id} disabled={busy !== null}>
                  Aprovar
                </AdminButton>
                <AdminButton size="sm" variant="ghost" onClick={() => decide(c, 'reject')} disabled={busy !== null}>
                  Recusar
                </AdminButton>
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>
    </AdminCard>
  );
}
