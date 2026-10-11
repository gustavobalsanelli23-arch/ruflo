'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { ReviewItem } from '@/types/supplier';
import { teamById } from '@/lib/product';
import { centsToInput, formatPrice, parsePrice } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import { EmptyState } from '@/components/ui/Feedback';
import { AdminBadge, AdminButton, AdminCard, AdminInput } from '../AdminUI';
import { useAdmin } from '../AdminGuard';
import { supplierRequest } from './useSupplierAdmin';

/** Produtos novos do fornecedor aguardando aprovação antes de aparecer na loja. */
export function ReviewPanel({ items, onChanged }: { items: ReviewItem[]; onChanged(): Promise<void> }) {
  if (!items.length) {
    return (
      <AdminCard>
        <EmptyState title="Nenhum produto aguardando aprovação" description="Produtos novos do fornecedor aparecem aqui depois de cada sincronização." />
      </AdminCard>
    );
  }
  return (
    <AdminCard title={`${items.length} produto(s) novo(s) do fornecedor`} description="Confira foto, time e preço. Só os aprovados aparecem na loja; as fotos são copiadas para a FutZone na aprovação.">
      <ul className="divide-y divide-white/[0.05]">
        {items.map((item) => (
          <ReviewRow key={item.productId} item={item} onChanged={onChanged} />
        ))}
      </ul>
    </AdminCard>
  );
}

function ReviewRow({ item, onChanged }: { item: ReviewItem; onChanged(): Promise<void> }) {
  const { notify } = useToast();
  const { log } = useAdmin();
  const [price, setPrice] = useState(centsToInput(item.price));
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const team = teamById(item.teamId);
  const photo = item.supplierPhotos[0];

  const decide = async (action: 'approve' | 'reject') => {
    const cents = parsePrice(price);
    if (action === 'approve' && (!Number.isFinite(cents) || cents <= 0)) {
      notify('Preço inválido. Ex.: 349,90', 'warning');
      return;
    }
    setBusy(action);
    const r = await supplierRequest('/api/admin/fornecedor/decisao', 'POST', {
      action,
      productId: item.productId,
      price: action === 'approve' && cents !== item.price ? cents : undefined,
    });
    setBusy(null);
    if (!r.ok) {
      notify((r.body.error as string) ?? 'Não foi possível concluir.', 'warning');
      return;
    }
    const warnings = (r.body.warnings as string[] | undefined) ?? [];
    if (action === 'approve') {
      notify(warnings.length ? `"${item.name}" publicado, mas: ${warnings[0]}` : `"${item.name}" publicado na loja.`, warnings.length ? 'warning' : 'success');
      log('produto', `aprovou o produto do fornecedor "${item.name}"`);
    } else {
      notify(`"${item.name}" rejeitado. Ele não volta a ser proposto.`, 'info');
      log('produto', `rejeitou o produto do fornecedor "${item.name}"`);
    }
    await onChanged();
  };

  return (
    <li className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
          {photo ? (
            // Prévia só no painel: a loja nunca usa o endereço do fornecedor.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full place-items-center text-[0.65rem] text-muted">Sem foto</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-fg">{item.name}</p>
          <p className="mt-0.5 text-xs text-muted">
            {team?.name ?? item.teamId} · {item.availableSizes.length ? `Disponível: ${item.availableSizes.join(', ')}` : 'Sem tamanhos disponíveis'}
          </p>
          {item.reason && (
            <AdminBadge tone="warn" className="mt-1.5">
              Revisão manual: {item.reason}
            </AdminBadge>
          )}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-2 sm:flex">
        <label className="flex min-w-0 flex-col gap-1 text-[0.7rem] font-semibold text-muted">
          Preço (tabela: {formatPrice(item.price)})
          <AdminInput value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" aria-label={`Preço de ${item.name}`} className="h-9 w-full sm:w-28" />
        </label>
        <AdminButton size="sm" onClick={() => decide('approve')} loading={busy === 'approve'} disabled={!!busy}>
          {busy !== 'approve' && <Check className="size-3.5" aria-hidden />} Aprovar
        </AdminButton>
        <AdminButton size="sm" variant="outline" onClick={() => decide('reject')} loading={busy === 'reject'} disabled={!!busy}>
          {busy !== 'reject' && <X className="size-3.5" aria-hidden />} Rejeitar
        </AdminButton>
      </div>
    </li>
  );
}
