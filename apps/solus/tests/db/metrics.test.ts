import { afterAll, describe, expect, inject, it } from 'vitest';
import { runImport, numbered } from './support/imports';
import { asUser, closePool, type Session } from './support/session';

/**
 * The metric layer against a small dataset whose every number was computed by
 * hand (the arithmetic is in the comments). Everything runs inside one
 * rolled-back transaction per test.
 */

const { users, orgs } = inject('world');
afterAll(closePool);

const PRODUCTS = numbered([
  { sku: 'CAF-01', name: 'Café 500g', category: 'Mercearia', supplier: 'Torrefação Sul', unit: 'un', cost: 10, price: 20, lead_time_days: 5 },
  { sku: 'AZE-01', name: 'Azeite 500ml', category: 'mercearia ', supplier: 'Olivas BR', cost: 30, price: 40 },
  { sku: 'QUE-01', name: 'Queijo kg', category: 'Frios', price: 50 },
  { sku: 'VEL-01', name: 'Vela', category: 'Utilidades', cost: 2, price: 5 },
]);

// L1..L6. Costs: L1/L3/L6 from the file, L2/L5 from the catalog (30), L4 none.
const SALES = numbered([
  { sold_at: '2026-01-05', order_id: 'P1', sku: 'CAF-01', quantity: 2, unit_price: 20, discount: 4, unit_cost: 10, kind: 'sale' },
  { sold_at: '2026-01-05', order_id: 'P1', sku: 'AZE-01', quantity: 1, unit_price: 40, discount: 0, unit_cost: null, kind: 'sale' },
  // "caf-01" is the same SKU once normalized (upper case, no spaces)
  { sold_at: '2026-01-10', order_id: 'P2', sku: 'caf-01', quantity: 3, unit_price: 20, discount: 0, unit_cost: 12, kind: 'sale' },
  { sold_at: '2026-01-12', order_id: 'P3', sku: 'QUE-01', quantity: 1, unit_price: 50, discount: 5, unit_cost: null, kind: 'sale' },
  { sold_at: '2026-01-15', order_id: null, sku: 'AZE-01', quantity: 2, unit_price: 40, discount: 0, unit_cost: null, kind: 'sale' },
  { sold_at: '2026-01-20', order_id: 'D1', sku: 'CAF-01', quantity: 1, unit_price: 20, discount: 0, unit_cost: 10, kind: 'return' },
]);

const INVENTORY = numbered([
  { sku: 'CAF-01', snapshot_date: '2026-01-31', quantity: 10, unit_cost: null },
  { sku: 'AZE-01', snapshot_date: '2026-01-31', quantity: 0, unit_cost: null },
  { sku: 'QUE-01', snapshot_date: '2026-01-31', quantity: 4, unit_cost: 25 },
  { sku: 'VEL-01', snapshot_date: '2026-01-31', quantity: 100, unit_cost: null },
]);

async function seed(s: Session) {
  await runImport(s, { organizationId: orgs.a, dataset: 'products', rows: PRODUCTS, policy: 'update' });
  await runImport(s, { organizationId: orgs.a, dataset: 'sales', rows: SALES, policy: 'skip' });
  await runImport(s, { organizationId: orgs.a, dataset: 'inventory', rows: INVENTORY, policy: 'skip' });
}

const n = (value: unknown) => (value === null ? null : Number(value));

