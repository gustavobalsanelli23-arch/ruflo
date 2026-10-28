import { afterAll, describe, expect, inject, it } from 'vitest';
import { commitAll, createAndUpload, numbered, runImport, stageAll, type Row } from './support/imports';
import { asUser, closePool, type Session } from './support/session';

/**
 * The import pipeline (create → upload → validate → confirm → commit), run
 * through the RPCs as the application server does, each test rolled back.
 */

const { users, orgs } = inject('world');
afterAll(closePool);

const sales = (rows: Partial<Row>[]): Row[] =>
  numbered(
    rows.map((row) => ({ sold_at: '2026-02-01', sku: 'SKU-1', quantity: 1, unit_price: 10, discount: 0, unit_cost: 6, kind: 'sale', ...row })),
  );

const countItems = async (s: Session) =>
  Number((await s.query<{ n: string }>('select count(*) as n from public.sale_items where organization_id = $1', [orgs.a]))[0]!.n);

const errorMessage = async (s: Session, sql: string, params: unknown[]) => {
  const outcome = await s.attempt(sql, params);
  return outcome.ok ? null : outcome.error.message;
};

describe('fluxo completo', () => {
  it('importa vendas, registra rastreabilidade (importação e linha) e conclui com erros quando há linhas rejeitadas', async () => {
    await asUser(users.analystA, async (s) => {
      const run = await runImport(s, {
        organizationId: orgs.a,
        dataset: 'sales',
        rows: sales([{ order_id: 'A1' }, { order_id: 'A1', sku: 'SKU-2', quantity: 2 }, { order_id: null, row_number: 5 }]),
        issues: [{ row_number: 4, field: 'quantity', code: 'invalid_number', severity: 'error', message: 'Quantidade inválida.', raw_value: 'abc' }],
        policy: 'skip',
      });
      expect(run.result).toEqual({ final_status: 'with_errors', inserted_rows: 3, skipped_rows: 0, rejected_rows: 1 });

      const [imported] = await s.query<Record<string, unknown>>(
        'select status, total_rows, valid_rows, error_count, record_count, period_start::text, period_end::text from public.data_imports where id = $1',
        [run.importId],
      );
      expect(imported).toEqual({
        status: 'with_errors',
        total_rows: 4,
        valid_rows: 3,
        error_count: 1,
        record_count: 3,
        period_start: '2026-02-01',
        period_end: '2026-02-01',
      });
      const items = await s.query<{ row_number: number; import_id: string; cost_source: string }>(
        'select row_number, import_id, cost_source from public.sale_items where import_id = $1 order by row_number',
        [run.importId],
      );
      expect(items.map((i) => i.row_number)).toEqual([1, 2, 3]);
      expect(new Set(items.map((i) => i.cost_source))).toEqual(new Set(['file']));
      const errors = await s.query('select row_number, code, severity, raw_value from public.import_errors where import_id = $1', [run.importId]);
      expect(errors).toEqual([{ row_number: 4, code: 'invalid_number', severity: 'error', raw_value: 'abc' }]);
      // SKUs sem cadastro viram produtos incompletos, sem inventar categoria ou custo
      const products = await s.query('select sku, catalog_complete, category_id, current_cost from public.products where organization_id = $1 order by sku', [orgs.a]);
      expect(products).toEqual([
        { sku: 'SKU-1', catalog_complete: false, category_id: null, current_cost: null },
        { sku: 'SKU-2', catalog_complete: false, category_id: null, current_cost: null },
      ]);
      // a área de preparação é limpa ao concluir
      await s.become('system');
      expect(await s.query('select 1 from private.import_rows where import_id = $1', [run.importId])).toEqual([]);
    });
  });

  it('dados de uma importação ainda em gravação não aparecem nos painéis', async () => {
    await asUser(users.analystA, async (s) => {
      const created = await createAndUpload(s, { organizationId: orgs.a, dataset: 'sales', rows: sales([{}, {}]) });
      const { batches } = await stageAll(s, created.importId, sales([{}, {}]), [], 1);
      await s.query('select public.start_import($1, $2)', [created.importId, 'skip']);
      await s.query('select * from public.commit_import_batch($1, 0)', [created.importId]);
      expect(batches).toBe(2);
      expect(await countItems(s)).toBe(1);
      const [summary] = await s.query<{ net_revenue: string }>(`select net_revenue from public.analytics_summary($1, '2026-01-01', '2026-12-31')`, [orgs.a]);
      expect(Number(summary!.net_revenue)).toBe(0);
      // e concluir exige todos os lotes
      expect(await errorMessage(s, 'select * from public.finalize_import($1)', [created.importId])).toBe('solus:batches_pending');
    });
  });
});

