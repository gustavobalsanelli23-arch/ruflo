// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Data Hub and opportunity Server Actions with Supabase and the import reads
 * replaced by recorders. What matters here is what the server decides on its
 * own: the active organization, the role, the reading options stored with the
 * import and the allowed state transitions. The database enforces the same
 * rules again (tests/db).
 */

const ACTIVE = '11111111-1111-4111-8111-111111111111';
const IMPORT = '44444444-4444-4444-8444-444444444444';
const FOREIGN = '55555555-5555-4555-8555-555555555555';

type Call = { fn: string; args: unknown };
const calls: Call[] = [];
const rpcResults = new Map<string, { data: unknown; error: unknown }>();
const deleteResult = { error: null as unknown, count: 1 as number | null };
const storage = {
  createSignedUploadUrl: vi.fn(async () => ({ data: { signedUrl: 'https://storage.example/upload?token=t' }, error: null })),
  remove: vi.fn(async () => ({ error: null })),
};

const supabase = {
  rpc: vi.fn(async (fn: string, args: unknown) => {
    calls.push({ fn, args });
    return rpcResults.get(fn) ?? { data: null, error: null };
  }),
  storage: { from: () => storage },
  from: (table: string) => ({
    delete: () => ({
      eq: async (column: string, value: string) => {
        calls.push({ fn: `delete:${table}`, args: { [column]: value } });
        return deleteResult;
      },
    }),
  }),
};

const state = vi.hoisted(() => ({
  role: 'analyst' as 'viewer' | 'analyst' | 'admin' | 'owner',
  record: null as Record<string, unknown> | null,
  verify: 'ok' as 'ok' | 'missing' | 'mismatch',
  analysis: { ok: true, detected: 0, created: 0, resolved: 0 } as Record<string, unknown>,
}));
const RANK = { viewer: 0, analyst: 1, admin: 2, owner: 3 } as const;

vi.mock('@/services/workspace', () => ({
  authorize: async (minimum: keyof typeof RANK) =>
    RANK[state.role] >= RANK[minimum]
      ? {
          ok: true,
          supabase,
          workspace: {
            user: { id: 'u1', email: 'ana@empresa.com.br' },
            memberships: [],
            active: { organizationId: ACTIVE, memberId: 'm1', name: 'Empório Aurora', slug: 'emporio-aurora', role: state.role },
          },
        }
      : { ok: false, error: { code: 'forbidden', message: 'Seu papel nesta organização não permite esta ação.' } },
}));
const getImport = vi.fn(async (_client: unknown, organizationId: string, importId: string) =>
  organizationId === ACTIVE && importId === IMPORT ? state.record : null,
);
vi.mock('@/services/imports', () => ({
  IMPORTS_BUCKET: 'imports',
  getImport: (...args: [unknown, string, string]) => getImport(...args),
  getIssues: async () => ({ rows: [], total: 0 }),
  getIssueSummary: async () => [],
  pendingBatches: async () => [0, 1],
  todayInBrazil: () => '2026-03-10',
  verifyStoredFile: async () => state.verify,
}));
const runAnalysis = vi.fn(async () => state.analysis);
vi.mock('@/services/intelligence', () => ({ runAnalysis: (...args: unknown[]) => runAnalysis(...(args as [])) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/log', () => ({ logServerError: vi.fn() }));

const hub = await import('@/modules/data-hub/actions');
const opportunities = await import('@/modules/opportunities/actions');

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: IMPORT,
    organizationId: ACTIVE,
    dataset: 'sales',
    fileName: 'vendas.csv',
    status: 'pending',
    format: 'csv',
    fileSize: 100,
    sha256: 'a'.repeat(64),
    storagePath: `${ACTIVE}/${IMPORT}/original.csv`,
    createdBy: 'u1',
    options: { decimal: 'br', dateOrder: 'dmy', snapshotDate: null },
    mapping: {},
    summary: {},
    verified: false,
    ...overrides,
  };
}

const rpcNames = () => calls.map((call) => call.fn);

beforeEach(() => {
  calls.length = 0;
  rpcResults.clear();
  storage.remove.mockClear();
  runAnalysis.mockClear();
  getImport.mockClear();
  deleteResult.error = null;
  deleteResult.count = 1;
  state.role = 'analyst';
  state.record = record();
  state.verify = 'ok';
});

describe('isolamento e papel', () => {
  it('lê a importação sempre na organização ativa; um id de outra organização não chega ao banco', async () => {
    const result = await hub.cancelImportAction(FOREIGN);
    expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: 'not_found' }) });
    expect(getImport).toHaveBeenCalledWith(supabase, ACTIVE, FOREIGN);
    expect(calls).toEqual([]);
  });

  it('leitor não cria, valida, grava nem desfaz importações', async () => {
    state.role = 'viewer';
    const attempts = await Promise.all([
      hub.createImportAction({ dataset: 'sales', fileName: 'v.csv', fileSize: 10, sha256: 'b'.repeat(64), format: 'csv' }),
      hub.stageBatchAction({ importId: IMPORT, batchIndex: 0, rows: [] }),
      hub.commitBatchAction({ importId: IMPORT, batchIndex: 0 }),
      hub.revertImportAction(IMPORT),
      opportunities.setOpportunityStatusAction({ opportunityId: IMPORT, status: 'done', note: null }),
    ]);
    for (const result of attempts) expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: 'forbidden' }) });
    expect(calls).toEqual([]);
  });

  it('entrada malformada é recusada antes de qualquer consulta', async () => {
    const results = await Promise.all([
      hub.createImportAction({ dataset: 'sales', fileName: 'v.xls', fileSize: 10, sha256: 'x', format: 'xls' }),
      hub.stageBatchAction({ importId: 'não-é-uuid', batchIndex: 0, rows: [] }),
      hub.commitBatchAction({ importId: IMPORT, batchIndex: -1 }),
    ]);
    for (const result of results) expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: 'validation' }) });
    expect(getImport).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });
});