describe('totais do período', () => {
  it('receita, descontos, devoluções, CMV histórico, lucro e margem batem com a conta manual', async () => {
    await asUser(users.ownerA, async (s) => {
      await seed(s);
      const [row] = await s.query<Record<string, unknown>>(`select * from public.analytics_summary($1, '2026-01-01', '2026-01-31')`, [orgs.a]);
      // bruta: 40 + 40 + 60 + 50 + 80 = 270 · descontos: 4 + 5 = 9 · devoluções: 20
      expect(n(row!.gross_revenue)).toBe(270);
      expect(n(row!.discounts)).toBe(9);
      expect(n(row!.returns)).toBe(20);
      // líquida: 270 − 9 − 20 = 241
      expect(n(row!.net_revenue)).toBe(241);
      // com custo: 36 + 40 + 60 + 80 − 20 = 196 · CMV: 20 + 30 + 36 + 60 − 10 = 136
      expect(n(row!.costed_net_revenue)).toBe(196);
      expect(n(row!.cogs)).toBe(136);
      expect(n(row!.gross_profit)).toBe(60);
      expect(n(row!.gross_margin)).toBeCloseTo(60 / 196, 10);
      expect(n(row!.cost_coverage)).toBeCloseTo(196 / 241, 10);
      // vendas identificadas: P1, P2, P3 · ticket: (36 + 40 + 60 + 45 − 20) / 3
      expect(n(row!.orders)).toBe(3);
      expect(n(row!.identified_net_revenue)).toBe(161);
      expect(n(row!.average_ticket)).toBeCloseTo(161 / 3, 10);
      // unidades: 2 + 1 + 3 + 1 + 2 − 1
      expect(n(row!.units_sold)).toBe(8);
      expect(row).toMatchObject({ sale_lines: '5', return_lines: '1', active_days: '5', catalog_cost_lines: '2', uncosted_lines: '1' });
    });
  });

  it('o CMV usa o custo gravado na venda: mudar o custo do produto depois não altera o passado', async () => {
    await asUser(users.ownerA, async (s) => {
      await seed(s);
      await runImport(s, {
        organizationId: orgs.a,
        dataset: 'products',
        rows: numbered([
          { sku: 'CAF-01', name: 'Café 500g', cost: 15 },
          { sku: 'AZE-01', name: 'Azeite 500ml', cost: 35 },
        ]),
        policy: 'update',
        contentSeed: 'custos novos',
      });
      const [row] = await s.query<{ cogs: string }>(`select cogs from public.analytics_summary($1, '2026-01-01', '2026-01-31')`, [orgs.a]);
      expect(n(row!.cogs)).toBe(136);
      const [product] = await s.query<{ current_cost: string; category: string }>(
        `select p.current_cost, c.name as category from public.products p join public.categories c on c.id = p.category_id where p.sku_key = 'CAF-01' and p.organization_id = $1`,
        [orgs.a],
      );
      // o custo atual mudou; a categoria vazia no arquivo não apagou a anterior
      expect(product).toEqual({ current_cost: '15.0000', category: 'Mercearia' });
    });
  });

  it('sem receita a margem e o ticket ficam indisponíveis (null), nunca zero', async () => {
    await asUser(users.ownerA, async (s) => {
      await seed(s);
      const [empty] = await s.query<Record<string, unknown>>(`select * from public.analytics_summary($1, '2025-12-01', '2025-12-31')`, [orgs.a]);
      expect(empty).toMatchObject({ net_revenue: '0', gross_margin: null, average_ticket: null, cost_coverage: null });
      // só a devolução no dia 20: receita líquida negativa
      const [returnsOnly] = await s.query<Record<string, unknown>>(`select * from public.analytics_summary($1, '2026-01-20', '2026-01-20')`, [orgs.a]);
      expect(n(returnsOnly!.net_revenue)).toBe(-20);
      expect(returnsOnly!.gross_margin).toBeNull();
    });
  });

  it('evolução diária: dias sem venda aparecem com zero', async () => {
    await asUser(users.ownerA, async (s) => {
      await seed(s);
      const days = await s.query<Record<string, unknown>>(`select * from public.analytics_daily($1, '2026-01-04', '2026-01-06')`, [orgs.a]);
      expect(days.map((d) => d.day instanceof Date ? d.day.toISOString().slice(0, 10) : d.day)).toEqual(['2026-01-04', '2026-01-05', '2026-01-06']);
      // dia 5: líquida 36 + 40 = 76 · CMV 20 + 30 = 50
      expect(days[1]).toMatchObject({ orders: '1' });
      expect(n(days[1]!.net_revenue)).toBe(76);
      expect(n(days[1]!.cogs)).toBe(50);
      expect(n(days[1]!.gross_profit)).toBe(26);
      expect(n(days[1]!.units_sold)).toBe(3);
      expect(n(days[0]!.net_revenue)).toBe(0);
    });
  });
});