describe('idempotência e lotes', () => {
  it('reenviar o mesmo lote devolve o resultado anterior; conteúdo diferente no mesmo índice é recusado', async () => {
    await asUser(users.analystA, async (s) => {
      const created = await createAndUpload(s, { organizationId: orgs.a, dataset: 'sales', rows: sales([{}]) });
      const rows = JSON.stringify(sales([{}, {}]));
      const first = await s.query('select * from public.stage_import_batch($1, 0, $2, $3)', [created.importId, rows, '[]']);
      const again = await s.query('select * from public.stage_import_batch($1, 0, $2, $3)', [created.importId, rows, '[]']);
      expect(again).toEqual(first);
      const other = JSON.stringify(sales([{ quantity: 9 }]));
      expect(await errorMessage(s, 'select * from public.stage_import_batch($1, 0, $2, $3)', [created.importId, other, '[]'])).toBe('solus:batch_conflict');
    });
  });

  it('gravar o mesmo lote duas vezes não duplica nada', async () => {
    await asUser(users.analystA, async (s) => {
      const created = await createAndUpload(s, { organizationId: orgs.a, dataset: 'sales', rows: sales([{}]) });
      await stageAll(s, created.importId, sales([{ order_id: 'X' }, {}]));
      await s.query('select public.start_import($1, $2)', [created.importId, 'skip']);
      const first = await s.query('select * from public.commit_import_batch($1, 0)', [created.importId]);
      const second = await s.query('select * from public.commit_import_batch($1, 0)', [created.importId]);
      expect(second).toEqual(first);
      expect(await countItems(s)).toBe(2);
    });
  });

  it('um lote com linha fora do formato é recusado inteiro (o banco não confia em quem chama)', async () => {
    await asUser(users.analystA, async (s) => {
      const created = await createAndUpload(s, { organizationId: orgs.a, dataset: 'sales', rows: sales([{}]) });
      for (const bad of [
        sales([{}, { quantity: -1 }]),
        sales([{ unit_price: 'dez' }]),
        sales([{ sold_at: '31/02/2026' }]),
        sales([{ discount: 50 }]),
        sales([{ sku: '   ' }]),
        sales([{ kind: 'troca' }]),
        sales([{ sold_at: '2099-01-01' }]),
      ]) {
        expect(await errorMessage(s, 'select * from public.stage_import_batch($1, 0, $2, $3)', [created.importId, JSON.stringify(bad), '[]'])).toBe(
          'solus:invalid_batch',
        );
      }
      const tooMany = JSON.stringify(sales(Array.from({ length: 2001 }, () => ({}))));
      expect(await errorMessage(s, 'select * from public.stage_import_batch($1, 0, $2, $3)', [created.importId, tooMany, '[]'])).toBe('solus:batch_too_large');
      // uma linha marcada como erro não pode estar entre as aceitas
      const conflicting = JSON.stringify([{ row_number: 1, code: 'invalid_number', severity: 'error', message: 'x' }]);
      expect(await errorMessage(s, 'select * from public.stage_import_batch($1, 0, $2, $3)', [created.importId, JSON.stringify(sales([{}])), conflicting])).toBe(
        'solus:invalid_batch',
      );
    });
  });

  it('a validação só fecha com todos os lotes recebidos', async () => {
    await asUser(users.analystA, async (s) => {
      const created = await createAndUpload(s, { organizationId: orgs.a, dataset: 'sales', rows: sales([{}]) });
      await s.query('select * from public.stage_import_batch($1, 0, $2, $3)', [created.importId, JSON.stringify(sales([{}])), '[]']);
      expect(await errorMessage(s, 'select public.finish_validation($1, 2)', [created.importId])).toBe('solus:batches_missing');
    });
  });

  it('sem nenhuma linha válida a importação falha, com os erros guardados', async () => {
    await asUser(users.analystA, async (s) => {
      const created = await createAndUpload(s, { organizationId: orgs.a, dataset: 'sales', rows: sales([{}]) });
      await s.query('select * from public.stage_import_batch($1, 0, $2, $3)', [
        created.importId,
        '[]',
        JSON.stringify([{ row_number: 2, code: 'missing_value', severity: 'error', message: 'SKU vazio.' }]),
      ]);
      await s.query('select public.finish_validation($1, 1)', [created.importId]);
      const [row] = await s.query('select status, failure_reason, error_count from public.data_imports where id = $1', [created.importId]);
      expect(row).toEqual({ status: 'failed', failure_reason: 'no_valid_rows', error_count: 1 });
    });
  });

  it('só uma importação por vez fica em gravação na organização', async () => {
    await asUser(users.analystA, async (s) => {
      const first = await createAndUpload(s, { organizationId: orgs.a, dataset: 'sales', rows: sales([{}]), contentSeed: '1' });
      await stageAll(s, first.importId, sales([{}]));
      await s.query('select public.start_import($1, $2)', [first.importId, 'skip']);
      const second = await createAndUpload(s, { organizationId: orgs.a, dataset: 'sales', rows: sales([{}]), contentSeed: '2' });
      await stageAll(s, second.importId, sales([{ quantity: 2 }]));
      expect(await errorMessage(s, 'select public.start_import($1, $2)', [second.importId, 'skip'])).toBe('solus:import_in_progress');
    });
  });
});