describe('envio do arquivo', () => {
  it('cria a importação pela RPC e devolve a URL assinada do caminho que o banco escolheu', async () => {
    rpcResults.set('create_import', {
      data: [{ import_id: IMPORT, object_path: `${ACTIVE}/${IMPORT}/original.csv`, previous_import_id: null }],
      error: null,
    });
    const result = await hub.createImportAction({ dataset: 'sales', fileName: 'vendas.csv', fileSize: 100, sha256: 'a'.repeat(64), format: 'csv' });
    expect(result).toEqual({ ok: true, data: expect.objectContaining({ importId: IMPORT, contentType: 'text/csv', previous: null }) });
    expect(calls[0]).toEqual({ fn: 'create_import', args: expect.objectContaining({ p_organization_id: ACTIVE, p_file_format: 'csv' }) });
    expect(storage.createSignedUploadUrl).toHaveBeenCalledWith(`${ACTIVE}/${IMPORT}/original.csv`);
  });

  it('cancela a importação quando o arquivo guardado não confere com o declarado', async () => {
    state.verify = 'mismatch';
    const result = await hub.confirmUploadAction(IMPORT);
    expect(result).toEqual({ ok: false, error: expect.objectContaining({ message: 'O arquivo armazenado não confere com o selecionado. Envie de novo.' }) });
    expect(rpcNames()).toEqual(['cancel_import']);
  });

  it('confirma o envio só depois de conferir o arquivo', async () => {
    expect(await hub.confirmUploadAction(IMPORT)).toEqual({ ok: true, data: null });
    expect(rpcNames()).toEqual(['confirm_import_upload']);
  });
});

