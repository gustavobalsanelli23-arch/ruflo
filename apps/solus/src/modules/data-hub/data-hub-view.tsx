'use client';

import { FileSpreadsheet, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataTable, type Column } from '@/components/data/data-table';
import { Meter } from '@/components/data/meter';
import { Panel } from '@/components/data/panel';
import { IMPORT_STATUS, StatusBadge } from '@/components/data/status';
import type { DataHubData, ImportRecord } from '@/lib/data/types';
import { formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { ImportWizard } from './import-wizard';

const columns: Column<ImportRecord>[] = [
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
          <span className="block text-xs text-subtle-foreground">{r.dataset}</span>
        </span>
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    sortValue: (r) => r.status,
    cell: (r) =>
      r.status === 'processing' ? (
        <span className="flex w-32 flex-col gap-1.5">
          <StatusBadge spec={IMPORT_STATUS.processing} />
          <Meter value={r.progress ?? 0} label={`Processado ${formatPercent(r.progress ?? 0, 0)}`} />
        </span>
      ) : (
        <StatusBadge spec={IMPORT_STATUS[r.status]} />
      ),
  },
  { id: 'records', header: 'Registros', align: 'right', sortValue: (r) => r.records, cell: (r) => formatNumber(r.records) },
  {
    id: 'errors',
    header: 'Erros',
    align: 'right',
    sortValue: (r) => r.errors,
    cell: (r) => <span className={r.errors > 0 ? 'font-medium text-critical-text' : 'text-muted-foreground'}>{formatNumber(r.errors)}</span>,
  },
  {
    id: 'at',
    header: 'Enviado em',
    sortValue: (r) => r.uploadedAt,
    wide: true,
    cell: (r) => (
      <span className="text-muted-foreground">
        {formatDateTime(r.uploadedAt)}
        <span className="block text-xs text-subtle-foreground">{r.uploadedBy}</span>
      </span>
    ),
  },
];

export function DataHubView({ data }: { data: DataHubData }) {
  const [imports, setImports] = useState<ImportRecord[]>(data.imports);
  const processing = imports.some((r) => r.status === 'processing');

  // Demo only: advance "processing" rows so the status lifecycle is visible.
  useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(() => {
      setImports((rows) =>
        rows.map((r) => {
          if (r.status !== 'processing') return r;
          const progress = Math.min(1, (r.progress ?? 0) + 0.12);
          return progress >= 1 ? { ...r, status: r.errors > 0 ? 'with-errors' : 'completed', progress: 1 } : { ...r, progress };
        }),
      );
    }, 900);
    return () => window.clearInterval(timer);
  }, [processing]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Panel className="xl:col-span-8" title="Nova importação" description="Quatro etapas: arquivo, colunas, validação e confirmação.">
          <ImportWizard data={data} onImported={(record) => setImports((rows) => [record, ...rows])} />
        </Panel>
        <Panel className="xl:col-span-4" title="Antes de enviar">
          <ul className="flex flex-col gap-4 text-sm">
            <li>
              <p className="font-medium text-foreground">Formatos aceitos</p>
              <p className="mt-0.5 text-muted-foreground">CSV separado por vírgula ou ponto e vírgula, e Excel (.xlsx, .xls). Uma aba por arquivo.</p>
            </li>
            <li>
              <p className="font-medium text-foreground">Campos obrigatórios para vendas</p>
              <p className="mt-0.5 text-muted-foreground">Data, código do produto (SKU), quantidade e preço unitário.</p>
            </li>
            <li>
              <p className="font-medium text-foreground">Datas e números</p>
              <p className="mt-0.5 text-muted-foreground">Datas em AAAA-MM-DD ou DD/MM/AAAA. Valores com vírgula decimal são aceitos.</p>
            </li>
            <li>
              <p className="font-medium text-foreground">Integrações com ERP</p>
              <p className="mt-0.5 text-muted-foreground">Planejadas para uma fase posterior. Por enquanto, a entrada é por planilha.</p>
            </li>
          </ul>
        </Panel>
      </div>

      <Panel title="Histórico de importações" description="Status de processamento, quantidade de registros e erros encontrados.">
        <DataTable
          rows={imports}
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
                  {r.dataset}, {formatNumber(r.records)} registros, {formatDateTime(r.uploadedAt)}
                </p>
              </div>
              <StatusBadge spec={IMPORT_STATUS[r.status]} className="shrink-0" />
            </div>
          )}
        />
      </Panel>
    </div>
  );
}