describe('duplicatas', () => {
  const FILE = sales([
    { order_id: 'N1', sku: 'A' },
    { order_id: 'N1', sku: 'B' },
    { order_id: null, sku: 'C' },
    { order_id: null, sku: 'C' },
  ]);

  it('o mesmo arquivo de novo: aviso na criação, linhas com documento sempre ignoradas, sem documento o usuário decide', async () => {
    await asUser(users.analystA, async (s) => {
      const original = await runImport(s, { organizationId: orgs.a, dataset: 'sales', rows: FILE, policy: 'skip' });
      expect(await countItems(s)).toBe(4);

      const again = await runImport(s, { organizationId: orgs.a, dataset: 'sales', rows: FILE });
      expect(again.previousImportId).toBe(original.importId);
      expect(again.summary).toMatchObject({ exactDuplicates: 2, possibleDuplicates: 2, orderDuplicates: 0 });

      // ignorar: nada novo
      const [{ batch_count: batches }] = await s.query<{ batch_count: number }>('select batch_count from public.data_imports where id = $1', [again.importId]);
      const skipped = await commitAll(s, again.importId, 'skip', batches);
      expect(skipped).toMatchObject({ inserted_rows: 0, skipped_rows: 4 });
      expect(await countItems(s)).toBe(4);
    });
  });

  it('com "importar mesmo assim", entram só as linhas sem documento; as com documento continuam ignoradas', async () => {
    await asUser(users.analystA, async (s) => {
      await runImport(s, { organizationId: orgs.a, dataset: 'sales', rows: FILE, policy: 'skip' });
      const again = await runImport(s, { organizationId: orgs.a, dataset: 'sales', rows: FILE, policy: 'keep' });
      expect(again.result).toMatchObject({ inserted_rows: 2, skipped_rows: 2 });
      expect(await countItems(s)).toBe(6);
    });
  });

  it('duas linhas idênticas no mesmo arquivo são duas vendas, não uma duplicata', async () => {
    await asUser(users.analystA, async (s) => {
      const run = await runImport(s, { organizationId: orgs.a, dataset: 'sales', rows: FILE, policy: 'skip' });
      expect(run.summary).toMatchObject({ exactDuplicates: 0, possibleDuplicates: 0 });
      expect(run.result).toMatchObject({ inserted_rows: 4 });
    });
  });

  it('um documento já importado com outro conteúdo não é misturado: as linhas novas dele são ignoradas', async () => {
    await asUser(users.analystA, async (s) => {
      await runImport(s, { organizationId: orgs.a, dataset: 'sales', rows: FILE, policy: 'skip' });
      const corrected = await runImport(s, {
        organizationId: orgs.a,
        dataset: 'sales',
        rows: sales([{ order_id: 'N1', sku: 'A', quantity: 5 }, { order_id: 'N2', sku: 'A' }]),
        policy: 'skip',
      });
      expect(corrected.summary).toMatchObject({ orderDuplicates: 1, exactDuplicates: 0 });
      expect(corrected.result).toMatchObject({ inserted_rows: 1, skipped_rows: 1 });
    });
  });

  it('duplicatas são conferidas de novo na gravação (outra importação pode ter terminado depois da validação)', async () => {
    await asUser(users.analystA, async (s) => {
      const first = await runImport(s, { organizationId: orgs.a, dataset: 'sales', rows: FILE, contentSeed: 'a' });
      const second = await runImport(s, { organizationId: orgs.a, dataset: 'sales', rows: FILE, contentSeed: 'b' });
      await commitAll(s, first.importId, 'skip', 1);
      const result = await commitAll(s, second.importId, 'skip', 1);
      expect(result).toMatchObject({ inserted_rows: 0, skipped_rows: 4 });
      expect(await countItems(s)).toBe(4);
    });
  });
});

