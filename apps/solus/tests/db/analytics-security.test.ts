import { afterAll, describe, expect, inject, it } from 'vitest';
import { createAndUpload, numbered, runImport } from './support/imports';
import { asAnon, asServiceRole, asSystem, asUser, closePool, type Session } from './support/session';

/**
 * Who may read and write the analytical data, the Storage bucket and the
 * opportunities. Each test arranges its own data and is rolled back.
 */

const { users, orgs } = inject('world');
afterAll(closePool);

const ANALYTIC_TABLES = [
  'categories',
  'suppliers',
  'products',
  'sales',
  'sale_items',
  'inventory_snapshots',
  'import_batches',
  'import_errors',
  'analysis_settings',
  'analysis_runs',
  'opportunities',
  'opportunity_events',
];

const SALES = numbered([
  { sold_at: '2026-03-01', order_id: 'S1', sku: 'X-1', quantity: 2, unit_price: 10, unit_cost: 4 },
  { sold_at: '2026-03-02', order_id: 'S2', sku: 'X-2', quantity: 1, unit_price: 30, unit_cost: 20 },
]);

async function seedBoth(s: Session) {
  await s.become(users.analystA);
  await runImport(s, { organizationId: orgs.a, dataset: 'sales', rows: SALES, policy: 'skip' });
  await s.become(users.analystB);
  await runImport(s, { organizationId: orgs.b, dataset: 'sales', rows: SALES, policy: 'skip' });
}

const message = async (s: Session, sql: string, params: unknown[] = []) => {
  const outcome = await s.attempt(sql, params);
  return outcome.ok ? 'ok' : outcome.error.message;
};

describe('tabelas analíticas', () => {
  it('cada membro lê apenas os dados da própria organização, em todas as tabelas', async () => {
    await asUser(users.viewerA, async (s) => {
      await seedBoth(s);
      await s.become(users.viewerA);
      for (const table of ANALYTIC_TABLES) {
        const rows = await s.query<{ organization_id: string }>(`select organization_id from public.${table}`);
        expect(rows.every((row) => row.organization_id === orgs.a), table).toBe(true);
      }
      const items = await s.query('select id from public.sale_items');
      expect(items).toHaveLength(2);
      await s.become(users.outsider);
      for (const table of ANALYTIC_TABLES) {
        expect(await s.query(`select 1 from public.${table}`), table).toEqual([]);
      }
    });
  });

  it('nenhum papel escreve diretamente nas tabelas analíticas (só pelas funções)', async () => {
    await asUser(users.ownerA, async (s) => {
      await seedBoth(s);
      await s.become(users.ownerA);
      const [product] = await s.query<{ id: string }>('select id from public.products limit 1');
      for (const sql of [
        `insert into public.categories (organization_id, name, name_key) values ('${orgs.a}', 'X', 'x')`,
        `update public.products set current_cost = 0 where id = '${product!.id}'`,
        `delete from public.sale_items`,
        `update public.sale_items set unit_cost = 0`,
        `insert into public.opportunities (organization_id, type, dedupe_key, entity_type, entity_label, title, summary, priority, confidence, impact_value, impact_kind, impact_method, facts, period_start, period_end)
         values ('${orgs.a}', 'low_margin', 'low_margin:x', 'organization', 'x', 'x', 'x', 'low', 0.5, 1, 'monthly_profit', 'x', '[{}]', now(), now())`,
        `update public.analysis_settings set min_margin = 0.5`,
      ]) {
        const outcome = await s.attempt(sql);
        expect(outcome.ok, sql).toBe(false);
        if (!outcome.ok) expect(outcome.error.code, sql).toBe('42501');
      }
    });
  });

  it('anon não lê nenhuma tabela analítica nem executa as funções de importação e métricas', async () => {
    await asAnon(async (s) => {
      for (const table of ANALYTIC_TABLES) {
        const outcome = await s.attempt(`select 1 from public.${table}`);
        expect(outcome.ok, table).toBe(false);
      }
      expect(await message(s, `select * from public.analytics_summary($1, '2026-01-01', '2026-12-31')`, [orgs.a])).toMatch(/permission denied/);
      expect(await message(s, `select * from public.create_import($1, 'sales', 'a.csv', 'csv', 1, repeat('a', 64))`, [orgs.a])).toMatch(/permission denied/);
    });
  });

  it('a área de preparação (private.import_rows) não é acessível pelo cliente', async () => {
    await asUser(users.ownerA, async (s) => {
      expect(await message(s, 'select 1 from private.import_rows')).toMatch(/permission denied/);
    });
  });

  it('a chave estrangeira composta impede apontar para o produto de outra organização', async () => {
    await asSystem(async (s) => {
      await seedBoth(s);
      await s.become('system');
      const [productB] = await s.query<{ id: string }>('select id from public.products where organization_id = $1 limit 1', [orgs.b]);
      const [importA] = await s.query<{ id: string }>(`select id from public.data_imports where organization_id = $1 and status = 'completed'`, [orgs.a]);
      const outcome = await s.attempt(
        `insert into public.sale_items (organization_id, import_id, row_number, product_id, sold_at, quantity, unit_price, cost_source, fingerprint)
         values ($1, $2, 99, $3, '2026-03-01', 1, 1, 'none', '\\x00')`,
        [orgs.a, importA!.id, productB!.id],
      );
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) expect(outcome.error.code).toBe('23503');
    });
  });
});