describe('por produto, categoria e fornecedor', () => {
  it('produto: margem, cobertura de custo, desconto, preço e custo médios', async () => {
    await asUser(users.ownerA, async (s) => {
      await seed(s);
      const rows = await s.query<Record<string, unknown>>(`select * from public.analytics_products($1, '2026-01-01', '2026-01-31') order by sku`, [orgs.a]);
      const bySku = Object.fromEntries(rows.map((r) => [r.sku as string, r]));
      const cafe = bySku['CAF-01']!;
      // bruta 100, desconto 4, devolução 20 → líquida 76 · CMV 20 + 36 − 10 = 46
      expect([n(cafe.net_revenue), n(cafe.cogs), n(cafe.gross_profit)]).toEqual([76, 46, 30]);
      expect(n(cafe.gross_margin)).toBeCloseTo(30 / 76, 10);
      expect(n(cafe.discount_rate)).toBeCloseTo(0.04, 10);
      expect(n(cafe.average_price)).toBeCloseTo(96 / 5, 10);
      expect(n(cafe.average_cost)).toBeCloseTo(56 / 5, 10);
      expect(cafe).toMatchObject({ orders: '2', sale_days: '2', category_name: 'Mercearia', supplier_name: 'Torrefação Sul' });

      const queijo = bySku['QUE-01']!;
      expect(n(queijo.net_revenue)).toBe(45);
      expect(queijo.gross_margin).toBeNull();
      expect(n(queijo.cost_coverage)).toBe(0);
    });
  });

  it('categorias agregam a mesma fórmula; "mercearia " e "Mercearia" são a mesma categoria', async () => {
    await asUser(users.ownerA, async (s) => {
      await seed(s);
      const rows = await s.query<Record<string, unknown>>(`select * from public.analytics_categories($1, '2026-01-01', '2026-01-31')`, [orgs.a]);
      expect(rows.map((r) => r.category_name).sort()).toEqual(['Frios', 'Mercearia']);
      const mercearia = rows.find((r) => r.category_name === 'Mercearia')!;
      // café 76 + azeite 120 · lucro 30 + 30
      expect([n(mercearia.net_revenue), n(mercearia.gross_profit), n(mercearia.products)]).toEqual([196, 60, 2]);
      expect(n(mercearia.gross_margin)).toBeCloseTo(60 / 196, 10);

      const suppliers = await s.query<Record<string, unknown>>(`select * from public.analytics_suppliers($1, '2026-01-01', '2026-01-31')`, [orgs.a]);
      expect(Object.fromEntries(suppliers.map((r) => [r.supplier_name ?? '(sem)', n(r.net_revenue)]))).toEqual({
        'Torrefação Sul': 76,
        'Olivas BR': 120,
        '(sem)': 45,
      });
    });
  });
});

