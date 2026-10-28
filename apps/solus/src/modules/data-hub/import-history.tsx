'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { CircleSlash, Clock, FileSpreadsheet, FileText, MoreHorizontal, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DataTable, type Column } from '@/components/data/data-table';
import { EmptyState } from '@/components/data/states';
import { IMPORT_STATUS, StatusBadge, type StatusSpec } from '@/components/data/status';
import { DATASET_LABEL } from '@/lib/ingest/fields';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import type { ImportStatus } from '@/types/database';
import type { ImportHistoryItem } from '@/services/imports';
import { cancelImportAction, deleteImportAction, revertImportAction } from './actions';
import { IssueList } from './tenant/issues';

/** Import history of a real organization (public.data_imports, read through RLS), with what each row allows. */

const STATUS: Record<ImportStatus, StatusSpec> = {
  pending: { label: 'Envio ou validação incompletos', variant: 'neutral', icon: Clock },
  validated: { label: 'Aguardando confirmação', variant: 'brand', icon: Clock },
  processing: IMPORT_STATUS.processing,
  completed: IMPORT_STATUS.completed,
  with_errors: IMPORT_STATUS['with-errors'],
  failed: IMPORT_STATUS.failed,
  canceled: { label: 'Cancelada', variant: 'neutral', icon: CircleSlash },
  reverted: { label: 'Desfeita', variant: 'neutral', icon: Undo2 },
};

type Confirm = { kind: 'revert' | 'cancel' | 'delete'; item: ImportHistoryItem } | null;