describe('papéis nas funções de importação', () => {
  it('leitor não cria importações; analista de outra organização também não', async () => {
    await asUser(users.viewerA, async (s) => {
      const create = `select * from public.create_import($1, 'sales', 'a.csv', 'csv', 10, repeat('a', 64))`;
      expect(await message(s, create, [orgs.a])).toBe('solus:forbidden');
      await s.become(users.analystB);
      expect(await message(s, create, [orgs.a])).toBe('solus:forbidden');
    });
  });

  it('uma importação é conduzida por quem a criou; outro analista não, mas owner e admin podem', async () => {
    await asUser(users.analystA, async (s) => {
      const created = await createAndUpload(s, { organizationId: orgs.a, dataset: 'sales', rows: SALES });
      const stage = 'select * from public.stage_import_batch($1, 0, $2, $3)';
      await s.become(users.viewerA);
      expect(await message(s, stage, [created.importId, JSON.stringify(SALES), '[]'])).toBe('solus:forbidden');
      await s.become(users.analystB);
      expect(await message(s, stage, [created.importId, JSON.stringify(SALES), '[]'])).toBe('solus:import_not_found');
      await s.become(users.adminA);
      expect(await message(s, stage, [created.importId, JSON.stringify(SALES), '[]'])).toBe('ok');
    });
  });

  it('validar e gravar exigem o arquivo conferido no Storage com o tamanho declarado', async () => {
    await asUser(users.analystA, async (s) => {
      const [created] = await s.query<{ import_id: string; object_path: string }>(
        `select * from public.create_import($1, 'sales', 'a.csv', 'csv', 100, repeat('d', 64))`,
        [orgs.a],
      );
      expect(await message(s, 'select public.confirm_import_upload($1)', [created!.import_id])).toBe('solus:upload_missing');
      expect(await message(s, `select * from public.stage_import_batch($1, 0, '[]', '[]')`, [created!.import_id])).toBe('solus:invalid_import_state');
      await s.query(`insert into storage.objects (bucket_id, name, owner, metadata) values ('imports', $1, auth.uid(), '{"size": 99}')`, [
        created!.object_path,
      ]);
      expect(await message(s, 'select public.confirm_import_upload($1)', [created!.import_id])).toBe('solus:upload_mismatch');
    });
  });

  it('o nome do arquivo é limpo de pastas e caracteres de controle; formato e tamanho são conferidos', async () => {
    await asUser(users.analystA, async (s) => {
      const [created] = await s.query<{ import_id: string }>(
        `select * from public.create_import($1, 'sales', E'C:\\\\Users\\\\ana\\\\vendas\\u0007.csv', 'csv', 10, repeat('a', 64))`,
        [orgs.a],
      );
      const [row] = await s.query('select file_name from public.data_imports where id = $1', [created!.import_id]);
      expect(row).toEqual({ file_name: 'vendas.csv' });
      expect(await message(s, `select * from public.create_import($1, 'sales', 'a.xls', 'xls', 10, repeat('a', 64))`, [orgs.a])).toBe('solus:unsupported_format');
      expect(await message(s, `select * from public.create_import($1, 'sales', 'a.csv', 'csv', 26214401, repeat('a', 64))`, [orgs.a])).toBe('solus:file_too_large');
      expect(await message(s, `select * from public.create_import($1, 'sales', 'a.csv', 'csv', 10, 'abc')`, [orgs.a])).toBe('solus:invalid_checksum');
    });
  });

  it('desfazer: autor ou owner/admin; leitor nunca', async () => {
    await asUser(users.analystA, async (s) => {
      const run = await runImport(s, { organizationId: orgs.a, dataset: 'sales', rows: SALES, policy: 'skip' });
      await s.become(users.viewerA);
      expect(await message(s, 'select public.revert_import($1)', [run.importId])).toBe('solus:forbidden');
      await s.become(users.ownerA);
      expect(await message(s, 'select public.revert_import($1)', [run.importId])).toBe('ok');
    });
  });

  it('parâmetros das análises: só owner e admin alteram, e valores fora da faixa são recusados', async () => {
    await asUser(users.analystA, async (s) => {
      const save = 'select public.save_analysis_settings($1, $2)';
      expect(await message(s, save, [orgs.a, { min_margin: 0.3 }])).toBe('solus:forbidden');
      await s.become(users.adminA);
      expect(await message(s, save, [orgs.a, { min_margin: 0.3, stalled_days: 45 }])).toBe('ok');
      expect(await message(s, save, [orgs.a, { min_margin: 1.5 }])).toBe('solus:invalid_settings');
      expect(await message(s, save, [orgs.a, { high_turnover_days: 200, low_turnover_days: 100 }])).toBe('solus:invalid_settings');
      expect(await message(s, save, [orgs.a, { stalled_days: 'muitos' }])).toBe('solus:invalid_settings');
      const [params] = await s.query('select min_margin, stalled_days, customized from public.analysis_parameters($1)', [orgs.a]);
      expect(params).toEqual({ min_margin: '0.3000', stalled_days: 45, customized: true });
      await s.become(users.adminA);
      expect(await message(s, save, [orgs.b, { min_margin: 0.3 }])).toBe('solus:forbidden');
    });
  });
});