describe('cancelar e desfazer', () => {
  it('cancelar no meio da gravação remove o que já foi gravado', async () => {
    await asUser(users.analystA, async (s) => {
      const created = await createAndUpload(s, { organizationId: orgs.a, dataset: 'sales', rows: sales([{}]) });
      await stageAll(s, created.importId, sales([{ sku: 'NOVO-1' }, { sku: 'NOVO-2' }]), [], 1);
      await s.query('select public.start_import($1, $2)', [created.importId, 'skip']);
      await s.query('select * from public.commit_import_batch($1, 0)', [created.importId]);
      await s.query('select public.cancel_import($1)', [created.importId]);
      expect(await countItems(s)).toBe(0);
      expect(await s.query('select sku from public.products where organization_id = $1', [orgs.a])).toEqual([]);
      const [row] = await s.query('select status from public.data_imports where id = $1', [created.importId]);
      expect(row).toEqual({ status: 'canceled' });
    });
  });

  it('desfazer remove as vendas, os documentos e os produtos criados só por ela; cadastros completos ficam', async () => {
    await asUser(users.analystA, async (s) => {
      await runImport(s, { organizationId: orgs.a, dataset: 'products', rows: numbered([{ sku: 'A', name: 'Produto A', cost: 5 }]), policy: 'update' });
      const run = await runImport(s, { organizationId: orgs.a, dataset: 'sales', rows: FILE_WITH_NEW_SKU, policy: 'skip' });
      expect(await s.query('select public.revert_import($1) as removed', [run.importId])).toEqual([{ removed: 2 }]);
      expect(await countItems(s)).toBe(0);
      expect(await s.query('select external_id from public.sales where organization_id = $1', [orgs.a])).toEqual([]);
      expect(await s.query('select sku from public.products where organization_id = $1', [orgs.a])).toEqual([{ sku: 'A' }]);
      // e o mesmo arquivo pode ser importado de novo, sem ser visto como duplicata
      const again = await runImport(s, { organizationId: orgs.a, dataset: 'sales', rows: FILE_WITH_NEW_SKU, policy: 'skip' });
      expect(again.result).toMatchObject({ inserted_rows: 2 });
    });
  });

  it('cadastros não são desfeitos (corrigem-se importando o arquivo certo)', async () => {
    await asUser(users.analystA, async (s) => {
      const run = await runImport(s, { organizationId: orgs.a, dataset: 'products', rows: numbered([{ sku: 'A', name: 'Produto A' }]), policy: 'update' });
      expect(await errorMessage(s, 'select public.revert_import($1)', [run.importId])).toBe('solus:import_not_revertable');
    });
  });
});

const FILE_WITH_NEW_SKU = sales([
  { order_id: 'R1', sku: 'A' },
  { order_id: 'R1', sku: 'NOVO' },
]);

describe('cadastros e estoque', () => {
  it('produtos: SKU repetido gera aviso e vale a última linha; categorias e fornecedores são criados uma vez', async () => {
    await asUser(users.analystA, async (s) => {
      const run = await runImport(s, {
        organizationId: orgs.a,
        dataset: 'products',
        rows: numbered([
          { sku: 'A', name: 'Primeiro nome', category: 'Bebidas', supplier: 'Distribuidora Ômega' },
          { sku: 'B', name: 'Outro', category: 'bebidas', supplier: 'distribuidora omega' },
          { sku: 'a', name: 'Nome final', cost: 3.5 },
        ]),
        policy: 'update',
      });
      expect(run.summary).toMatchObject({ newProducts: 2, newCategories: 1, newSuppliers: 1 });
      const warnings = await s.query('select row_number, code from public.import_errors where import_id = $1', [run.importId]);
      expect(warnings).toEqual([{ row_number: 3, code: 'repeated_sku' }]);
      const products = await s.query(
        `select p.sku, p.name, p.current_cost, c.name as category from public.products p left join public.categories c on c.id = p.category_id where p.organization_id = $1 order by p.sku_key`,
        [orgs.a],
      );
      expect(products).toEqual([
        { sku: 'a', name: 'Nome final', current_cost: '3.5000', category: null },
        { sku: 'B', name: 'Outro', current_cost: null, category: 'Bebidas' },
      ]);
    });
  });

  it('estoque: o mesmo produto e data repetidos no arquivo têm as quantidades somadas, com aviso', async () => {
    await asUser(users.analystA, async (s) => {
      const run = await runImport(s, {
        organizationId: orgs.a,
        dataset: 'inventory',
        rows: numbered([
          { sku: 'A', snapshot_date: '2026-02-01', quantity: 3 },
          { sku: 'A', snapshot_date: '2026-02-01', quantity: 4 },
          { sku: 'A', snapshot_date: '2026-02-02', quantity: 1 },
        ]),
        policy: 'skip',
        batchSize: 1,
      });
      expect(run.summary).toMatchObject({ dates: 2 });
      const positions = await s.query('select snapshot_date::text as day, quantity from public.inventory_snapshots where import_id = $1 order by 1', [run.importId]);
      expect(positions).toEqual([
        { day: '2026-02-01', quantity: '7.000' },
        { day: '2026-02-02', quantity: '1.000' },
      ]);
      const warnings = await s.query('select row_number, code from public.import_errors where import_id = $1', [run.importId]);
      expect(warnings).toEqual([{ row_number: 2, code: 'repeated_position' }]);
    });
  });
});
