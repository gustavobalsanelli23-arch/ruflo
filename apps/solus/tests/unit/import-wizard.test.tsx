import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The tenant import wizard driven like a person would, with a real CSV read
 * in the (jsdom) browser and the Server Actions replaced by recorders. It
 * checks what the browser sends: the file fingerprint, the mapping it
 * detected, the rows in batches, and the order of the steps.
 */

const IMPORT = '44444444-4444-4444-8444-444444444444';
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const actions = vi.hoisted(() => ({
  createImportAction: vi.fn(),
  confirmUploadAction: vi.fn(),
  saveMappingAction: vi.fn(),
  stageBatchAction: vi.fn(),
  finishValidationAction: vi.fn(),
  importReportAction: vi.fn(),
  issuesPageAction: vi.fn(),
  startImportAction: vi.fn(),
  commitBatchAction: vi.fn(),
  finalizeImportAction: vi.fn(),
  cancelImportAction: vi.fn(),
}));
vi.mock('@/modules/data-hub/actions', () => actions);
const uploadFile = vi.hoisted(() => vi.fn(async () => true));
vi.mock('@/modules/data-hub/tenant/read-file', async (original) => ({
  ...(await original<typeof import('@/modules/data-hub/tenant/read-file')>()),
  uploadFile,
}));

const { ImportWizard } = await import('@/modules/data-hub/tenant/wizard');

const CSV = [
  'Data;Pedido;Código;Produto;Qtde;Vlr. Unitário;Desconto',
  '05/03/2026;1001;A-1;Azeite 500 ml;2;39,90;0',
  '05/03/2026;1001;B-7;Café 250 g;1;18,50;1,50',
  '06/03/2026;1002;A-1;Azeite 500 ml;1;39,90;',
].join('\r\n');

const record = (overrides: Record<string, unknown> = {}) => ({
  id: IMPORT,
  organizationId: 'org',
  dataset: 'sales',
  fileName: 'vendas.csv',
  status: 'validated',
  format: 'csv',
  fileSize: CSV.length,
  sha256: 'x',
  storagePath: null,
  createdBy: 'u1',
  options: { decimal: 'br', dateOrder: 'dmy', snapshotDate: null },
  mapping: {},
  summary: { grossRevenue: 136.2, exactDuplicates: 0, orderDuplicates: 0, possibleDuplicates: 0, newSkus: 2 },
  totalRows: 3,
  validRows: 3,
  errorCount: 0,
  warningCount: 0,
  duplicateRows: 0,
  recordCount: 0,
  skippedRows: 0,
  batchCount: 1,
  duplicatePolicy: null,
  periodStart: '2026-03-05',
  periodEnd: '2026-03-06',
  failureReason: null,
  verified: true,
  createdAt: '2026-03-10T12:00:00Z',
  completedAt: null,
  ...overrides,
});

// jsdom has no layout: the wizard scrolls its top into view between steps.
Element.prototype.scrollIntoView = vi.fn();

beforeEach(() => {
  for (const action of Object.values(actions)) action.mockReset();
  uploadFile.mockClear();
  refresh.mockClear();
  actions.createImportAction.mockResolvedValue({
    ok: true,
    data: { importId: IMPORT, uploadUrl: 'https://storage.example/upload?token=t', contentType: 'text/csv', previous: null },
  });
  actions.confirmUploadAction.mockResolvedValue({ ok: true, data: null });
  actions.saveMappingAction.mockResolvedValue({ ok: true, data: null });
  actions.stageBatchAction.mockResolvedValue({ ok: true, data: { staged: 3, rejected: 0, warnings: 0 } });
  actions.finishValidationAction.mockResolvedValue({ ok: true, data: { record: record(), issues: [] } });
  actions.startImportAction.mockResolvedValue({ ok: true, data: { batches: [0] } });
  actions.commitBatchAction.mockResolvedValue({ ok: true, data: { inserted: 3, skipped: 0 } });
  actions.finalizeImportAction.mockResolvedValue({
    ok: true,
    data: { status: 'completed', inserted: 3, skipped: 0, rejected: 0, analysis: { ok: true, detected: 1, created: 1, resolved: 0, limitations: [] } },
  });
  actions.cancelImportAction.mockResolvedValue({ ok: true, data: null });
});

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