describe('Storage (bucket imports)', () => {
  const insertObject = `insert into storage.objects (bucket_id, name, owner, metadata) values ('imports', $1, auth.uid(), '{"size": 10}')`;

  it('o bucket é privado, limitado a 25 MB e a CSV/XLSX', async () => {
    const [bucket] = await asSystem((s) => s.query('select public, file_size_limit, allowed_mime_types from storage.buckets where id = $1', ['imports']));
    expect(bucket).toEqual({
      public: false,
      file_size_limit: '26214400',
      allowed_mime_types: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    });
  });

  it('o envio só é aceito no caminho da própria importação pendente', async () => {
    await asUser(users.analystA, async (s) => {
      const [created] = await s.query<{ import_id: string; object_path: string }>(
        `select * from public.create_import($1, 'sales', 'a.csv', 'csv', 10, repeat('e', 64))`,
        [orgs.a],
      );
      const path = created!.object_path;
      const [orgId, importId] = path.split('/');
      for (const forged of [
        `${orgs.b}/${importId}/original.csv`,
        `${orgId}/${importId}/outro.csv`,
        `${orgId}/${importId}/original.xlsx`,
        `${orgId}/00000000-0000-0000-0000-000000000000/original.csv`,
        `${orgId}/${importId}/../original.csv`,
        `${path}/x`,
      ]) {
        const outcome = await s.attempt(insertObject, [forged]);
        expect(outcome.ok, forged).toBe(false);
      }
      await s.become(users.adminA);
      expect((await s.attempt(insertObject, [path])).ok, 'outra pessoa, mesmo admin').toBe(false);
      await s.become(users.analystA);
      expect((await s.attempt(insertObject, [path])).ok).toBe(true);
      // depois de conferido, nada mais é aceito nesse caminho
      await s.query('select public.confirm_import_upload($1)', [created!.import_id]);
      await s.become('system');
      await s.query(`delete from storage.objects where name = $1`, [path]);
      await s.become(users.analystA);
      const replaced = await s.attempt(insertObject, [path]);
      expect(replaced.ok).toBe(false);
      if (!replaced.ok) expect(replaced.error.message).toMatch(/row-level security/);
    });
  });

  it('leitura dos originais: analistas da organização; leitores e outras organizações não', async () => {
    await asUser(users.analystA, async (s) => {
      const created = await createAndUpload(s, { organizationId: orgs.a, dataset: 'sales', rows: SALES });
      const read = 'select name from storage.objects where name = $1';
      expect(await s.query(read, [created.path])).toHaveLength(1);
      await s.become(users.viewerA);
      expect(await s.query(read, [created.path])).toEqual([]);
      await s.become(users.ownerB);
      expect(await s.query(read, [created.path])).toEqual([]);
    });
  });

  it('exclusão dos originais: só owner e admin da organização', async () => {
    await asUser(users.analystA, async (s) => {
      const created = await createAndUpload(s, { organizationId: orgs.a, dataset: 'sales', rows: SALES });
      const remove = 'delete from storage.objects where name = $1';
      expect((await s.attempt(remove, [created.path])) as unknown).toMatchObject({ ok: true, count: 0 });
      await s.become(users.multi); // admin em B, leitor em A
      expect((await s.attempt(remove, [created.path])) as unknown).toMatchObject({ ok: true, count: 0 });
      await s.become(users.adminA);
      expect((await s.attempt(remove, [created.path])) as unknown).toMatchObject({ ok: true, count: 1 });
    });
  });

  it('ninguém sobrescreve um original (não há política de UPDATE)', async () => {
    await asUser(users.analystA, async (s) => {
      const created = await createAndUpload(s, { organizationId: orgs.a, dataset: 'sales', rows: SALES });
      for (const person of [users.analystA, users.adminA, users.ownerA]) {
        await s.become(person);
        const outcome = await s.attempt(`update storage.objects set metadata = '{"size": 1}' where name = $1`, [created.path]);
        expect(outcome).toMatchObject({ ok: true, count: 0 });
      }
    });
  });
});

