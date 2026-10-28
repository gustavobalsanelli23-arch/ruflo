import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { commitAll, createAndUpload, stageAll, type Row } from './support/imports';
import { asSystem, asUser, closePool } from './support/session';

/**
 * Volume: a separate organization with 2.000 products, 200 mil sale items over
 * a year and a stock position for every product. The budgets are generous
 * (a shared CI machine), but an accidental full scan or per-row RLS check
 * blows well past them.
 */

const PRODUCTS = 2000;
const ITEMS = 200_000;
let owner = '';
let org = '';

beforeAll(async () => {
  owner = randomUUID();
  await asSystem(
    async (s) => {
      await s.query(`insert into auth.users (id, email, email_confirmed_at, aud, role) values ($1, $2, now(), 'authenticated', 'authenticated')`, [
        owner,
        `volume-${owner}@exemplo.test`,
      ]);
      await s.become(owner);
      const [created] = await s.query<{ id: string }>(`select public.create_organization('Volume Atacado') as id`);
      org = created!.id;
      await s.become('system');
      const [salesImport] = await s.query<{ id: string }>(
        `insert into public.data_imports (organization_id, dataset, file_name, status, period_start, period_end, created_by)
         values ($1, 'sales', 'vendas-ano.csv', 'completed', '2025-01-01', '2025-12-31', $2) returning id`,
        [org, owner],
      );
      const [stockImport] = await s.query<{ id: string }>(
        `insert into public.data_imports (organization_id, dataset, file_name, status, period_start, period_end, created_by)
         values ($1, 'inventory', 'estoque.csv', 'completed', '2025-12-31', '2025-12-31', $2) returning id`,
        [org, owner],
      );
      await s.query(
        `insert into public.products (organization_id, sku, sku_key, name, current_cost, current_price)
         select $1, 'V' || g, 'V' || g, 'Produto ' || g, 5 + g % 40, 10 + g % 70 from generate_series(1, $2::int) g`,
        [org, PRODUCTS],
      );
      await s.query(
        `with p as (select array_agg(id order by sku_key) as ids from public.products where organization_id = $1)
         insert into public.sale_items (organization_id, import_id, row_number, product_id, sold_at, kind, quantity, unit_price, discount, unit_cost, cost_source, fingerprint)
         select $1, $2, g, p.ids[1 + g % $4], date '2025-01-01' + (g % 365), case when g % 50 = 0 then 'return'::public.sale_line_kind else 'sale' end,
           1 + g % 5, 10 + g % 70, 0, 6 + g % 40, 'file', sha256(convert_to(g::text, 'UTF8'))
         from p, generate_series(1, $3::int) g`,
        [org, salesImport!.id, ITEMS, PRODUCTS],
      );
      await s.query(
        `insert into public.inventory_snapshots (organization_id, import_id, row_number, product_id, snapshot_date, quantity, unit_cost, cost_source)
         select $1, $2, row_number() over (order by id), id, '2025-12-31', (abs(hashtext(sku)) % 300) - 5, null, 'none'
         from public.products where organization_id = $1`,
        [org, stockImport!.id],
      );
      await s.query('analyze public.sale_items; analyze public.products; analyze public.inventory_snapshots');
    },
    { commit: true },
  );
}, 120_000);

afterAll(async () => {
  await asSystem(
    async (s) => {
      await s.query('delete from public.organizations where id = $1', [org]);
      await s.query('delete from auth.users where id = $1', [owner]);
    },
    { commit: true },
  );
  await closePool();
});

async function timed<T>(fn: () => Promise<T>) {
  const start = performance.now();
  const value = await fn();
  return { value, ms: performance.now() - start };
}

describe('volume: 200 mil itens de venda', () => {
  it('as métricas do painel respondem dentro do orçamento', async () => {
    await asUser(owner, async (s) => {
      const year = [org, '2025-01-01', '2025-12-31'];
      const month = [org, '2025-12-01', '2025-12-31'];
      const budgets: [string, string, unknown[], number][] = [
        ['resumo do ano', 'select * from public.analytics_summary($1, $2, $3)', year, 2500],
        ['resumo do mês', 'select * from public.analytics_summary($1, $2, $3)', month, 800],
        ['série diária do ano', 'select * from public.analytics_daily($1, $2, $3)', year, 2500],
        ['top 50 produtos do ano', 'select * from public.analytics_products($1, $2, $3) order by net_revenue desc limit 50', year, 3000],
        ['categorias do mês', 'select * from public.analytics_categories($1, $2, $3)', month, 1500],
        ['posição de estoque', `select * from public.inventory_position($1, '2025-12-31') order by stock_value desc limit 50`, [org], 1000],
        ['resumo do estoque', `select * from public.inventory_summary($1, '2025-12-31')`, [org], 1200],
      ];
      const report: Record<string, number> = {};
      for (const [label, sql, params, budget] of budgets) {
        const { value, ms } = await timed(() => s.query(sql, params));
        report[label] = Math.round(ms);
        expect(value.length, label).toBeGreaterThan(0);
        expect(ms, `${label}: ${Math.round(ms)} ms`).toBeLessThan(budget);
      }
      console.info('[volume] tempos (ms):', report);

      const [summary] = await s.query<{ sale_lines: string; return_lines: string }>('select sale_lines, return_lines from public.analytics_summary($1, $2, $3)', year);
      expect(Number(summary!.sale_lines) + Number(summary!.return_lines)).toBe(ITEMS);
    });
  }, 60_000);

  it('a ingestão de 20 mil linhas em lotes de 2.000 cabe no orçamento', async () => {
    await asUser(owner, async (s) => {
      const rows: Row[] = Array.from({ length: 20_000 }, (_, index) => ({
        row_number: index + 1,
        sold_at: '2026-01-' + String(1 + (index % 28)).padStart(2, '0'),
        order_id: `N${Math.floor(index / 3)}`,
        sku: `V${1 + (index % PRODUCTS)}`,
        quantity: 1 + (index % 4),
        unit_price: 12.5,
        discount: 0,
        unit_cost: null,
        kind: 'sale',
      }));
      const { value: result, ms } = await timed(async () => {
        const created = await createAndUpload(s, { organizationId: org, dataset: 'sales', rows: rows.slice(0, 10) });
        const { batches } = await stageAll(s, created.importId, rows, [], 2000);
        return commitAll(s, created.importId, 'skip', batches);
      });
      console.info(`[volume] ingestão de 20.000 linhas: ${Math.round(ms)} ms`);
      expect(result).toMatchObject({ final_status: 'completed', inserted_rows: 20_000 });
      expect(ms).toBeLessThan(60_000);
    });
  }, 120_000);
});