describe('assistente de importação', () => {
  it('percorre as sete etapas com um CSV brasileiro real', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImportWizard resume={null} onShowHistory={vi.fn()} />);
    const file = new File([CSV], 'vendas.csv', { type: 'text/csv' });

    // 1. Arquivo: lido no navegador, impressão digital calculada antes de enviar.
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file);
    await user.click(await screen.findByRole('button', { name: /Enviar e pré-visualizar/ }));
    await screen.findByRole('button', { name: /Mapear colunas/ });
    expect(actions.createImportAction).toHaveBeenCalledWith({
      dataset: 'sales',
      fileName: 'vendas.csv',
      fileSize: file.size,
      sha256: await sha256Hex(CSV),
      format: 'csv',
    });
    expect(uploadFile).toHaveBeenCalledWith('https://storage.example/upload?token=t', file, 'text/csv', expect.any(Function));
    expect(actions.confirmUploadAction).toHaveBeenCalledWith(IMPORT);

    // 2. Pré-visualização → 3. Mapeamento sugerido pelos cabeçalhos.
    expect(screen.getByText(/Mostrando 3 de 3 linhas/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Mapear colunas/ }));
    await user.click(await screen.findByRole('button', { name: /Validar no servidor/ }));

    // 4. Validação: mapeamento (nome da coluna, não índice) e linhas com o número do arquivo.
    await screen.findByRole('button', { name: /Revisar e confirmar/ });
    expect(actions.saveMappingAction).toHaveBeenCalledWith({
      importId: IMPORT,
      mapping: { sold_at: 'Data', order_id: 'Pedido', sku: 'Código', product_name: 'Produto', quantity: 'Qtde', unit_price: 'Vlr. Unitário', discount: 'Desconto' },
      options: { decimal: 'br', dateOrder: 'dmy', snapshotDate: null },
      sheetName: null,
    });
    const batch = actions.stageBatchAction.mock.calls[0]![0] as { batchIndex: number; rows: { line: number; values: Record<string, unknown> }[] };
    expect(batch.batchIndex).toBe(0);
    expect(batch.rows.map((row) => row.line)).toEqual([2, 3, 4]);
    expect(batch.rows[1]!.values).toEqual(expect.objectContaining({ sku: 'B-7', unit_price: '18,50', discount: '1,50' }));
    expect(actions.finishValidationAction).toHaveBeenCalledWith({ importId: IMPORT, batchCount: 1 });

    // 5. Confirmação → 6. Gravação em lotes → 7. Resultado.
    await user.click(screen.getByRole('button', { name: /Revisar e confirmar/ }));
    expect((await screen.findByText('Linhas a gravar')).nextSibling).toHaveTextContent('3');
    await user.click(screen.getByRole('button', { name: /Confirmar e gravar/ }));
    expect(await screen.findByText('Importação concluída')).toBeInTheDocument();
    expect(actions.startImportAction).toHaveBeenCalledWith({ importId: IMPORT, policy: 'skip' });
    expect(actions.commitBatchAction).toHaveBeenCalledWith({ importId: IMPORT, batchIndex: 0 });
    expect(actions.finalizeImportAction).toHaveBeenCalledWith(IMPORT);
    expect(screen.getByText('Oportunidades recalculadas')).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
    expect(actions.cancelImportAction).not.toHaveBeenCalled();
  });

  it('arquivo .xls antigo ou binário renomeado é recusado no navegador, sem criar importação', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImportWizard resume={null} onShowHistory={vi.fn()} />);
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]);
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, new File([ole], 'vendas.csv', { type: 'text/csv' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Arquivo do Excel antigo (.xls) ou protegido por senha.');
    expect(screen.getByRole('button', { name: /Enviar e pré-visualizar/ })).toBeDisabled();
    expect(actions.createImportAction).not.toHaveBeenCalled();
  });

  it('falha no envio ao armazenamento cancela a importação criada e explica', async () => {
    uploadFile.mockResolvedValueOnce(false);
    const user = userEvent.setup();
    const { container } = render(<ImportWizard resume={null} onShowHistory={vi.fn()} />);
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, new File([CSV], 'vendas.csv', { type: 'text/csv' }));
    await user.click(await screen.findByRole('button', { name: /Enviar e pré-visualizar/ }));
    expect(await screen.findByText('O envio do arquivo falhou. Confira a conexão e tente de novo.')).toBeInTheDocument();
    expect(actions.cancelImportAction).toHaveBeenCalledWith(IMPORT);
    expect(actions.confirmUploadAction).not.toHaveBeenCalled();
  });

  it('gravação interrompida é retomada só pelos lotes pendentes', async () => {
    actions.importReportAction.mockResolvedValue({ ok: true, data: { record: record({ status: 'processing', duplicatePolicy: 'keep' }), issues: [] } });
    actions.startImportAction.mockResolvedValue({ ok: true, data: { batches: [2, 3] } });
    render(<ImportWizard resume={{ importId: IMPORT }} onShowHistory={vi.fn()} />);
    expect(await screen.findByText('Importação concluída')).toBeInTheDocument();
    expect(actions.startImportAction).toHaveBeenCalledWith({ importId: IMPORT, policy: 'keep' });
    expect(actions.commitBatchAction.mock.calls.map(([input]) => (input as { batchIndex: number }).batchIndex)).toEqual([2, 3]);
  });

  it('erro na gravação mantém a etapa com opção de tentar de novo, sem concluir', async () => {
    actions.importReportAction.mockResolvedValue({ ok: true, data: { record: record({ status: 'processing', duplicatePolicy: 'skip' }), issues: [] } });
    actions.commitBatchAction.mockResolvedValueOnce({ ok: false, error: { code: 'unavailable', message: 'O banco não respondeu.' } });
    const user = userEvent.setup();
    render(<ImportWizard resume={{ importId: IMPORT }} onShowHistory={vi.fn()} />);
    expect(await screen.findByText('A gravação foi interrompida')).toBeInTheDocument();
    expect(screen.getByText('O banco não respondeu.')).toBeInTheDocument();
    expect(actions.finalizeImportAction).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(actions.finalizeImportAction).toHaveBeenCalledWith(IMPORT));
  });
});