describe('mapeamento e validação', () => {
  it('recusa campos que o tipo de dado não tem e data de contagem no futuro', async () => {
    const options = { decimal: 'br', dateOrder: 'dmy', snapshotDate: null };
    expect(await hub.saveMappingAction({ importId: IMPORT, mapping: { senha: 'Senha' }, options, sheetName: null })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: 'validation' }),
    });
    state.record = record({ dataset: 'inventory' });
    const future = await hub.saveMappingAction({ importId: IMPORT, mapping: { sku: 'SKU' }, options: { ...options, snapshotDate: '2026-04-01' }, sheetName: null });
    expect(future).toEqual({ ok: false, error: expect.objectContaining({ message: 'A data da contagem não pode estar no futuro.' }) });
    expect(calls).toEqual([]);
  });

  it('revalida as linhas no servidor com as opções guardadas na importação, não com o que o navegador manda', async () => {
    rpcResults.set('stage_import_batch', { data: [{ staged_rows: 1, rejected_rows: 0, warnings: 0 }], error: null });
    // "1.250" é ambíguo: mil duzentos e cinquenta no padrão brasileiro, 1,25 no americano.
    const rows = [{ line: 2, values: { sold_at: '05/03/2026', sku: 'A-1', quantity: '2', unit_price: '1.250', is_admin: true } }];
    const stagedWith = async () => {
      calls.length = 0;
      await hub.stageBatchAction({ importId: IMPORT, batchIndex: 0, rows, options: { decimal: 'us', dateOrder: 'mdy' } });
      return calls[0]!.args as { p_rows: Record<string, unknown>[]; p_issues: { field: string }[] };
    };

    const br = await stagedWith();
    expect(br.p_rows).toEqual([expect.objectContaining({ row_number: 2, sku: 'A-1', unit_price: 1250, quantity: 2, sold_at: '2026-03-05' })]);
    expect(br.p_rows[0]).not.toHaveProperty('is_admin');

    state.record = record({ options: { decimal: 'us', dateOrder: 'dmy', snapshotDate: null } });
    expect((await stagedWith()).p_rows).toEqual([expect.objectContaining({ unit_price: 1.25 })]);

    // Mês/dia: 05/03/2026 vira 3 de maio, depois de "hoje" (10/03/2026), e a linha é rejeitada.
    state.record = record({ options: { decimal: 'br', dateOrder: 'mdy', snapshotDate: null } });
    const mdy = await stagedWith();
    expect(mdy.p_rows).toEqual([]);
    expect(mdy.p_issues.map((issue) => issue.field)).toContain('sold_at');
  });

  it('sem mapeamento salvo não há validação', async () => {
    state.record = record({ options: null });
    const result = await hub.stageBatchAction({ importId: IMPORT, batchIndex: 0, rows: [] });
    expect(result.ok).toBe(false);
    expect(calls).toEqual([]);
  });
});

describe('gravação, desfazer e remoção', () => {
  it('só inicia a gravação de importação validada; uma interrompida é retomada sem reiniciar', async () => {
    state.record = record({ status: 'validated' });
    expect(await hub.startImportAction({ importId: IMPORT, policy: 'skip' })).toEqual({ ok: true, data: { batches: [0, 1] } });
    expect(calls).toEqual([{ fn: 'start_import', args: { p_import_id: IMPORT, p_duplicate_policy: 'skip' } }]);

    calls.length = 0;
    state.record = record({ status: 'processing' });
    expect(await hub.startImportAction({ importId: IMPORT, policy: 'skip' })).toEqual({ ok: true, data: { batches: [0, 1] } });
    expect(calls).toEqual([]);

    state.record = record({ status: 'completed' });
    expect((await hub.startImportAction({ importId: IMPORT, policy: 'skip' })).ok).toBe(false);
    expect(calls).toEqual([]);
  });

  it('ao concluir e ao desfazer, recalcula as oportunidades da organização ativa', async () => {
    rpcResults.set('finalize_import', { data: [{ final_status: 'completed', inserted_rows: 3, skipped_rows: 1, rejected_rows: 0 }], error: null });
    const finished = await hub.finalizeImportAction(IMPORT);
    expect(finished).toEqual({ ok: true, data: expect.objectContaining({ status: 'completed', inserted: 3, skipped: 1 }) });
    expect(runAnalysis).toHaveBeenLastCalledWith(expect.objectContaining({ organizationId: ACTIVE, actorId: 'u1', trigger: 'import', importId: IMPORT }));

    rpcResults.set('revert_import', { data: 3, error: null });
    const reverted = await hub.revertImportAction(IMPORT);
    expect(reverted).toEqual({ ok: true, data: expect.objectContaining({ removed: 3 }) });
    expect(runAnalysis).toHaveBeenLastCalledWith(expect.objectContaining({ trigger: 'revert' }));
  });

  it('erro do banco não dispara a análise', async () => {
    rpcResults.set('revert_import', { data: null, error: { message: 'solus:import_not_revertable' } });
    const result = await hub.revertImportAction(IMPORT);
    expect(result.ok).toBe(false);
    expect(runAnalysis).not.toHaveBeenCalled();
  });

  it('remover do histórico exige administrador e importação cancelada, com falha ou desfeita', async () => {
    state.record = record({ status: 'canceled' });
    expect((await hub.deleteImportAction(IMPORT)).ok).toBe(false);
    expect(calls).toEqual([]);

    state.role = 'admin';
    state.record = record({ status: 'completed' });
    expect(await hub.deleteImportAction(IMPORT)).toEqual({ ok: false, error: expect.objectContaining({ code: 'conflict' }) });
    expect(storage.remove).not.toHaveBeenCalled();

    state.record = record({ status: 'reverted' });
    expect(await hub.deleteImportAction(IMPORT)).toEqual({ ok: true, data: null });
    expect(storage.remove).toHaveBeenCalledWith([`${ACTIVE}/${IMPORT}/original.csv`]);
    expect(calls).toEqual([{ fn: 'delete:data_imports', args: { id: IMPORT } }]);
  });

  it('linha não removida pelo RLS não é tratada como sucesso', async () => {
    state.role = 'admin';
    state.record = record({ status: 'failed' });
    deleteResult.count = 0;
    expect(await hub.deleteImportAction(IMPORT)).toEqual({ ok: false, error: expect.objectContaining({ code: 'forbidden' }) });
  });
});

