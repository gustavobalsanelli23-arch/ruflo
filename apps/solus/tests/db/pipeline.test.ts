import pg from 'pg';
import { afterAll, describe, expect, inject, it } from 'vitest';
import { toCoverage, toPosition, toProduct, toTotals } from '@/lib/analytics/mappers';
import { applyMapping, describeMapping, mappingProblems, suggestMapping } from '@/lib/ingest/mapping';
import { detectDateOrder, detectDecimalStyle } from '@/lib/ingest/normalize';
import { buildTable, readCsv } from '@/lib/ingest/read';
import type { Dataset, ReadOptions } from '@/lib/ingest/types';
import { validateRows } from '@/lib/ingest/validate';
import { runEngine } from '@/lib/intelligence/engine';
import { buildEngineInput, toSyncPayload, type MetricsReader } from '@/lib/intelligence/input';
import { ENGINE_VERSION } from '@/lib/intelligence/scoring';
import { addDays } from '@/lib/period';
import { commitAll, createAndUpload, stageAll } from './support/imports';
import { asUser, closePool, type Session } from './support/session';

/**
 * From the file to the Opportunity Center, with the application's own code
 * at every step: CSV bytes → reading, mapping, normalization and validation
 * (src/lib/ingest) → staging and commit RPCs → SQL metric layer → mappers →
 * engine input (src/lib/intelligence/input) → rules → sync_opportunities.
 */

const { users, orgs } = inject('world');
afterAll(closePool);

// Datas como texto (AAAA-MM-DD), como chegam pelo PostgREST.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

const TODAY = '2026-03-10';
const latin1 = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0));
const utf8 = (text: string) => new TextEncoder().encode(text);
const br = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const PRODUCTS_CSV = [
  'SKU;Produto;Categoria;Fornecedor;Custo;Preço',
  'OK-1;Café Torrado 500g;Mercearia;Torrefação Sul;10,00;20,00',
  'NEG-1;Azeite Extra Virgem;Mercearia;Olivas BR;12,00;9,90',
  'LOW-1;Açúcar Cristal 5kg;Mercearia;Usina Doce;9,00;10,00',
  'DROP-1;Queijo Minas;Frios;Laticínios Serra;9,00;15,00',
  'PAR-1;Panela Inox;Utilidades;Casa & Cia;30,00;59,90',
].join('\r\n');

function salesCsv() {
  const lines = ['Data;Pedido;Código;Descrição;Qtde;Preço Unitário;Custo Unitário'];
  let day = '2025-11-01';
  let index = 0;
  while (day <= '2026-02-28') {
    const recent = day >= '2026-01-30';
    lines.push(`${dmy(day)};P${index}-1;OK-1;Café Torrado 500g;2;${br(20)};${br(10)}`);
    if (index % 3 === 0) lines.push(`${dmy(day)};P${index}-2;NEG-1;Azeite;10;${br(9.9)};${br(12)}`);
    if (index % 2 === 0) lines.push(`${dmy(day)};P${index}-3;LOW-1;Açúcar;6;${br(10)};${br(9)}`);
    lines.push(`${dmy(day)};P${index}-4;DROP-1;Queijo Minas;${recent ? 1 : 5};${br(15)};${br(9)}`);
    day = addDays(day, 1);
    index++;
  }
  return lines.join('\n');
}

const INVENTORY_CSV = ['Código;Saldo;Custo Médio', 'OK-1;2;10,00', 'PAR-1;50;30,00', 'NEG-1;10;', 'LOW-1;30;', 'DROP-1;40;9,00'].join('\n');

async function importFile(s: Session, dataset: Dataset, bytes: Uint8Array, policy: string, snapshotDate: string | null = null) {
  const csv = readCsv(bytes);
  if (!csv.ok) throw new Error(csv.message);
  const table = buildTable(csv.rows);
  if (!table.ok) throw new Error(table.message);
  const { mapping } = suggestMapping(table.headers, dataset);
  const mapped = applyMapping(table, mapping);
  const values = (field: string) => mapped.map((row) => row.values[field] ?? null);
  const numeric = ['quantity', 'unit_price', 'unit_cost', 'cost', 'price'].flatMap(values);
  const options: ReadOptions = { decimal: detectDecimalStyle(numeric), dateOrder: detectDateOrder(values('sold_at')), snapshotDate };
  expect(mappingProblems(mapping, dataset, options, table.headers)).toEqual([]);

  const { staged, issues } = validateRows(dataset, mapped, { options, today: TODAY });
  const created = await createAndUpload(s, { organizationId: orgs.a, dataset, rows: staged, contentSeed: dataset });
  const { batches, summary } = await stageAll(s, created.importId, staged, issues, 1000);
  const result = await commitAll(s, created.importId, policy, batches);
  return { mapping: describeMapping(mapping, table.headers), encoding: csv.encoding, issues, summary, result };
}