describe('estoque', () => {
  it('posição, capital, cobertura, giro e classificação seguem as fórmulas documentadas', async () => {
    await asUser(users.ownerA, async (s) => {
      await seed(s);
      const rows = await s.query<Record<string, unknown>>(`select * from public.inventory_position($1, '2026-01-31')`, [orgs.a]);
      const bySku = Object.fromEntries(rows.map((r) => [r.sku as string, r]));

      // histórico de vendas desde 05/01: janela de 27 dias
      const cafe = bySku['CAF-01']!;
      expect(cafe).toMatchObject({ window_days: 27, cost_source: 'catalog', lead_time_days: 5, days_since_last_sale: 21 });
      expect(n(cafe.units_window)).toBe(4);
      expect(n(cafe.stock_value)).toBe(100);
      // 10 ÷ (4 ÷ 27) = 67,5 dias → giro médio (≤ 90)
      expect(n(cafe.coverage_days)).toBeCloseTo(67.5, 8);
      expect(n(cafe.annual_turnover)).toBeCloseTo(365 / 67.5, 8);
      expect(cafe.stock_status).toBe('medium-turnover');

      expect(bySku['AZE-01']!.stock_status).toBe('rupture');
      // 4 ÷ (1 ÷ 27) = 108 dias → giro baixo; custo da própria posição
      expect(n(bySku['QUE-01']!.coverage_days)).toBeCloseTo(108, 8);
      expect(bySku['QUE-01']).toMatchObject({ stock_status: 'low-turnover', cost_source: 'file' });
      // nunca vendida, mas só 27 dias de histórico (< 60): não dá para chamar de parada
      expect(bySku['VEL-01']!.stock_status).toBe('insufficient-data');

      const [summary] = await s.query<Record<string, unknown>>(`select * from public.inventory_summary($1, '2026-01-31')`, [orgs.a]);
      // 100 + 0 + 100 + 200
      expect(n(summary!.stock_value)).toBe(400);
      // CMV da janela 136, anualizado sobre 27 dias, dividido pelo capital
      expect(n(summary!.annual_turnover)).toBeCloseTo((136 * 365) / 27 / 400, 8);
      expect(summary).toMatchObject({ products: '4', sold_without_position: '0' });
    });
  });

  it('os parâmetros da organização mudam a classificação (item parado, risco de ruptura)', async () => {
    await asUser(users.ownerA, async (s) => {
      await seed(s);
      await runImport(s, {
        organizationId: orgs.a,
        dataset: 'sales',
        rows: numbered([{ sold_at: '2026-01-25', order_id: 'P9', sku: 'QUE-01', quantity: 26, unit_price: 50, discount: 0, unit_cost: 20 }]),
        policy: 'skip',
        contentSeed: 'queijo',
      });
      await s.query(`select public.save_analysis_settings($1, '{"stalled_days": 14, "default_lead_time_days": 7}')`, [orgs.a]);
      const rows = await s.query<{ sku: string; stock_status: string; coverage_days: string }>(
        `select sku, stock_status, coverage_days from public.inventory_position($1, '2026-01-31')`,
        [orgs.a],
      );
      const status = Object.fromEntries(rows.map((r) => [r.sku, r.stock_status]));
      // 27 unidades em 27 dias: 1/dia; 4 em estoque = 4 dias < 7 de reposição
      expect(status['QUE-01']).toBe('rupture-risk');
      expect(status['VEL-01']).toBe('stalled');
    });
  });

  it('uma posição mais nova da mesma data prevalece e, desfeita, devolve a anterior', async () => {
    await asUser(users.ownerA, async (s) => {
      await seed(s);
      const replacement = await runImport(s, {
        organizationId: orgs.a,
        dataset: 'inventory',
        rows: numbered([{ sku: 'CAF-01', snapshot_date: '2026-01-31', quantity: 7 }]),
        policy: 'replace',
        contentSeed: 'recontagem',
      });
      expect(replacement.summary).toMatchObject({ existingPositions: 1 });
      const onHand = async () =>
        n((await s.query<{ on_hand: string }>(`select on_hand from public.inventory_position($1, '2026-01-31') where sku = 'CAF-01'`, [orgs.a]))[0]!.on_hand);
      expect(await onHand()).toBe(7);
      await s.query('select public.revert_import($1)', [replacement.importId]);
      expect(await onHand()).toBe(10);
    });
  });
});

describe('isolamento das métricas', () => {
  it('quem não é membro recebe zeros e listas vazias, mesmo passando o id da organização', async () => {
    await asUser(users.ownerA, async (s) => {
      await seed(s);
      await s.become(users.ownerB);
      const [summary] = await s.query<Record<string, unknown>>(`select * from public.analytics_summary($1, '2026-01-01', '2026-01-31')`, [orgs.a]);
      expect(n(summary!.net_revenue)).toBe(0);
      expect(await s.query(`select * from public.analytics_products($1, '2026-01-01', '2026-01-31')`, [orgs.a])).toEqual([]);
      expect(await s.query(`select * from public.inventory_position($1, '2026-01-31')`, [orgs.a])).toEqual([]);
    });
  });
});