export function ImportHistory({
  rows,
  canImport,
  canAdmin,
  userId,
}: {
  rows: ImportHistoryItem[];
  canImport: boolean;
  canAdmin: boolean;
  userId: string;
}) {
  const router = useRouter();
  const [issuesOf, setIssuesOf] = useState<ImportHistoryItem | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [pending, start] = useTransition();

  // Quem criou conduz a importação; owner e admin também podem (o banco confere).
  const drives = (item: ImportHistoryItem) => canImport && (canAdmin || item.createdBy === userId);

  const run = (current: NonNullable<Confirm>) =>
    start(async () => {
      const id = current.item.id;
      if (current.kind === 'revert') {
        const result = await revertImportAction(id);
        if (!result.ok) toast.error('Não foi possível desfazer', { description: result.error.message });
        else toast.success('Importação desfeita', { description: `${formatNumber(result.data.removed)} registros saíram das análises.` });
      } else if (current.kind === 'cancel') {
        const result = await cancelImportAction(id);
        if (!result.ok) toast.error('Não foi possível cancelar', { description: result.error.message });
        else toast.success('Importação cancelada');
      } else {
        const result = await deleteImportAction(id);
        if (!result.ok) toast.error('Não foi possível remover', { description: result.error.message });
        else toast.success('Removida do histórico, com o arquivo original');
      }
      setConfirm(null);
      router.refresh();
    });

  const actions = (item: ImportHistoryItem) => {
    const entries: { label: string; onSelect?: () => void; href?: string }[] = [];
    if (item.errors + item.warnings > 0) entries.push({ label: 'Ver problemas', onSelect: () => setIssuesOf(item) });
    if (drives(item) && (item.status === 'validated' || item.status === 'processing')) entries.push({ label: 'Continuar', href: `/dados?continuar=${item.id}` });
    if (drives(item) && ['pending', 'validated', 'processing', 'failed'].includes(item.status)) entries.push({ label: 'Cancelar', onSelect: () => setConfirm({ kind: 'cancel', item }) });
    if (drives(item) && (item.status === 'completed' || item.status === 'with_errors') && (item.dataset === 'sales' || item.dataset === 'inventory')) {
      entries.push({ label: 'Desfazer', onSelect: () => setConfirm({ kind: 'revert', item }) });
    }
    if (canAdmin && ['canceled', 'failed', 'reverted'].includes(item.status)) entries.push({ label: 'Remover do histórico', onSelect: () => setConfirm({ kind: 'delete', item }) });
    return entries;
  };

  const menu = (r: ImportHistoryItem) => {
    const entries = actions(r);
    if (entries.length === 0) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${r.fileName}`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {entries.map((entry) =>
            entry.href ? (
              <DropdownMenuItem key={entry.label} asChild>
                <Link href={entry.href}>{entry.label}</Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={entry.label} onSelect={entry.onSelect}>
                {entry.label}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const columns: Column<ImportHistoryItem>[] = [
    {
      id: 'file',
      header: 'Arquivo',
      sortValue: (r) => r.fileName,
      className: 'min-w-60',
      cell: (r) => (
        <span className="flex items-center gap-2.5">
          {r.format === 'csv' ? (
            <FileText aria-hidden="true" className="size-4 shrink-0 text-subtle-foreground" />
          ) : (
            <FileSpreadsheet aria-hidden="true" className="size-4 shrink-0 text-subtle-foreground" />
          )}
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground">{r.fileName}</span>
            <span className="block text-xs text-subtle-foreground">
              {DATASET_LABEL[r.dataset]}
              {r.periodStart && `, ${r.periodStart === r.periodEnd ? formatDate(r.periodStart) : `${formatDate(r.periodStart)} a ${formatDate(r.periodEnd ?? r.periodStart)}`}`}
            </span>
          </span>
        </span>
      ),
    },
    { id: 'status', header: 'Status', sortValue: (r) => r.status, cell: (r) => <StatusBadge spec={STATUS[r.status]} /> },
    { id: 'records', header: 'Gravados', align: 'right', sortValue: (r) => r.records, cell: (r) => formatNumber(r.records) },
    { id: 'skipped', header: 'Duplicados', align: 'right', wide: true, sortValue: (r) => r.skipped, cell: (r) => <span className="text-muted-foreground">{formatNumber(r.skipped)}</span> },
    {
      id: 'errors',
      header: 'Rejeitados',
      align: 'right',
      sortValue: (r) => r.errors,
      cell: (r) => <span className={r.errors > 0 ? 'text-critical-text' : 'text-muted-foreground'}>{formatNumber(r.errors)}</span>,
    },
    {
      id: 'at',
      header: 'Enviado em',
      sortValue: (r) => r.createdAt,
      wide: true,
      cell: (r) => (
        <span className="text-muted-foreground">
          {formatDateTime(r.createdAt)}
          {r.author && <span className="block text-xs text-subtle-foreground">{r.author}</span>}
        </span>
      ),
    },
    { id: 'actions', header: 'Ações', className: 'w-12', align: 'right', cell: (r) => menu(r) },
  ];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="Nenhuma importação ainda"
        description="Cada planilha enviada aparece aqui, com o status, os registros gravados, os duplicados ignorados e as linhas rejeitadas."
      />
    );
  }

  const copy = {
    revert: {
      title: 'Desfazer esta importação?',
      body: 'Os registros dela saem dos painéis e as oportunidades são recalculadas. O arquivo continua no histórico e pode ser importado de novo.',
      action: 'Desfazer importação',
    },
    cancel: { title: 'Cancelar esta importação?', body: 'O que já foi gravado dela é removido. Nada dela entra nos painéis.', action: 'Cancelar importação' },
    delete: { title: 'Remover do histórico?', body: 'A linha do histórico e o arquivo original guardado são apagados. Não pode ser desfeito.', action: 'Remover' },
  } as const;

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        caption="Histórico de importações"
        noun={{ one: 'importação', many: 'importações' }}
        initialSort={{ id: 'at', dir: 'desc' }}
        mobileRow={(r) => (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{r.fileName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {DATASET_LABEL[r.dataset]}, {formatNumber(r.records)} gravados, {formatDateTime(r.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <StatusBadge spec={STATUS[r.status]} />
              {menu(r)}
            </div>
          </div>
        )}
      />

      <Dialog open={issuesOf !== null} onOpenChange={(open) => !open && setIssuesOf(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Problemas de {issuesOf?.fileName}</DialogTitle>
            <DialogDescription>Erros rejeitaram a linha; avisos descrevem um ajuste feito na leitura. A numeração é a do arquivo.</DialogDescription>
          </DialogHeader>
          {issuesOf && <IssueList importId={issuesOf.id} />}
        </DialogContent>
      </Dialog>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && !pending && setConfirm(null)}>
        <DialogContent showCloseButton={false}>
          {confirm && (
            <>
              <DialogHeader>
                <DialogTitle>{copy[confirm.kind].title}</DialogTitle>
                <DialogDescription>
                  {confirm.item.fileName}. {copy[confirm.kind].body}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={pending}>
                    Voltar
                  </Button>
                </DialogClose>
                <Button variant="destructive" disabled={pending} onClick={() => run(confirm)}>
                  {pending ? 'Aguarde…' : copy[confirm.kind].action}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
