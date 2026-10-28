'use client';

import { CircleSlash, Clock, FileSpreadsheet, Undo2 } from 'lucide-react';
import { DataTable, type Column } from '@/components/data/data-table';
import { EmptyState } from '@/components/data/states';
import { IMPORT_STATUS, StatusBadge, type StatusSpec } from '@/components/data/status';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { ImportDataset, ImportStatus } from '@/types/database';

/** Import history of a real organization (public.data_imports, read through RLS). */
export interface ImportHistoryRow {
  id: string;
  fileName: string;
  dataset: ImportDataset;
  status: ImportStatus;
  records: number;
  errors: number;
  createdAt: string;
}

const DATASET_LABEL: Record<ImportDataset, string> = {
  sales: 'Vendas',
  products: 'Produtos',
  inventory: 'Estoque',
  suppliers: 'Fornecedores',
};

const STATUS: Record<ImportStatus, StatusSpec> = {
  pending: { label: 'Em validação', variant: 'neutral', icon: Clock },
  validated: { label: 'Aguardando confirmação', variant: 'brand', icon: Clock },
  processing: IMPORT_STATUS.processing,
  completed: IMPORT_STATUS.completed,
  with_errors: IMPORT_STATUS['with-errors'],
  failed: IMPORT_STATUS.failed,
  canceled: { label: 'Cancelada', variant: 'neutral', icon: CircleSlash },
  reverted: { label: 'Desfeita', variant: 'neutral', icon: Undo2 },
};

const COLUMNS: Column<ImportHistoryRow>[] = [
  {
    id: 'file',
    header: 'Arquivo',
    sortValue: (r) => r.fileName,
    className: 'min-w-60',
    cell: (r) => (
      <span className="flex items-center gap-2.5">
        <FileSpreadsheet aria-hidden="true" className="size-4 shrink-0 text-subtle-foreground" />
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{r.fileName}</span>
          <span className="block text-xs text-subtle-foreground">{DATASET_LABEL[r.dataset]}</span>
        </span>
      </span>
    ),
  },
  { id: 'status', header: 'Status', sortValue: (r) => r.status, cell: (r) => <StatusBadge spec={STATUS[r.status]} /> },
  { id: 'records', header: 'Registros', align: 'right', sortValue: (r) => r.records, cell: (r) => formatNumber(r.records) },
  { id: 'errors', header: 'Erros', align: 'right', sortValue: (r) => r.errors, cell: (r) => formatNumber(r.errors) },
  {
    id: 'at',
    header: 'Enviado em',
    sortValue: (r) => r.createdAt,
    wide: true,
    cell: (r) => <span className="text-muted-foreground">{formatDateTime(r.createdAt)}</span>,
  },
];

export function ImportHistory({ rows }: { rows: ImportHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="Nenhuma importação ainda"
        description="Cada planilha enviada aparece aqui, com o status do processamento, o número de registros e os erros encontrados."
      />
    );
  }
  return (
    <DataTable
      rows={rows}
      columns={COLUMNS}
      getRowId={(r) => r.id}
      caption="Histórico de importações"
      noun={{ one: 'importação', many: 'importações' }}
      initialSort={{ id: 'at', dir: 'desc' }}
      mobileRow={(r) => (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{r.fileName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {DATASET_LABEL[r.dataset]}, {formatNumber(r.records)} registros, {formatDateTime(r.createdAt)}
            </p>
          </div>
          <StatusBadge spec={STATUS[r.status]} className="shrink-0" />
        </div>
      )}
    />
  );
}