describe('oportunidades: escrita restrita', () => {
  const item = (productId: string) => ({
    type: 'negative_margin',
    dedupe_key: `negative_margin:product:${productId}`,
    entity_type: 'product',
    entity_id: productId,
    entity_label: 'Produto',
    title: 'Margem negativa',
    summary: 'Resumo',
    priority: 'high',
    confidence: 0.8,
    impact_value: 100,
    impact_kind: 'monthly_profit',
    impact_method: 'Método',
    facts: [{ label: 'Margem', value: -0.1 }],
    hypotheses: [],
    recommendations: [],
    period_start: '2026-03-01',
    period_end: '2026-03-31',
  });
  const sync = `select * from public.sync_opportunities($1, $2, 'manual', null, 'test', '2026-03-01', '2026-03-31', '[]', $3)`;

  it('só a chave secreta grava oportunidades; um usuário autenticado não consegue nem como owner', async () => {
    await asUser(users.ownerA, async (s) => {
      await seedBoth(s);
      await s.become(users.ownerA);
      const [product] = await s.query<{ id: string }>('select id from public.products limit 1');
      expect(await message(s, sync, [orgs.a, users.ownerA, JSON.stringify([item(product!.id)])])).toMatch(/permission denied/);
      await s.become('service_role');
      expect(await message(s, sync, [orgs.a, users.ownerA, JSON.stringify([item(product!.id)])])).toBe('ok');
    });
  });

  it('mesmo com a chave secreta: quem dispara precisa ser analista da organização e a entidade precisa ser dela', async () => {
    await asServiceRole(async (s) => {
      await seedBoth(s);
      await s.become('service_role');
      const [productA] = await s.query<{ id: string }>('select id from public.products where organization_id = $1 limit 1', [orgs.a]);
      const [productB] = await s.query<{ id: string }>('select id from public.products where organization_id = $1 limit 1', [orgs.b]);
      expect(await message(s, sync, [orgs.a, users.viewerA, JSON.stringify([item(productA!.id)])])).toBe('solus:forbidden');
      expect(await message(s, sync, [orgs.a, users.ownerB, JSON.stringify([item(productA!.id)])])).toBe('solus:forbidden');
      expect(await message(s, sync, [orgs.a, users.analystA, JSON.stringify([item(productB!.id)])])).toBe('solus:invalid_opportunities');
      expect(await message(s, sync, [orgs.a, users.analystA, JSON.stringify([{ ...item(productA!.id), facts: [] }])])).toBe('solus:invalid_opportunities');
      expect(await message(s, sync, [orgs.a, users.analystA, JSON.stringify([{ ...item(productA!.id), dedupe_key: 'outro:tipo' }])])).toBe(
        'solus:invalid_opportunities',
      );
      expect(await message(s, sync, [orgs.a, users.analystA, JSON.stringify([{ ...item(productA!.id), confidence: 2 }])])).toBe('solus:invalid_opportunities');
    });
  });

  it('mudar o status: analista ou superior da organização; leitor e outras organizações não', async () => {
    await asServiceRole(async (s) => {
      await seedBoth(s);
      await s.become('service_role');
      const [product] = await s.query<{ id: string }>('select id from public.products where organization_id = $1 limit 1', [orgs.a]);
      await s.query(sync, [orgs.a, users.analystA, JSON.stringify([item(product!.id)])]);
      const [opportunity] = await s.query<{ id: string }>('select id from public.opportunities where organization_id = $1', [orgs.a]);
      const change = `select public.set_opportunity_status($1, 'reviewing', 'Vou verificar o preço')`;
      await s.become(users.viewerA);
      expect(await message(s, change, [opportunity!.id])).toBe('solus:forbidden');
      await s.become(users.ownerB);
      expect(await message(s, change, [opportunity!.id])).toBe('solus:opportunity_not_found');
      await s.become(users.analystA);
      expect(await message(s, change, [opportunity!.id])).toBe('ok');
      const events = await s.query('select event, from_status, to_status, actor_id, note from public.opportunity_events order by id');
      expect(events).toEqual([
        { event: 'detected', from_status: null, to_status: 'new', actor_id: null, note: null },
        { event: 'status_changed', from_status: 'new', to_status: 'reviewing', actor_id: users.analystA, note: 'Vou verificar o preço' },
      ]);
    });
  });
});