function sqlReader(s: Session): MetricsReader {
  const org = orgs.a;
  return {
    coverage: async () => toCoverage((await s.query('select * from public.analytics_coverage($1)', [org]))[0] as never),
    parameters: async () => {
      const [row] = await s.query<Record<string, string | number>>('select * from public.analysis_parameters($1)', [org]);
      return {
        minMargin: Number(row!.min_margin),
        maxDiscountRate: Number(row!.max_discount_rate),
        stalledDays: Number(row!.stalled_days),
        velocityWindowDays: Number(row!.velocity_window_days),
        defaultLeadTimeDays: Number(row!.default_lead_time_days),
        highTurnoverDays: Number(row!.high_turnover_days),
        lowTurnoverDays: Number(row!.low_turnover_days),
        excessCoverageDays: Number(row!.excess_coverage_days),
        targetCoverageDays: Number(row!.target_coverage_days),
        dropThreshold: Number(row!.drop_threshold),
      };
    },
    totals: async (window) => toTotals((await s.query('select * from public.analytics_summary($1, $2, $3)', [org, window.start, window.end]))[0] as never),
    products: async (window) =>
      (await s.query('select * from public.analytics_products($1, $2, $3) order by product_id', [org, window.start, window.end])).map((row) => toProduct(row as never)),
    inventory: async (asOf) =>
      (await s.query('select * from public.inventory_position($1, $2)', [org, asOf])).map(
        (row) => toPosition(row as never),
      ),
    inventoryTotals: async (asOf) => {
      const [row] = await s.query<{ stock_value: string; sold_without_position: string }>('select * from public.inventory_summary($1, $2)', [org, asOf]);
      return { stockValue: Number(row!.stock_value), soldWithoutPosition: Number(row!.sold_without_position) };
    },
  };
}

describe('do arquivo à Central de Oportunidades', () => {
  it('importa cadastro (Windows-1252), vendas e estoque, calcula, detecta e grava sem duplicar', async () => {
    await asUser(
      users.analystA,
      async (s) => {
        const products = await importFile(s, 'products', latin1(PRODUCTS_CSV), 'update');
        expect(products.encoding).toBe('windows-1252');
        expect(products.mapping).toEqual({ sku: 'SKU', name: 'Produto', category: 'Categoria', supplier: 'Fornecedor', cost: 'Custo', price: 'Preço' });
        expect(products.issues.map((issue) => issue.code)).toEqual(['price_below_cost']);
        expect(products.result).toMatchObject({ final_status: 'completed', inserted_rows: 5 });

        const sales = await importFile(s, 'sales', utf8(salesCsv()), 'skip');
        expect(sales.issues).toEqual([]);
        expect(sales.summary).toMatchObject({ periodStart: '2025-11-01', periodEnd: '2026-02-28', newSkus: 0 });
        expect(sales.result.final_status).toBe('completed');

        const stock = await importFile(s, 'inventory', utf8(INVENTORY_CSV), 'skip', '2026-02-28');
        expect(stock.result).toMatchObject({ final_status: 'completed', inserted_rows: 5 });

        const reader = sqlReader(s);
        const coverage = await reader.coverage();
        expect(coverage).toMatchObject({ firstSale: '2025-11-01', lastSale: '2026-02-28', lastSnapshot: '2026-02-28' });

        const input = await buildEngineInput(reader);
        expect(input.window).toEqual({ start: '2025-12-01', end: '2026-02-28', days: 90 });
        expect(input.comparison?.current).toEqual({ start: '2026-01-30', end: '2026-02-28', days: 30 });

        const result = runEngine(input);
        const keys = result.opportunities.map((o) => o.dedupeKey.replace(/:[0-9a-f-]{36}$/, ''));
        const bySku = new Map(result.opportunities.map((o) => [`${o.type}:${o.entityLabel.match(/\(([^)]+)\)$/)?.[1]}`, o]));
        expect(keys.length).toBe(new Set(result.opportunities.map((o) => o.dedupeKey)).size);
        for (const expected of ['negative_margin:NEG-1', 'low_margin:LOW-1', 'rupture_risk:OK-1', 'stalled_stock:PAR-1', 'performance_drop:DROP-1']) {
          expect(bySku.has(expected), expected).toBe(true);
        }
        // fatos conferidos à mão: azeite vende 10 por 9,90 e custa 12 → prejuízo de 21 por venda
        const negative = bySku.get('negative_margin:NEG-1')!;
        expect(negative.facts.find((f) => f.label === 'Margem bruta')!.value).toBeCloseTo((99 - 120) / 99, 10);
        expect(bySku.get('stalled_stock:PAR-1')!).toMatchObject({ impactKind: 'capital', impactValue: 1500 });
        // café: 2 por dia, estoque 2 → cobertura de 1 dia contra 7 de reposição; lucro de 10 por unidade
        expect(bySku.get('rupture_risk:OK-1')!).toMatchObject({ impactKind: 'one_off_profit', impactValue: 120 });

        await s.become('service_role');
        const sync = `select * from public.sync_opportunities($1, $2, 'import', null, $3, $4, $5, $6, $7)`;
        const params = [orgs.a, users.analystA, ENGINE_VERSION, input.window!.start, input.window!.end, JSON.stringify(result.limitations), JSON.stringify(result.opportunities.map(toSyncPayload))];
        const [first] = await s.query<{ created: number; detected: number }>(sync, params);
        expect(first).toMatchObject({ created: result.opportunities.length, detected: result.opportunities.length });
        const [second] = await s.query<{ created: number; updated: number }>(sync, params);
        expect(second).toMatchObject({ created: 0, updated: result.opportunities.length });

        await s.become(users.viewerA);
        const stored = await s.query<{ n: number }>('select count(*)::int as n from public.opportunities where organization_id = $1', [orgs.a]);
        expect(stored).toEqual([{ n: result.opportunities.length }]);
      },
    );
  }, 60_000);
});