describe('oportunidades e parâmetros', () => {
  const settings = (overrides: Record<string, string> = {}) => {
    const data = new FormData();
    const values = {
      min_margin: '20',
      max_discount_rate: '15',
      stalled_days: '60',
      velocity_window_days: '90',
      default_lead_time_days: '7',
      high_turnover_days: '30',
      low_turnover_days: '90',
      excess_coverage_days: '120',
      target_coverage_days: '45',
      drop_threshold: '30',
      ...overrides,
    };
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  };

  it('traduz o status da interface para o do banco', async () => {
    const result = await opportunities.setOpportunityStatusAction({ opportunityId: IMPORT, status: 'in-progress', note: '  ' });
    expect(result.ok).toBe(true);
    expect(calls).toEqual([{ fn: 'set_opportunity_status', args: { p_opportunity_id: IMPORT, p_status: 'in_progress', p_note: null } }]);
  });

  it('parâmetros: só administradores salvam, percentuais viram razão e vírgula decimal é aceita', async () => {
    expect(await opportunities.saveAnalysisSettingsAction({ status: 'idle' }, settings())).toEqual(
      expect.objectContaining({ status: 'error', code: 'forbidden' }),
    );
    expect(calls).toEqual([]);

    state.role = 'admin';
    const saved = await opportunities.saveAnalysisSettingsAction({ status: 'idle' }, settings({ min_margin: '22,5' }));
    expect(saved.status).toBe('success');
    expect(calls[0]).toEqual({
      fn: 'save_analysis_settings',
      args: {
        p_organization_id: ACTIVE,
        p_settings: expect.objectContaining({ min_margin: 0.225, max_discount_rate: 0.15, drop_threshold: 0.3, stalled_days: 60 }),
      },
    });
    expect(runAnalysis).toHaveBeenCalledWith(expect.objectContaining({ trigger: 'settings', organizationId: ACTIVE }));
  });

  it('parâmetros incoerentes ou vazios voltam com o erro no campo e os valores digitados', async () => {
    state.role = 'admin';
    const empty = await opportunities.saveAnalysisSettingsAction({ status: 'idle' }, settings({ min_margin: ' ' }));
    expect(empty).toEqual(expect.objectContaining({ status: 'error', fieldErrors: { min_margin: 'Informe um número.' } }));

    const incoherent = await opportunities.saveAnalysisSettingsAction({ status: 'idle' }, settings({ low_turnover_days: '20' }));
    expect(incoherent.fieldErrors).toEqual({ low_turnover_days: 'Precisa ser maior que o limite de giro alto.' });
    expect(incoherent.values).toEqual(expect.objectContaining({ low_turnover_days: '20' }));

    const fractional = await opportunities.saveAnalysisSettingsAction({ status: 'idle' }, settings({ stalled_days: '45,5' }));
    expect(fractional.fieldErrors).toEqual({ stalled_days: 'Use um número inteiro de dias.' });
    expect(calls).toEqual([]);
  });

  it('sem a chave secreta a análise manual explica o motivo', async () => {
    state.analysis = { ok: false, reason: 'not_configured' };
    const result = await opportunities.runAnalysisAction();
    expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: 'unavailable' }) });
    state.analysis = { ok: true, detected: 0, created: 0, resolved: 0 };
  });
});
